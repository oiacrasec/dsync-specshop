import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { problemMessage } from '@/app/core/utils/api-problem';
import { AvailableOrganization } from '@/app/types/context';
import { UiButton } from '@/app/shared/ui/button/button';

function searchText(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR')
        .trim();
}

@Component({
    selector: 'ui-organization-picker',
    standalone: true,
    imports: [InputTextModule, UiButton],
    templateUrl: './organization-picker.html',
    styleUrl: './organization-picker.scss'
})
export class UiOrganizationPicker implements OnInit {
    private readonly contexts = inject(UserContextService);
    private readonly session = inject(AuthSessionService);
    private readonly router = inject(Router);
    private readonly messages = inject(MessageService);
    private readonly destroyRef = inject(DestroyRef);

    readonly switching = input(false);
    readonly returnUrl = input<string | null>(null);
    readonly cancelled = output<void>();
    readonly organizations = signal<AvailableOrganization[]>([]);
    readonly loading = signal(false);
    readonly leaving = signal(false);
    readonly entering = signal(false);
    readonly errorMessage = signal('');
    readonly query = signal('');
    readonly selectedId = signal('');
    readonly activeId = computed(() => this.contexts.getActiveContext()?.organization_public_id);
    readonly selected = computed(() => this.organizations().find((item) => item.public_id === this.selectedId()));
    readonly showSearch = computed(() => this.organizations().length > 7);
    private readonly searchable = computed(() => this.organizations().map((organization) => ({ organization, name: searchText(organization.name) })));
    readonly filtered = computed(() => {
        const query = searchText(this.query());

        return this.searchable()
            .filter((item) => item.name.includes(query))
            .map((item) => item.organization);
    });

    ngOnInit() {
        this.loadOrganizations();
    }

    loadOrganizations() {
        if (this.loading() || this.leaving() || this.entering()) {
            return;
        }

        this.loading.set(true);
        this.errorMessage.set('');
        const revision = this.session.getRevision();

        this.contexts
            .loadAvailableContexts()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false))
            )
            .subscribe({
                next: (organizations) => {
                    if (revision !== this.session.getRevision()) {
                        return;
                    }

                    this.organizations.set(organizations);
                    this.contexts.syncActiveContextLabelsFromAvailableContexts(organizations);
                    this.selectedId.set(this.activeId() ?? '');

                    if (!this.switching() && organizations.length === 1 && organizations[0].public_id !== this.activeId()) {
                        this.selectedId.set(organizations[0].public_id);
                        this.enter(organizations[0]);
                    }
                },
                error: (error) => {
                    if (revision === this.session.getRevision()) {
                        this.errorMessage.set(problemMessage(error, 'Não foi possível carregar as organizações.'));
                    }
                }
            });
    }

    search(value: string) {
        this.query.set(value);
    }

    confirm() {
        if (this.loading() || this.leaving() || this.entering()) {
            return;
        }

        const organization = this.selected();

        if (!organization) {
            this.errorMessage.set('Selecione uma organização disponível.');

            return;
        }

        if (this.switching() && organization.public_id === this.activeId()) {
            this.cancelled.emit();

            return;
        }

        this.enter(organization);
    }

    private enter(organization: AvailableOrganization) {
        try {
            this.contexts.setActiveContext({ organization_public_id: organization.public_id, organization_name: organization.name });
            this.entering.set(true);
            this.contexts.openContext(this.returnUrl());
        } catch {
            this.entering.set(false);
            this.errorMessage.set('Não foi possível abrir a organização neste navegador. Tente novamente.');
        }
    }

    logout() {
        if (this.leaving() || this.entering()) {
            return;
        }

        this.leaving.set(true);
        this.session
            .logout()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.leaving.set(false))
            )
            .subscribe({
                next: () => void this.router.navigateByUrl('/landing/login'),
                error: () => {
                    this.messages.add({ severity: 'warn', summary: 'Sessão encerrada neste navegador', detail: 'Não foi possível confirmar a revogação no servidor.' });
                    void this.router.navigateByUrl('/landing/login');
                }
            });
    }
}
