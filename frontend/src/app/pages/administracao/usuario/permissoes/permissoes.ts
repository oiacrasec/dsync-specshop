import { NgClass } from '@angular/common';
import { Component, computed, effect, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChipModule } from 'primeng/chip';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';

import { UiButton } from '@/app/shared/ui/button/button';
import { PermissionGrid } from '@/app/shared/ui/permission-grid/permission-grid';
import { PermissionCatalogGroup, PermissionScope } from '@/app/types/permission';
import { AccessGrant, AccessProfile, UserAccess, UserAccessWrite } from '@/app/types/usuario';

export const ALL_ORGANIZATIONS = 'contract';

// Aba Permissões do usuário (8.3/8.4). "Todas as organizações" edita o escopo CONTRACT; cada
// organização edita o que vale nela. O perfil fica vinculado e as caixas ficam livres: desmarcar
// algo que veio de um perfil grava uma exceção de permissão (ADR 0038), marcar algo novo grava
// uma avulsa. O perfil essencial (administrador do contrato) só vale em "Todas" e não tem exceção.
@Component({
    selector: 'app-user-access',
    standalone: true,
    imports: [NgClass, FormsModule, ChipModule, MessageModule, SelectModule, UiButton, PermissionGrid],
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
    readonly appliedProfiles = computed(() =>
        this.grants()
            .filter((grant) => grant.profile !== null && this.isAtTarget(grant))
            .map((grant) => this.profile(grant.profile!))
    );
    readonly contractAdmin = computed(() => this.grants().some((grant) => grant.scope === 'CONTRACT' && this.isEssential(grant)));
    readonly allCodes = computed(() => this.catalog().flatMap((group) => group.permissions.map((item) => item.code)));
    readonly checkedCodes = computed(() => [...this.effectiveCodes(this.grants(), this.target())]);
    readonly profileOptions = computed(() => {
        const applied = new Set(this.appliedProfiles().map((profile) => profile.public_id));
        const allowed = this.allowedCodes();

        return this.access()
            .profiles.filter((profile) => profile.is_active && !applied.has(profile.public_id) && (profile.is_essential ? this.scope() === 'CONTRACT' : profile.permissions.every((code) => allowed.has(code))))
            .map((profile) => ({ label: profile.name, value: profile.public_id }));
    });
    readonly profileEmptyMessage = computed(() => (this.access().profiles.some((profile) => profile.is_active) ? 'Nenhum outro perfil compatível com este escopo.' : 'Nenhum perfil cadastrado. Crie perfis no menu Perfis.'));

    constructor() {
        effect(() => {
            const access = this.access();

            this.grants.set(access.grants.map((grant) => ({ ...grant, excluded_organizations: [...grant.excluded_organizations], excluded_permissions: grant.excluded_permissions.map((item) => ({ ...item })) })));
            this.dirty.set(false);
        });
    }

    value(): UserAccessWrite {
        return {
            grants: this.grants().map(({ scope, organization, profile, permission, excluded_organizations, excluded_permissions }) => ({ scope, organization, profile, permission, excluded_organizations, excluded_permissions }))
        };
    }

    select(target: string) {
        this.target.set(target);
        this.selectedProfile = null;
    }

    setCodes(codes: string[]) {
        const target = this.target();
        const before = this.effectiveCodes(this.grants(), target);
        const after = new Set(codes);
        let grants = this.grants();

        for (const code of before) {
            if (!after.has(code)) {
                grants = this.uncheck(grants, target, code);
            }
        }

        for (const code of after) {
            if (!before.has(code)) {
                grants = this.check(grants, target, code);
            }
        }

        this.update(grants);
    }

    applyProfile() {
        if (!this.selectedProfile) {
            return;
        }

        this.update([...this.grants(), this.newGrant(this.target(), { profile: this.selectedProfile })]);
        this.selectedProfile = null;
    }

    removeProfile(profile: AccessProfile) {
        this.update(this.grants().filter((grant) => !(this.isAtTarget(grant) && grant.profile === profile.public_id)));
    }

    buttonClass(target: string) {
        return this.target() === target
            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-200'
            : 'border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-100 hover:bg-surface-50 dark:hover:bg-surface-800/60';
    }

    private effectiveCodes(grants: AccessGrant[], target: string) {
        const codes = new Set<string>();
        const organization = target === ALL_ORGANIZATIONS ? null : target;

        for (const grant of grants) {
            const reaches = grant.scope === 'CONTRACT' ? organization === null || !grant.excluded_organizations.includes(organization) : grant.organization === organization && organization !== null;

            if (reaches) {
                this.grantCodes(grant)
                    .filter((code) => !this.isExcluded(grant, organization, code))
                    .forEach((code) => codes.add(code));
            }
        }

        return codes;
    }

    private uncheck(grants: AccessGrant[], target: string, code: string) {
        const organization = target === ALL_ORGANIZATIONS ? null : target;

        return grants
            .filter((grant) => !(this.isAt(grant, target) && grant.permission === code))
            .map((grant) => {
                if (grant.profile !== null && !this.isEssential(grant) && this.grantCodes(grant).includes(code) && !this.isExcluded(grant, organization, code)) {
                    const where = grant.scope === 'CONTRACT' ? organization : null;

                    const reaches = grant.scope === 'CONTRACT' ? organization === null || !grant.excluded_organizations.includes(organization) : this.isAt(grant, target);

                    if (reaches) {
                        return { ...grant, excluded_permissions: [...grant.excluded_permissions, { organization: where, permission: code }] };
                    }
                }

                if (organization !== null && grant.scope === 'CONTRACT' && grant.permission === code && !grant.excluded_organizations.includes(organization)) {
                    return { ...grant, excluded_organizations: [...grant.excluded_organizations, organization] };
                }

                return grant;
            });
    }

    private check(grants: AccessGrant[], target: string, code: string) {
        const organization = target === ALL_ORGANIZATIONS ? null : target;
        const restored = grants.map((grant) => {
            if (grant.scope === 'CONTRACT' && grant.permission === code && organization !== null) {
                return { ...grant, excluded_organizations: grant.excluded_organizations.filter((id) => id !== organization) };
            }

            const own = grant.scope === 'CONTRACT' ? organization : null;

            if (grant.profile !== null && (grant.scope === 'CONTRACT' || this.isAt(grant, target))) {
                return { ...grant, excluded_permissions: grant.excluded_permissions.filter((item) => !(item.permission === code && item.organization === own)) };
            }

            return grant;
        });

        return this.effectiveCodes(restored, target).has(code) ? restored : [...restored, this.newGrant(target, { permission: code })];
    }

    private update(grants: AccessGrant[]) {
        this.grants.set(grants);
        this.dirty.set(true);
    }

    private newGrant(target: string, grant: Pick<AccessGrant, 'profile'> | Pick<AccessGrant, 'permission'>): AccessGrant {
        const all = target === ALL_ORGANIZATIONS;

        return { scope: all ? 'CONTRACT' : 'ORGANIZATION', organization: all ? null : target, profile: null, permission: '', excluded_organizations: [], excluded_permissions: [], ...grant };
    }

    private isAtTarget(grant: AccessGrant) {
        return this.isAt(grant, this.target());
    }

    private isAt(grant: AccessGrant, target: string) {
        return target === ALL_ORGANIZATIONS ? grant.scope === 'CONTRACT' : grant.scope === 'ORGANIZATION' && grant.organization === target;
    }

    private isExcluded(grant: AccessGrant, organization: string | null, code: string) {
        return grant.excluded_permissions.some((item) => item.permission === code && (item.organization === null || item.organization === organization));
    }

    private isEssential(grant: AccessGrant) {
        return grant.profile !== null && this.profile(grant.profile).is_essential;
    }

    private profile(publicId: string): AccessProfile {
        return this.profiles().get(publicId) ?? { public_id: publicId, name: 'Perfil indisponível', is_active: false, is_system: false, is_essential: false, permissions: [] };
    }

    private grantCodes(grant: AccessGrant) {
        return grant.profile ? this.profile(grant.profile).permissions : [grant.permission];
    }

    private allowedCodes() {
        const scope = this.scope();

        return new Set(this.catalog().flatMap((group) => group.permissions.filter((item) => !item.reserved && item.scopes.includes(scope)).map((item) => item.code)));
    }
}
