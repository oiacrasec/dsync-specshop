import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';

import { AuthService } from '@/app/core/services/auth.service';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiInputPassword } from '@/app/shared/ui/input-password/input-password';

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

            <form [formGroup]="form" class="grid grid-cols-1 gap-5">
                <div class="flex flex-col gap-2">
                    <ui-input-password inputId="current_password" formControlName="current_password" label="Senha temporaria" [feedback]="false" errorMessage="Informe a senha temporaria." />
                </div>

                <div class="flex flex-col gap-2">
                    <ui-input-password inputId="new_password" formControlName="new_password" label="Nova senha" errorMessage="Informe uma nova senha valida." />
                </div>

                <div class="flex flex-col gap-2">
                    <ui-input-password inputId="new_password_confirm" formControlName="new_password_confirm" label="Confirmar nova senha" [feedback]="false" errorMessage="Confirme a nova senha." />
                </div>
            </form>

            <div class="flex items-center justify-end gap-3">
                <ui-button label="Sair" severity="secondary" text (onClick)="logout()"></ui-button>
                <ui-button label="Alterar senha" icon="pi pi-check" [loading]="saving" (onClick)="submit()"></ui-button>
            </div>
        </section>
    `
})
export class PrimeiroAcessoTrocarSenhaPage {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private authSessionService = inject(AuthSessionService);
    private router = inject(Router);
    private messageService = inject(MessageService);

    saving = false;

    form = this.fb.nonNullable.group({
        current_password: ['', Validators.required],
        new_password: ['', [Validators.required, Validators.minLength(8)]],
        new_password_confirm: ['', [Validators.required, Validators.minLength(8)]]
    });

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos obrigatorios',
                detail: 'Preencha os campos obrigatorios antes de continuar.'
            });
            return;
        }

        this.saving = true;
        this.authService
            .firstAccessChangePassword(this.form.getRawValue())
            .pipe(finalize(() => (this.saving = false)))
            .subscribe({
                next: () => {
                    this.authSessionService.updateUser({ must_change_password: false });
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Senha atualizada',
                        detail: 'Troca de senha concluida com sucesso.'
                    });
                    this.router.navigateByUrl('/contexto/selecao');
                },
                error: (error) => {
                    const detail = error?.error?.detail ?? error?.error?.current_password?.[0] ?? error?.error?.new_password?.[0] ?? error?.error?.new_password_confirm?.[0] ?? 'Nao foi possivel trocar a senha.';
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Falha ao trocar senha',
                        detail: String(detail)
                    });
                }
            });
    }

    logout() {
        this.authSessionService.clearSession();
        this.router.navigateByUrl('/landing/login');
    }
}
