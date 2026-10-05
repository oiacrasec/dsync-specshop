import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AuthLogoWidget } from '@/app/pages/auth/components/authlogowidget';
import { Router, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';

import { AuthService } from '@/app/core/services/auth.service';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { problemMessage } from '@/app/core/utils/api-problem';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, AuthLogoWidget, RouterModule, InputTextModule, CheckboxModule, ButtonModule, ReactiveFormsModule],
    template: `
        <section class="animate-fadein animate-duration-300 animate-ease-in relative lg:pb-14 lg:py-52 py-36">
            <div class="landing-container mx-auto relative z-10 px-12">
                <div class="relative mt-28 max-w-184 mx-auto">
                    <div
                        class="w-full h-full inset-0 bg-white/64 dark:bg-surface-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[4deg] lg:rotate-[7deg] backdrop-blur-[90px] rounded-3xl shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)] dark:shadow-sm"
                    ></div>
                    <div
                        class="w-full h-full inset-0 bg-white/64 dark:bg-surface-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[4deg] lg:-rotate-[7deg] backdrop-blur-[90px] rounded-3xl shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)] dark:shadow-sm"
                    ></div>
                    <form
                        [formGroup]="form"
                        (ngSubmit)="submit()"
                        class="space-y-8 p-8 relative z-10 bg-white/64 dark:bg-surface-800 backdrop-blur-[90px] rounded-3xl shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)]"
                    >
                        <div class="pt-8 pb-8">
                            <div class="flex items-center justify-center">
                                <app-auth-logo-widget />
                            </div>
                            <h1 class="text-4xl lg:text-6xl font-semibold text-surface-950 dark:text-surface-0 text-center">Datasync</h1>
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="username" class="font-medium text-surface-500 dark:text-white/64">Usuário</label>
                            <input name="username" pInputText id="username" formControlName="username" autocomplete="username" class="w-full" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="password" class="font-medium text-surface-500 dark:text-white/64">Senha</label>
                            <input name="password" pInputText id="password" formControlName="password" type="password" autocomplete="current-password" class="w-full" />
                        </div>
                        <p class="text-red-500" role="alert">{{ errorMessage() }}</p>
                        <p-button class="w-full" rounded type="submit" [loading]="loading()" [disabled]="loading()" label="Entrar"></p-button>
                        <!-- DESABILITADO: recuperação e cadastro público fora do escopo atual. -->
                    </form>
                </div>
            </div>
        </section>
    `
})
export class Login {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private authSession = inject(AuthSessionService);
    private router = inject(Router);
    private messageService = inject(MessageService);

    loading = signal(false);
    errorMessage = signal('');
    form = this.fb.nonNullable.group({
        username: ['', Validators.required],
        password: ['', Validators.required]
    });

    constructor() {
        if (this.authSession.isAuthenticated()) {
            this.navigateAfterLogin();
        }
    }

    submit() {
        if (this.loading()) {
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos obrigatorios',
                detail: 'Informe usuario e senha para continuar.'
            });

            return;
        }

        this.loading.set(true);
        this.errorMessage.set('');
        const payload = this.form.getRawValue();

        this.authService
            .login(payload)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (response) => {
                    try {
                        this.authSession.setSession(response);
                        this.form.controls.password.reset();
                        this.navigateAfterLogin();
                    } catch {
                        this.authSession.clearSession();
                        this.errorMessage.set('Não foi possível guardar a sessão neste navegador.');
                    }
                },
                error: (error) => {
                    this.errorMessage.set(problemMessage(error, 'Não foi possível entrar. Tente novamente.'));
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Login invalido',
                        detail: this.errorMessage()
                    });
                }
            });
    }

    private navigateAfterLogin() {
        const user = this.authSession.getUser();

        if (user?.is_superuser) {
            this.router.navigateByUrl('/kpi');

            return;
        }

        if (user?.must_change_password) {
            this.router.navigateByUrl('/primeiro-acesso/trocar-senha');

            return;
        }

        this.router.navigateByUrl('/contexto/selecao');
    }
}
