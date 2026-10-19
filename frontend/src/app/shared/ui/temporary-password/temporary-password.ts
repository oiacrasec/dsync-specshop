import { Component, inject, input } from '@angular/core';
import { MessageService } from 'primeng/api';

import { UiButton } from '@/app/shared/ui/button/button';

// Senha temporária devolvida uma única vez pela API: mostrada, copiável e nunca persistida.
@Component({
    selector: 'app-temporary-password',
    standalone: true,
    imports: [UiButton],
    template: `
        <div role="status" class="border border-amber-300 dark:border-amber-700 rounded-xl p-4 bg-amber-50 dark:bg-amber-900/20 flex flex-col gap-3">
            <div class="font-medium text-amber-900 dark:text-amber-200">{{ title() }}</div>
            @if (username()) {
                <div class="text-sm text-amber-900 dark:text-amber-100">
                    Usuário: <strong>{{ username() }}</strong>
                    @if (detail()) {
                        · {{ detail() }}
                    }
                </div>
            }
            <div class="font-mono text-lg tracking-wide text-amber-900 dark:text-amber-100">{{ password() }}</div>
            <div>
                <ui-button label="Copiar senha" icon="pi pi-copy" severity="secondary" (onClick)="copy()"></ui-button>
            </div>
        </div>
    `
})
export class TemporaryPasswordNotice {
    private messageService = inject(MessageService);

    readonly password = input.required<string>();
    readonly username = input<string>('');
    readonly detail = input<string>('');
    readonly title = input<string>('Senha temporária (exibida uma única vez)');

    copy() {
        navigator.clipboard
            .writeText(this.password())
            .then(() => this.messageService.add({ severity: 'success', summary: 'Senha copiada', detail: 'Senha temporária copiada para a área de transferência.' }))
            .catch(() => this.messageService.add({ severity: 'warn', summary: 'Cópia indisponível', detail: 'Não foi possível copiar automaticamente. Copie manualmente.' }));
    }
}
