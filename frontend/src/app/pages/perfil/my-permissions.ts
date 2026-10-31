import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TagModule } from 'primeng/tag';
import { finalize, forkJoin } from 'rxjs';

import { PermissionCatalogService } from '@/app/core/services/permission-catalog.service';
import { ProfileService } from '@/app/core/services/profile.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { problemMessage } from '@/app/core/utils/api-problem';
import { UiButton } from '@/app/shared/ui/button/button';
import { PermissionCatalogGroup } from '@/app/types/permission';
import { MyAccess } from '@/app/types/profile';

@Component({
    selector: 'app-my-permissions',
    standalone: true,
    imports: [TagModule, UiButton],
    templateUrl: './my-permissions.html'
})
export class MyPermissions implements OnInit {
    private readonly api = inject(ProfileService);
    private readonly catalog = inject(PermissionCatalogService);
    private readonly contexts = inject(UserContextService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly access = signal<MyAccess | null>(null);
    private readonly groups = signal<PermissionCatalogGroup[]>([]);

    readonly loading = signal(false);
    readonly error = signal('');
    readonly currentOrganization = computed(() => this.contexts.getActiveContext()?.organization_public_id);
    readonly contractAdmin = computed(() => this.access()?.organizations.some((organization) => organization.all_permissions) ?? false);
    readonly organizations = computed(() => {
        const current = this.currentOrganization();

        return [...(this.access()?.organizations ?? [])]
            .sort((left, right) => Number(right.public_id === current) - Number(left.public_id === current))
            .map((organization) => {
                const codes = new Set(organization.permissions);
                const groups = organization.all_permissions
                    ? []
                    : this.groups()
                          .map((group) => ({ ...group, permissions: group.permissions.filter((permission) => codes.has(permission.code)) }))
                          .filter((group) => group.permissions.length > 0);

                return { ...organization, groups };
            });
    });

    ngOnInit() {
        this.load();
    }

    load() {
        if (this.loading()) {
            return;
        }

        this.loading.set(true);
        this.error.set('');
        forkJoin({ access: this.api.access(), catalog: this.catalog.load() })
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false))
            )
            .subscribe({
                next: ({ access, catalog }) => {
                    this.groups.set(catalog);
                    this.access.set(access);
                },
                error: (error: unknown) => this.error.set(problemMessage(error, 'Não foi possível carregar suas permissões.'))
            });
    }
}
