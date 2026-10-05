import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';

import { AuthService } from '@/app/core/services/auth.service';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiInputPassword } from '@/app/shared/ui/input-password/input-password';
import { problemMessage } from '@/app/core/utils/api-problem';

@Component({
    selector: 'app-primeiro-acesso-trocar-senha',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, UiInputPassword, UiButton],
    template: `
        <section class="card max-w-2xl mx-auto flex flex-col gap-6">
            <div class="flex flex-col gap-2">
                <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-0">Primeiro acesso</h1>
                <p class="text-surface-600 dark:text-surface-300">Para continuar, troque a senha temporaria recebida no cadastro.</p>
            </div>

            <p role="alert" class="text-red-500">{{ errorMessage() }}</p>
            <form [formGroup]="form" (ngSubmit)="submit()" class="grid grid-cols-1 gap-5">
                <div class="flex flex-col gap-2">
                    <ui-input-password inputId="current_password" name="current_password" autocomplete="current-password" formControlName="current_password" label="Senha temporária" [feedback]="false" errorMessage="Informe a senha temporária." />
                </div>

                <div class="flex flex-col gap-2">
                    <ui-input-password
                        inputId="new_password"
                        name="new_password"
                        autocomplete="new-password"
                        formControlName="new_password"
                        label="Nova senha"
                        helpText="Use ao menos 12 caracteres. Evite senhas comuns e dados pessoais."
                        errorMessage="Informe uma nova senha válida com ao menos 12 caracteres."
                    />
                </div>

                <div class="flex flex-col gap-2">
                    <ui-input-password
                        inputId="new_password_confirm"
                        name="new_password_confirm"
                        autocomplete="new-password"
                        formControlName="new_password_confirm"
                        label="Confirmar nova senha"
                        [feedback]="false"
                        errorMessage="Confirme a nova senha."
                    />
                </div>
                <div class="flex items-center justify-end gap-3">
                    <ui-button label="Sair" severity="secondary" text [disabled]="saving() || leaving()" (onClick)="logout()"></ui-button>
                    <ui-button label="Alterar senha" type="submit" icon="pi pi-check" [loading]="saving()" [disabled]="saving() || leaving()"></ui-button>
                </div>
            </form>
        </section>
    `
})
export class PrimeiroAcessoTrocarSenhaPage {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private authSessionService = inject(AuthSessionService);
    private router = inject(Router);
    private messageService = inject(MessageService);

    saving = signal(false);
    leaving = signal(false);
    errorMessage = signal('');

    form = this.fb.nonNullable.group({
        current_password: ['', Validators.required],
        new_password: ['', [Validators.required, Validators.minLength(12)]],
        new_password_confirm: ['', [Validators.required, Validators.minLength(12)]]
    });

    submit() {
        if (this.saving() || this.leaving()) {
            return;
        }

        this.errorMessage.set('');

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos obrigatorios',
                detail: 'Preencha os campos obrigatorios antes de continuar.'
            });

            return;
        }

        if (this.form.controls.new_password.value !== this.form.controls.new_password_confirm.value) {
            this.errorMessage.set('A confirmação deve ser igual à nova senha.');

            return;
        }

        this.saving.set(true);
        const revision = this.authSessionService.getRevision();

        this.authService
            .firstAccessChangePassword(this.form.getRawValue())
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
                next: (response) => {
                    if (revision !== this.authSessionService.getRevision()) {
                        return;
                    }

                    this.authSessionService.updateUser(response.user);
                    this.form.reset();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Senha atualizada',
                        detail: 'Troca de senha concluida com sucesso.'
                    });
                    this.router.navigateByUrl('/contexto/selecao');
                },
                error: (error) => {
                    this.errorMessage.set(problemMessage(error, 'Não foi possível trocar a senha.'));

                    this.messageService.add({
                        severity: 'error',
                        summary: 'Falha ao trocar senha',
                        detail: this.errorMessage()
                    });
                }
            });
    }

    logout() {
        if (this.leaving() || this.saving()) {
            return;
        }

        this.leaving.set(true);
        this.authSessionService
            .logout()
            .pipe(
                finalize(() => {
                    this.leaving.set(false);
                    void this.router.navigateByUrl('/landing/login');
                })
            )
            .subscribe({
                error: () => this.messageService.add({ severity: 'warn', summary: 'Sessão encerrada neste navegador', detail: 'Não foi possível confirmar a revogação no servidor.' })
            });
    }
}
