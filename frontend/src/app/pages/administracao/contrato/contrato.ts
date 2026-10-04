import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';

import { Contrato } from '@/app/types/contrato';
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
export class ContratoPage implements OnInit {
    contratoService = inject(ContratoService);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    reloadKey = 0;
    ngOnInit() {}

    create() {
        this.router.navigateByUrl('/pages/administracao/contrato/novo');
    }

    edit(id: number) {
        this.router.navigateByUrl(`/pages/administracao/contrato/${id}`);
    }

    delete(contrato: Contrato) {
        this.confirmationService.confirm({
            header: 'Excluir contrato',
            message: `Confirma excluir o contrato "${contrato.nome}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.contratoService.remove(contrato.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Contrato removido',
                            detail: 'Registro excluido com sucesso.'
                        });
                        this.reloadKey++;
                    },
                    error: () => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Falha ao excluir',
                            detail: 'Verifique dependencias antes de remover.'
                        });
                    }
                });
            }
        });
    }

    tableActions: UiTableAction<Contrato>[] = [
        {
            id: 'edit',
            label: 'Editar',
            icon: 'pi pi-pencil',
            handler: (row) => this.edit(row.id)
        },
        {
            id: 'delete',
            label: 'Excluir',
            icon: 'pi pi-trash',
            severity: 'danger',
            handler: (row) => this.delete(row)
        }
    ];
}
