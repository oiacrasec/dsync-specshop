import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { AvailableOrganization } from '@/app/types/context';
import { problemMessage } from '@/app/core/utils/api-problem';
import { UiButton } from '@/app/shared/ui/button/button';

@Component({
    selector: 'app-contexto-selecao',
    standalone: true,
    imports: [ReactiveFormsModule, UiButton],
    template: `
        <section class="card max-w-2xl mx-auto flex flex-col gap-6" [attr.aria-busy]="loading()">
            <div>
                <h1 class="text-2xl font-semibold">Organização de trabalho</h1>
                <p>Selecione a organização para continuar. A escolha será aplicada a todas as abas.</p>
            </div>
            <p role="status" aria-live="polite">{{ loading() ? 'Carregando organizações…' : '' }}</p>
            <p role="alert" class="text-red-500">{{ errorMessage() }}</p>
            @if (!loading() && organizations().length === 0 && !errorMessage()) {
                <p>Nenhuma organização disponível. Entre em contato com o administrador do contrato.</p>
            }
            <form [formGroup]="form" (ngSubmit)="confirm()" class="flex flex-col gap-4">
                <label for="organization">Organização</label>
                <select id="organization" formControlName="organization" class="p-3 border rounded-lg bg-surface-0 dark:bg-surface-900" [attr.aria-invalid]="form.controls.organization.touched && form.controls.organization.invalid">
                    <option value="">Selecione uma organização</option>
                    @for (organization of organizations(); track organization.public_id) {
                        <option [value]="organization.public_id">{{ organization.name }}</option>
                    }
                </select>
                <div class="flex flex-wrap justify-end gap-3">
                    <ui-button label="Sair" severity="secondary" [loading]="leaving()" [disabled]="leaving()" (onClick)="logout()" />
                    @if (errorMessage()) {
                        <ui-button label="Tentar novamente" severity="secondary" [disabled]="loading() || leaving()" (onClick)="loadOrganizations()" />
                    }
                    <ui-button label="Continuar" type="submit" [disabled]="loading() || leaving() || organizations().length === 0" />
                </div>
            </form>
        </section>
    `
})
export class ContextoSelecaoPage implements OnInit {
    private contexts = inject(UserContextService);
    private session = inject(AuthSessionService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messages = inject(MessageService);
    organizations = signal<AvailableOrganization[]>([]);
    loading = signal(false);
    errorMessage = signal('');
    leaving = signal(false);
    form = inject(FormBuilder).nonNullable.group({ organization: ['', Validators.required] });

    ngOnInit() {
        this.loadOrganizations();
    }

    loadOrganizations() {
        if (this.loading()) {
            return;
        }

        this.loading.set(true);
        this.errorMessage.set('');
        const revision = this.session.getRevision();

        this.contexts
            .loadAvailableContexts()
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (organizations) => {
                    if (revision !== this.session.getRevision()) {
                        return;
                    }

                    this.organizations.set(organizations);
                    this.contexts.syncActiveContextLabelsFromAvailableContexts(organizations);
                    this.form.controls.organization.setValue(this.contexts.getActiveContext()?.organization_public_id ?? '');
                },
                error: (error) => this.errorMessage.set(problemMessage(error, 'Não foi possível carregar as organizações.'))
            });
    }

    confirm() {
        if (this.loading() || this.leaving()) {
            return;
        }

        const organization = this.organizations().find((item) => item.public_id === this.form.controls.organization.value);

        if (!organization) {
            this.form.markAllAsTouched();
            this.errorMessage.set('Selecione uma organização disponível.');

            return;
        }

        this.contexts.setActiveContext({ organization_public_id: organization.public_id, organization_name: organization.name });
        // Recria também esta aba: componentes e chamadas anteriores são descartados.
        this.contexts.openContext(this.route.snapshot.queryParamMap.get('returnUrl'));
    }

    logout() {
        if (this.leaving()) {
            return;
        }

        this.leaving.set(true);
        this.session
            .logout()
            .pipe(
                finalize(() => {
                    this.leaving.set(false);
                    void this.router.navigateByUrl('/landing/login');
                })
            )
            .subscribe({
                error: () => this.messages.add({ severity: 'warn', summary: 'Sessão encerrada neste navegador', detail: 'Não foi possível confirmar a revogação no servidor.' })
            });
    }
}
