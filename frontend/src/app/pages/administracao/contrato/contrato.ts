import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';

import { problemMessage } from '@/app/core/utils/api-problem';
import { Contract } from '@/app/types/contrato';
import { ContratoService } from './contrato.service';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiTable, UiTableAction } from '@/app/shared/ui/table/table';

@Component({
    selector: 'app-contrato',
    standalone: true,
    imports: [CommonModule, UiTable, UiButton, UiConfirmDialog],
    templateUrl: './contrato.html',
    providers: [ConfirmationService]
})
export class ContratoPage {
    contratoService = inject(ContratoService);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    reloadKey = 0;

    tableActions: UiTableAction<Contract>[] = [
        {
            id: 'edit',
            label: 'Editar',
            icon: 'pi pi-pencil',
            handler: (row) => this.edit(row.public_id)
        },
        {
            id: 'delete',
            label: 'Excluir',
            icon: 'pi pi-trash',
            severity: 'danger',
            handler: (row) => this.delete(row)
        }
    ];

    create() {
        this.router.navigateByUrl('/pages/administracao/contrato/novo');
    }

    edit(publicId: string) {
        this.router.navigateByUrl(`/pages/administracao/contrato/${publicId}`);
    }

    delete(contrato: Contract) {
        this.confirmationService.confirm({
            header: 'Excluir contrato',
            message: `Confirma excluir o contrato "${contrato.name}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.contratoService.remove(contrato.public_id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Contrato removido',
                            detail: 'Registro excluído com sucesso.'
                        });
                        this.reloadKey++;
                    },
                    error: (error: unknown) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Falha ao excluir',
                            detail: problemMessage(error, 'Não foi possível excluir o contrato.')
                        });
                    }
                });
            }
        });
    }
}
