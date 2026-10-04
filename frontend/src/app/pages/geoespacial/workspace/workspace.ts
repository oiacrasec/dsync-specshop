import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';
import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { resolveCrudPermissions } from '@/app/shared/ui/table/crud-permissions';
import { UiTable, UiTableAction } from '@/app/shared/ui/table/table';
import { Workspace } from '@/app/types/workspace';
import { WorkspaceService } from '@/app/pages/geoespacial/workspace/workspace.service';

@Component({
    selector: 'app-workspace',
    standalone: true,
    imports: [CommonModule, UiTable, UiButton, UiConfirmDialog],
    templateUrl: './workspace.html',
    providers: [ConfirmationService]
})
export class WorkspacePage implements OnInit {
    workspaceService = inject(WorkspaceService);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private permissionContext = inject(PermissionContextService);

    reloadKey = 0;
    canCreate = false;
    canUpdate = false;
    canDelete = false;
    tableActions: UiTableAction<Workspace>[] = [];

    ngOnInit() {
        this.resolvePermissions();
    }

    create() {
        this.router.navigateByUrl('/pages/geoespacial/workspaces/novo');
    }

    edit(id: number) {
        this.router.navigateByUrl(`/pages/geoespacial/workspaces/${id}`);
    }

    delete(workspace: Workspace) {
        this.confirmationService.confirm({
            header: 'Excluir workspace',
            message: `Confirma excluir o workspace "${workspace.nome}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.workspaceService.remove(workspace.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Workspace removido',
                            detail: 'Registro excluído com sucesso.'
                        });
                        this.reloadKey++;
                    },
                    error: (error: unknown) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Falha ao excluir',
                            detail: getBackendErrorMessage(error, 'Não foi possível excluir o workspace.')
                        });
                    }
                });
            }
        });
    }

    private resolvePermissions() {
        const permissionState = resolveCrudPermissions<Workspace>(
            this.permissionContext,
            {
                create: PERMISSION_KEYS.WORKSPACE_CREATE,
                update: PERMISSION_KEYS.WORKSPACE_UPDATE,
                delete: PERMISSION_KEYS.WORKSPACE_DELETE
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
