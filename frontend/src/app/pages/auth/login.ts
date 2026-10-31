import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, afterRenderEffect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthLogoWidget } from '@/app/pages/auth/components/authlogowidget';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { AuthService } from '@/app/core/services/auth.service';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { apiProblem, problemMessage } from '@/app/core/utils/api-problem';
import { APP_BRAND } from '@/app/core/tokens/app-brand';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiInputPassword } from '@/app/shared/ui/input-password/input-password';
import { LoginResponse } from '@/app/types/auth';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, AuthLogoWidget, InputTextModule, ReactiveFormsModule, UiButton, UiInputPassword],
    templateUrl: './login.html',
    styleUrl: './login.scss'
})
export class Login {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private authSession = inject(AuthSessionService);
    private router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    readonly brand = inject(APP_BRAND);
    private readonly mfaCode = viewChild<ElementRef<HTMLInputElement>>('mfaCode');
    private readonly usernameInput = viewChild<ElementRef<HTMLInputElement>>('usernameInput');

    loading = signal(false);
    errorMessage = signal('');
    readonly mfaToken = signal<string | null>(null);
    readonly recoveryMode = signal(false);
    readonly mfaForm = this.fb.nonNullable.group({ code: ['', Validators.required] });
    form = this.fb.nonNullable.group({
        username: ['', Validators.required],
        password: ['', Validators.required]
    });

    constructor() {
        afterRenderEffect(() => {
            const input = this.mfaCode() ?? this.usernameInput();

            input?.nativeElement.focus();
        });

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
            this.errorMessage.set('Informe usuário e senha para continuar.');

            return;
        }

        this.loading.set(true);
        this.errorMessage.set('');
        const payload = this.form.getRawValue();
        const revision = this.authSession.getRevision();

        this.authService
            .login(payload)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false))
            )
            .subscribe({
                next: (response) => {
                    if (revision !== this.authSession.getRevision()) {
                        return;
                    }

                    this.form.controls.password.reset();

                    if ('mfa_required' in response && response.mfa_required) {
                        this.mfaToken.set(response.mfa_token);
                        this.mfaForm.reset();

                        return;
                    }

                    this.finishLogin(response as LoginResponse);
                },
                error: (error) => this.errorMessage.set(problemMessage(error, 'Não foi possível entrar. Tente novamente.'))
            });
    }

    submitMfa() {
        const token = this.mfaToken();

        if (this.loading() || !token) {
            return;
        }

        if (this.mfaForm.invalid) {
            this.mfaForm.markAllAsTouched();
            this.errorMessage.set('Informe o código para continuar.');

            return;
        }

        this.loading.set(true);
        this.errorMessage.set('');
        const revision = this.authSession.getRevision();

        this.authService
            .loginMfa({ mfa_token: token, code: this.mfaForm.controls.code.value.trim() })
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false))
            )
            .subscribe({
                next: (response) => {
                    if (revision === this.authSession.getRevision()) {
                        this.finishLogin(response);
                    }
                },
                error: (error) => {
                    // Prova expirada ou derrubada após falhas seguidas: o login recomeça pela senha.
                    if (apiProblem(error)?.type === 'urn:datasync:problem:authentication-required') {
                        this.backToPassword();
                        this.errorMessage.set('A verificação foi encerrada. Entre novamente com usuário e senha.');

                        return;
                    }

                    this.errorMessage.set(problemMessage(error, 'Não foi possível verificar. Tente novamente ou volte ao login.'));
                }
            });
    }

    private finishLogin(response: LoginResponse) {
        try {
            this.authSession.setSession(response);
            this.mfaToken.set(null);
            this.mfaForm.reset();
            this.navigateAfterLogin();
        } catch {
            this.authSession.clearSession();
            this.errorMessage.set('Não foi possível guardar a sessão neste navegador.');
        }
    }

    toggleRecovery() {
        this.recoveryMode.update((value) => !value);
        this.mfaForm.reset();
        this.errorMessage.set('');
        this.mfaCode()?.nativeElement.focus();
    }

    backToPassword() {
        this.mfaToken.set(null);
        this.mfaForm.reset();
        this.recoveryMode.set(false);
        this.errorMessage.set('');
    }
    private navigateAfterLogin() {
        const user = this.authSession.getUser();

        if (user?.is_superuser) {
            this.router.navigateByUrl('/dashboards');

            return;
        }

        if (user?.must_change_password) {
            this.router.navigateByUrl('/primeiro-acesso/trocar-senha');

            return;
        }

        this.router.navigateByUrl('/contexto/selecao');
    }
}
