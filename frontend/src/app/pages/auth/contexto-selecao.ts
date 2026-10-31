import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UiOrganizationPicker } from '@/app/shared/ui/organization-picker/organization-picker';

@Component({
    selector: 'app-contexto-selecao',
    standalone: true,
    imports: [UiOrganizationPicker],
    template: `
        <div class="min-h-dvh flex items-center justify-center px-4 py-6">
            <div class="w-full max-w-140 bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-3xl shadow-sm overflow-hidden">
                <ui-organization-picker [returnUrl]="returnUrl" />
            </div>
        </div>
    `
})
export class ContextoSelecaoPage {
    readonly returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl');
}
