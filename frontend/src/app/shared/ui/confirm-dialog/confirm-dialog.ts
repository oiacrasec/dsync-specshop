import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
    selector: 'ui-confirm-dialog',
    standalone: true,
    imports: [CommonModule, ConfirmDialogModule],
    template: `
        <p-confirmdialog
            [key]="key"
            [style]="style"
            [class]="styleClass"
            [appendTo]="appendTo"
            [acceptLabel]="acceptLabel"
            [rejectLabel]="rejectLabel"
            [acceptIcon]="acceptIcon"
            [rejectIcon]="rejectIcon"
            [acceptButtonStyleClass]="acceptButtonStyleClass"
            [rejectButtonStyleClass]="rejectButtonStyleClass"
            [defaultFocus]="defaultFocus"
        >
            <ng-template #message let-confirmation>
                <div class="flex items-center justify-center">
                    <i [ngClass]="confirmation?.icon || 'pi pi-exclamation-triangle'" class="mr-6 text-2xl"></i>
                    <span>{{ confirmation?.message }}</span>
                </div>
            </ng-template>
        </p-confirmdialog>
    `
})
export class UiConfirmDialog {
    @Input() key?: string;

    @Input() style: Record<string, string | number> = { width: '480px' };

    @Input() styleClass?: string;

    @Input() appendTo: any = 'body';

    @Input() acceptLabel = 'Sim';

    @Input() rejectLabel = 'Não';

    @Input() acceptIcon = 'pi pi-check';

    @Input() rejectIcon = 'pi pi-times';

    @Input() acceptButtonStyleClass = 'p-button-outlined p-button-danger';

    @Input() rejectButtonStyleClass = 'p-button-text p-button-secondary';

    @Input() defaultFocus: 'accept' | 'reject' | 'close' | 'none' = 'accept';
}
