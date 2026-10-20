import { NgClass } from '@angular/common';
import { Component, computed, effect, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChipModule } from 'primeng/chip';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';

import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { PermissionGrid } from '@/app/shared/ui/permission-grid/permission-grid';
import { PermissionCatalogGroup, PermissionScope } from '@/app/types/permission';
import { AccessGrant, AccessProfile, UserAccess, UserAccessWrite } from '@/app/types/usuario';

export const ALL_ORGANIZATIONS = 'contract';

interface InheritedGrant {
    grant: AccessGrant;
    label: string;
    excluded: boolean;
    essential: boolean;
}

// Aba Permissões do usuário (8.3): "Todas as organizações" edita o escopo CONTRACT; cada organização
// edita o próprio escopo e mostra as concessões herdadas do contrato, com a exceção por organização.
// O perfil essencial (administrador do contrato) só vale em "Todas" e não admite exceção (decisão 63).
@Component({
    selector: 'app-user-access',
    standalone: true,
    imports: [NgClass, FormsModule, ChipModule, MessageModule, SelectModule, UiButton, UiCheckbox, PermissionGrid],
    templateUrl: './permissoes.html'
})
export class UserAccessEditor {
    readonly access = input.required<UserAccess>();
    readonly catalog = input<PermissionCatalogGroup[]>([]);
    readonly disabled = input(false);

    readonly allOrganizations = ALL_ORGANIZATIONS;
    readonly grants = signal<AccessGrant[]>([]);
    readonly target = signal<string>(ALL_ORGANIZATIONS);
    readonly dirty = signal(false);
    selectedProfile: string | null = null;

    readonly organizations = computed(() => this.access().organizations.filter((organization) => organization.is_active));
    readonly profiles = computed(() => new Map(this.access().profiles.map((profile) => [profile.public_id, profile])));
    readonly targetName = computed(() => {
        const target = this.target();

        return target === ALL_ORGANIZATIONS ? 'Todas as organizações' : (this.organizations().find((organization) => organization.public_id === target)?.name ?? '');
    });
    readonly scope = computed<PermissionScope>(() => (this.target() === ALL_ORGANIZATIONS ? 'CONTRACT' : 'ORGANIZATION'));
    readonly targetGrants = computed(() => this.grants().filter((grant) => this.isAtTarget(grant)));
    readonly appliedProfiles = computed(() =>
        this.targetGrants()
            .filter((grant) => grant.profile !== null)
            .map((grant) => this.profiles().get(grant.profile!) ?? { public_id: grant.profile!, name: 'Perfil indisponível', is_active: false, is_system: false, is_essential: false, permissions: [] })
    );
    readonly directCodes = computed(() => this.targetGrants().flatMap((grant) => (grant.permission ? [grant.permission] : [])));
    readonly inherited = computed<InheritedGrant[]>(() => {
        const target = this.target();

        if (target === ALL_ORGANIZATIONS) {
            return [];
        }

        return this.grants()
            .filter((grant) => grant.scope === 'CONTRACT')
            .map((grant) => ({ grant, label: this.grantLabel(grant), excluded: grant.excluded_organizations.includes(target), essential: this.isEssential(grant) }));
    });
    readonly lockedCodes = computed(() => {
        const codes = new Set(this.appliedProfiles().flatMap((profile) => profile.permissions));

        for (const item of this.inherited()) {
            if (!item.excluded) {
                this.grantCodes(item.grant).forEach((code) => codes.add(code));
            }
        }

        return [...codes];
    });
    readonly contractAdmin = computed(() => this.grants().some((grant) => grant.scope === 'CONTRACT' && this.isEssential(grant)));
    readonly profileOptions = computed(() => {
        const applied = new Set(this.appliedProfiles().map((profile) => profile.public_id));
        const allowed = this.allowedCodes();

        return this.access()
            .profiles.filter((profile) => profile.is_active && !applied.has(profile.public_id) && (profile.is_essential ? this.scope() === 'CONTRACT' : profile.permissions.every((code) => allowed.has(code))))
            .map((profile) => ({ label: profile.name, value: profile.public_id }));
    });
    readonly profileEmptyMessage = computed(() => (this.access().profiles.some((profile) => profile.is_active) ? 'Nenhum outro perfil compatível com este escopo.' : 'Nenhum perfil cadastrado. Crie perfis no menu Perfis.'));
    private readonly labels = computed(() => new Map(this.catalog().flatMap((group) => group.permissions.map((item) => [item.code, `${group.label}: ${item.label}`] as const))));

    constructor() {
        effect(() => {
            const access = this.access();

            this.grants.set(access.grants.map((grant) => ({ ...grant, excluded_organizations: [...grant.excluded_organizations] })));
            this.dirty.set(false);
        });
    }

    value(): UserAccessWrite {
        return { grants: this.grants().map(({ scope, organization, profile, permission, excluded_organizations }) => ({ scope, organization, profile, permission, excluded_organizations })) };
    }

    select(target: string) {
        this.target.set(target);
        this.selectedProfile = null;
    }

    setDirectCodes(codes: string[]) {
        const keep = this.grants().filter((grant) => !(this.isAtTarget(grant) && grant.permission));

        this.update([...keep, ...codes.map((code) => this.newGrant({ permission: code }))]);
    }

    applyProfile() {
        if (!this.selectedProfile) {
            return;
        }

        this.update([...this.grants(), this.newGrant({ profile: this.selectedProfile })]);
        this.selectedProfile = null;
    }

    removeProfile(profile: AccessProfile) {
        this.update(this.grants().filter((grant) => !(this.isAtTarget(grant) && grant.profile === profile.public_id)));
    }

    setExcluded(item: InheritedGrant, excluded: boolean) {
        const target = this.target();

        this.update(this.grants().map((grant) => (grant === item.grant ? { ...grant, excluded_organizations: excluded ? [...grant.excluded_organizations, target] : grant.excluded_organizations.filter((id) => id !== target) } : grant)));
    }

    buttonClass(target: string) {
        return this.target() === target
            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-200'
            : 'border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-100 hover:bg-surface-50 dark:hover:bg-surface-800/60';
    }

    private update(grants: AccessGrant[]) {
        this.grants.set(grants);
        this.dirty.set(true);
    }

    private newGrant(grant: Pick<AccessGrant, 'profile'> | Pick<AccessGrant, 'permission'>): AccessGrant {
        const target = this.target();

        return { scope: this.scope(), organization: target === ALL_ORGANIZATIONS ? null : target, profile: null, permission: '', excluded_organizations: [], ...grant };
    }

    private isAtTarget(grant: AccessGrant) {
        const target = this.target();

        return target === ALL_ORGANIZATIONS ? grant.scope === 'CONTRACT' : grant.scope === 'ORGANIZATION' && grant.organization === target;
    }

    private isEssential(grant: AccessGrant) {
        return grant.profile !== null && (this.profiles().get(grant.profile)?.is_essential ?? false);
    }

    private grantCodes(grant: AccessGrant) {
        return grant.profile ? (this.profiles().get(grant.profile)?.permissions ?? []) : [grant.permission];
    }

    private grantLabel(grant: AccessGrant) {
        return grant.profile ? `Perfil ${this.profiles().get(grant.profile)?.name ?? 'indisponível'}` : (this.labels().get(grant.permission) ?? grant.permission);
    }

    private allowedCodes() {
        const scope = this.scope();

        return new Set(this.catalog().flatMap((group) => group.permissions.filter((item) => !item.reserved && item.scopes.includes(scope)).map((item) => item.code)));
    }
}
