import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { UserContextsResponse } from '@/app/types/context';

@Component({
    selector: 'app-contexto-selecao',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule],
    template: `
        <section class="card max-w-3xl mx-auto">
            <div class="flex flex-col gap-2">
                <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-0">Selecionar organização</h1>
                <p class="text-surface-600 dark:text-surface-300">
                    Escolha a organização para definir o contexto de trabalho desta sessão.
                </p>
            </div>

            @if (loading()) {
                <div class="mt-8 flex flex-col gap-4">
                    <div class="text-surface-600 dark:text-surface-300">Carregando contextos disponíveis...</div>
                    <div class="flex items-center justify-start w-full gap-3">
                        <button pButton type="button" label="Sair" severity="secondary" class="!w-auto" (click)="logout()"></button>
                    </div>
                </div>
            } @else if (!contexts()) {
                <div class="mt-8 flex flex-col gap-4">
                    <p class="text-surface-600 dark:text-surface-300">Não foi possível carregar os contextos.</p>
                    <div class="flex items-center justify-between w-full gap-3">
                        <button pButton type="button" label="Sair" severity="secondary" class="!w-auto" (click)="logout()"></button>
                        <button pButton type="button" label="Tentar novamente" class="!w-auto" (click)="loadContexts()"></button>
                    </div>
                </div>
            } @else if (!(contexts()?.organizacoes?.length ?? 0)) {
                <div class="mt-8 flex flex-col gap-4">
                    <p class="text-surface-600 dark:text-surface-300">
                        Seu usuário não possui organizações ativas vinculadas neste contrato.
                    </p>
                    <div class="flex items-center justify-between w-full gap-3">
                        <button pButton type="button" label="Sair" severity="secondary" class="!w-auto" (click)="logout()"></button>
                        <button pButton type="button" label="Tentar novamente" class="!w-auto" (click)="loadContexts()"></button>
                    </div>
                </div>
            } @else {
                <div class="mt-8 flex flex-col gap-5">
                    <div class="flex flex-col gap-2">
                        <label for="organizacao" class="font-medium text-surface-700 dark:text-surface-200">Organização</label>
                        <select
                            id="organizacao"
                            class="w-full p-3 border border-surface-300 dark:border-surface-700 rounded-lg bg-surface-0 dark:bg-surface-900"
                            [ngModel]="selectedOrganizationId()"
                            (ngModelChange)="selectedOrganizationId.set($event)"
                        >
                            <option [ngValue]="null">Selecione uma organização</option>
                            @for (organization of organizations(); track organization.id) {
                                <option [ngValue]="organization.id">{{ organization.nome }}</option>
                            }
                        </select>
                    </div>

                    @if (selectedOrganizationName()) {
                        <div class="p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                            <span class="text-sm text-surface-700 dark:text-surface-200">
                                Contrato: <strong>{{ contexts()?.contrato?.nome }}</strong>
                            </span>
                            <br />
                            <span class="text-sm text-surface-700 dark:text-surface-200">
                                Organização selecionada: <strong>{{ selectedOrganizationName() }}</strong>
                            </span>
                        </div>
                    }

                    <div class="flex items-center justify-between w-full gap-3">
                        <button pButton type="button" label="Sair" severity="secondary" class="!w-auto" [disabled]="saving()" (click)="logout()"></button>
                        <button
                            pButton
                            type="button"
                            label="Confirmar contexto"
                            class="!w-auto"
                            [loading]="saving()"
                            [disabled]="selectedOrganizationId() === null"
                            (click)="confirmContext()"
                        ></button>
                    </div>
                </div>
            }
        </section>
    `
})
export class ContextoSelecaoPage implements OnInit {
    private userContextService = inject(UserContextService);
    private permissionContextService = inject(PermissionContextService);
    private authSessionService = inject(AuthSessionService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    contexts = signal<UserContextsResponse | null>(null);
    selectedOrganizationId = signal<number | null>(null);
    loading = signal(false);
    saving = signal(false);

    private returnUrl = '/kpi';

    ngOnInit() {
        const user = this.authSessionService.getUser();
        if (user?.is_superuser) {
            this.router.navigateByUrl('/');
            return;
        }

        this.returnUrl = this.normalizeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
        this.loadContexts();
    }

    loadContexts() {
        this.loading.set(true);
        this.contexts.set(null);
        this.selectedOrganizationId.set(null);
        this.permissionContextService.clearCache();

        this.userContextService
            .loadAvailableContexts()
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (contexts) => {
                    this.userContextService.syncActiveContextLabelsFromAvailableContexts(contexts);
                    this.contexts.set(contexts);
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Falha ao carregar contextos',
                        detail: 'Não foi possível carregar as organizações disponíveis.'
                    });
                }
            });
    }

    selectedOrganizationName() {
        const contexts = this.contexts();
        const selectedOrganizationId = this.selectedOrganizationId();
        if (!contexts || selectedOrganizationId === null) {
            return null;
        }
        const selected = contexts.organizacoes.find((organization) => organization.id === selectedOrganizationId);
        return selected?.nome ?? null;
    }

    organizations() {
        return this.contexts()?.organizacoes ?? [];
    }

    confirmContext() {
        const contexts = this.contexts();
        const selectedOrganizationId = this.selectedOrganizationId();
        if (!contexts || !contexts.contrato || selectedOrganizationId === null) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Seleção obrigatória',
                detail: 'Selecione uma organização para continuar.'
            });
            return;
        }

        const selected = contexts.organizacoes.find((organization) => organization.id === selectedOrganizationId);
        if (!selected) {
            this.messageService.add({
                severity: 'error',
                summary: 'Organização inválida',
                detail: 'A organização selecionada não está disponível para este usuário.'
            });
            return;
        }

        this.saving.set(true);
        this.userContextService.setActiveContext({
            contrato_id: contexts.contrato.id,
            contrato_nome: contexts.contrato.nome,
            organizacao_id: selected.id,
            organizacao_nome: selected.nome
        });
        this.permissionContextService.refreshForCurrentContext().subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Contexto definido',
                    detail: 'Organização selecionada com sucesso.'
                });
                this.router.navigateByUrl(this.returnUrl).finally(() => {
                    this.saving.set(false);
                });
            },
            error: () => {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Contexto salvo',
                    detail: 'Não foi possível atualizar permissões agora. Tente novamente em instantes.'
                });
                this.router.navigateByUrl(this.returnUrl).finally(() => {
                    this.saving.set(false);
                });
            }
        });
    }

    logout() {
        this.permissionContextService.clearCache();
        this.authSessionService.clearSession();
        this.router.navigateByUrl('/landing/login');
    }

    private normalizeReturnUrl(value: string | null) {
        if (!value || !value.startsWith('/') || value.startsWith('/contexto/selecao')) {
            return '/kpi';
        }
        return value;
    }
}
