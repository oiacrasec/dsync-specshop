import { Component, DestroyRef, OnInit, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MfaService, MfaSetup, MfaStatus } from '@/app/core/services/mfa.service';
import { problemMessage } from '@/app/core/utils/api-problem';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiInputPassword } from '@/app/shared/ui/input-password/input-password';
import { InputTextModule } from 'primeng/inputtext';

@Component({
    selector: 'app-mfa-settings',
    standalone: true,
    imports: [ReactiveFormsModule, UiButton, UiInputPassword, InputTextModule],
    templateUrl: './mfa-settings.html'
})
export class MfaSettings implements OnInit {
    private readonly api = inject(MfaService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly fb = inject(FormBuilder);
    readonly changed = output<void>();
    readonly status = signal<MfaStatus | null>(null);
    readonly setup = signal<MfaSetup | null>(null);
    readonly qr = signal('');
    readonly recoveryCodes = signal<string[]>([]);
    readonly savedCodes = signal(false);
    readonly loading = signal(false);
    readonly error = signal('');
    readonly action = signal<'disable' | 'regenerate' | null>(null);
    readonly codeForm = this.fb.nonNullable.group({ code: ['', Validators.required] });
    readonly disableForm = this.fb.nonNullable.group({ password: ['', Validators.required], code: ['', Validators.required] });

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.setup.set(null);
            this.qr.set('');
            this.recoveryCodes.set([]);
            this.codeForm.reset();
            this.disableForm.reset();
        });
    }

    ngOnInit() {
        this.load();
    }

    load() {
        if (this.loading()) {
            return;
        }

        this.loading.set(true);
        this.error.set('');
        this.api
            .status()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false))
            )
            .subscribe({
                next: (status) => this.status.set(status),
                error: (error) => this.error.set(problemMessage(error, 'Não foi possível carregar a verificação em duas etapas.'))
            });
    }

    start() {
        if (this.loading()) {
            return;
        }

        this.loading.set(true);
        this.error.set('');
        this.api
            .setup()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false))
            )
            .subscribe({
                next: (setup) => {
                    this.setup.set(setup);
                    this.codeForm.reset();
                    void this.renderQr(setup.otpauth_url);
                },
                error: (error) => this.error.set(problemMessage(error, 'Não foi possível iniciar a configuração.'))
            });
    }

    private async renderQr(uri: string) {
        this.qr.set('');

        try {
            const { toDataURL } = await import('qrcode');
            const qr = await toDataURL(uri, { width: 240, margin: 2, errorCorrectionLevel: 'M' });

            if (!this.destroyRef.destroyed && this.setup()?.otpauth_url === uri) {
                this.qr.set(qr);
            }
        } catch {
            if (!this.destroyRef.destroyed) {
                this.error.set('Não foi possível gerar o QR Code. Use a chave para configurar manualmente.');
            }
        }
    }

    enable() {
        if (this.loading() || this.codeForm.invalid) {
            this.codeForm.markAllAsTouched();

            return;
        }

        this.loading.set(true);
        this.error.set('');
        this.api
            .enable(this.codeForm.controls.code.value.trim())
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false))
            )
            .subscribe({
                next: (data) => this.showCodes(data.recovery_codes),
                error: (error) => this.error.set(problemMessage(error, 'Não foi possível confirmar o código.'))
            });
    }

    chooseAction(action: 'disable' | 'regenerate' | null) {
        this.action.set(action);
        this.codeForm.reset();
        this.disableForm.reset();
        this.error.set('');
    }

    submitAction() {
        const action = this.action();
        const form = action === 'disable' ? this.disableForm : this.codeForm;

        if (this.loading() || !action || form.invalid) {
            form.markAllAsTouched();

            return;
        }

        this.loading.set(true);
        this.error.set('');

        if (action === 'disable') {
            const { password, code } = this.disableForm.getRawValue();

            this.api
                .disable(password, code.trim())
                .pipe(
                    takeUntilDestroyed(this.destroyRef),
                    finalize(() => this.loading.set(false))
                )
                .subscribe({
                    next: () => {
                        this.disableForm.reset();
                        this.status.set({ enabled: false, setup_pending: false, recovery_codes_remaining: 0 });
                        this.action.set(null);
                        this.changed.emit();
                    },
                    error: (error) => this.error.set(problemMessage(error, 'Não foi possível desativar a verificação.'))
                });
        } else {
            this.api
                .regenerate(this.codeForm.controls.code.value.trim())
                .pipe(
                    takeUntilDestroyed(this.destroyRef),
                    finalize(() => this.loading.set(false))
                )
                .subscribe({
                    next: (data) => this.showCodes(data.recovery_codes),
                    error: (error) => this.error.set(problemMessage(error, 'Não foi possível gerar os códigos reserva.'))
                });
        }
    }

    private showCodes(codes: string[]) {
        this.recoveryCodes.set(codes);
        this.savedCodes.set(false);
        this.setup.set(null);
        this.qr.set('');
        this.codeForm.reset();
        this.action.set(null);
        this.status.set({ enabled: true, setup_pending: false, recovery_codes_remaining: codes.length });
    }

    downloadCodes() {
        const content = 'Datasync — códigos reserva de uso único\n\n' + this.recoveryCodes().join('\n') + '\n\nGuarde em local seguro. Não compartilhe estes códigos.';
        const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a');

        link.href = url;
        link.download = 'datasync-codigos-reserva.txt';
        link.click();
        URL.revokeObjectURL(url);
    }

    finish() {
        if (!this.savedCodes()) {
            return;
        }

        this.recoveryCodes.set([]);
        this.changed.emit();
    }
}
