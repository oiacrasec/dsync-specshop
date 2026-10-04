import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { resolveCrudPermissions } from '@/app/shared/ui/table/crud-permissions';
import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';
import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { UiTable, UiTableAction } from '@/app/shared/ui/table/table';
import { Setor } from '@/app/types/setor';
import { SetorService } from '@/app/pages/administracao/setor/setor.service';

@Component({
    selector: 'app-setor',
    standalone: true,
    imports: [CommonModule, UiTable, UiButton, UiConfirmDialog],
    templateUrl: './setor.html',
    providers: [ConfirmationService]
})
export class SetorPage implements OnInit {
    setorService = inject(SetorService);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private permissionContext = inject(PermissionContextService);

    reloadKey = 0;
    canCreate = false;
    canUpdate = false;
    canDelete = false;
    tableActions: UiTableAction<Setor>[] = [];

    ngOnInit() {
        this.resolvePermissions();
    }

    create() {
        this.router.navigateByUrl('/pages/administracao/setor/novo');
    }

    edit(id: number) {
        this.router.navigateByUrl(`/pages/administracao/setor/${id}`);
    }

    delete(setor: Setor) {
        this.confirmationService.confirm({
            header: 'Excluir setor',
            message: `Confirma excluir o setor "${setor.nome}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.setorService.remove(setor.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Setor removido',
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
        const permissionState = resolveCrudPermissions<Setor>(
            this.permissionContext,
            {
                create: PERMISSION_KEYS.SETOR_CREATE,
                update: PERMISSION_KEYS.SETOR_UPDATE,
                delete: PERMISSION_KEYS.SETOR_DELETE
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
