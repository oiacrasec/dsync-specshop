import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { resolveCrudPermissions } from '@/app/shared/ui/table/crud-permissions';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiTable, UiTableAction } from '@/app/shared/ui/table/table';
import { Organizacao } from '@/app/types/organizacao';
import { OrganizacaoService } from '@/app/pages/administracao/organizacao/organizacao.service';
import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';

@Component({
    selector: 'app-organizacao',
    standalone: true,
    imports: [CommonModule, UiTable, UiButton, UiConfirmDialog],
    templateUrl: './organizacao.html',
    providers: [ConfirmationService]
})
export class OrganizacaoPage implements OnInit {
    organizacaoService = inject(OrganizacaoService);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private permissionContext = inject(PermissionContextService);

    reloadKey = 0;
    canCreate = false;
    canUpdate = false;
    canDelete = false;
    tableActions: UiTableAction<Organizacao>[] = [];

    ngOnInit() {
        this.resolvePermissions();
    }

    create() {
        this.router.navigateByUrl('/pages/administracao/organizacao/novo');
    }

    edit(id: number) {
        this.router.navigateByUrl(`/pages/administracao/organizacao/${id}`);
    }

    delete(organizacao: Organizacao) {
        this.confirmationService.confirm({
            header: 'Excluir organização',
            message: `Confirma excluir a organização "${organizacao.nome}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.organizacaoService.remove(organizacao.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Organização removida',
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

    private resolvePermissions() {
        const permissionState = resolveCrudPermissions<Organizacao>(
            this.permissionContext,
            {
                create: PERMISSION_KEYS.ORGANIZACAO_CREATE,
                update: PERMISSION_KEYS.ORGANIZACAO_UPDATE,
                delete: PERMISSION_KEYS.ORGANIZACAO_DELETE
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
