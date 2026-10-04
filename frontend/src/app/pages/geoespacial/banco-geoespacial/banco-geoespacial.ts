import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';
import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { BancoGeoespacialService } from '@/app/pages/geoespacial/banco-geoespacial/banco-geoespacial.service';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { resolveCrudPermissions } from '@/app/shared/ui/table/crud-permissions';
import { UiTable, UiTableAction } from '@/app/shared/ui/table/table';
import { BancoGeoespacial } from '@/app/types/banco-geoespacial';

@Component({
    selector: 'app-banco-geoespacial',
    standalone: true,
    imports: [CommonModule, UiTable, UiButton, UiConfirmDialog],
    templateUrl: './banco-geoespacial.html',
    providers: [ConfirmationService]
})
export class BancoGeoespacialPage implements OnInit {
    bancoService = inject(BancoGeoespacialService);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private permissionContext = inject(PermissionContextService);

    reloadKey = 0;
    canCreate = false;
    canUpdate = false;
    canDelete = false;
    tableActions: UiTableAction<BancoGeoespacial>[] = [];

    ngOnInit() {
        this.resolvePermissions();
    }

    create() {
        this.router.navigateByUrl('/pages/geoespacial/bancos/novo');
    }

    edit(id: number) {
        this.router.navigateByUrl(`/pages/geoespacial/bancos/${id}`);
    }

    delete(banco: BancoGeoespacial) {
        this.confirmationService.confirm({
            header: 'Excluir banco geoespacial',
            message: `Confirma excluir o banco "${banco.nome}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.bancoService.remove(banco.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Banco removido',
                            detail: 'Registro excluído com sucesso.'
                        });
                        this.reloadKey++;
                    },
                    error: (error: unknown) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Falha ao excluir',
                            detail: getBackendErrorMessage(error, 'Não foi possível excluir o banco.')
                        });
                    }
                });
            }
        });
    }

    private resolvePermissions() {
        const permissionState = resolveCrudPermissions<BancoGeoespacial>(
            this.permissionContext,
            {
                create: PERMISSION_KEYS.BANCO_CREATE,
                update: PERMISSION_KEYS.BANCO_UPDATE,
                delete: PERMISSION_KEYS.BANCO_DELETE
            },
            {
                onEdit: (row) => this.edit(row.id),
                onDelete: (row) => this.delete(row)
            }
        );

        this.canCreate = permissionState.canCreate;
        this.canUpdate = permissionState.canUpdate;
        this.canDelete = permissionState.canDelete;
        this.tableActions = permissionState.actions;
    }
}
