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
import { Store } from '@/app/types/store';
import { StoreService } from '@/app/pages/geoespacial/store/store.service';

@Component({
    selector: 'app-store',
    standalone: true,
    imports: [CommonModule, UiTable, UiButton, UiConfirmDialog],
    templateUrl: './store.html',
    providers: [ConfirmationService]
})
export class StorePage implements OnInit {
    storeService = inject(StoreService);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private permissionContext = inject(PermissionContextService);

    reloadKey = 0;
    canCreate = false;
    canUpdate = false;
    canDelete = false;
    tableActions: UiTableAction<Store>[] = [];

    ngOnInit() {
        this.resolvePermissions();
    }

    create() {
        this.router.navigateByUrl('/pages/geoespacial/stores/novo');
    }

    edit(id: number) {
        this.router.navigateByUrl(`/pages/geoespacial/stores/${id}`);
    }

    delete(store: Store) {
        this.confirmationService.confirm({
            header: 'Excluir store',
            message: `Confirma excluir o store "${store.nome}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.storeService.remove(store.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Store removido',
                            detail: 'Registro excluído com sucesso.'
                        });
                        this.reloadKey++;
                    },
                    error: (error: unknown) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Falha ao excluir',
                            detail: getBackendErrorMessage(error, 'Não foi possível excluir o store.')
                        });
                    }
                });
            }
        });
    }

    private resolvePermissions() {
        const permissionState = resolveCrudPermissions<Store>(
            this.permissionContext,
            {
                create: PERMISSION_KEYS.STORE_CREATE,
                update: PERMISSION_KEYS.STORE_UPDATE,
                delete: PERMISSION_KEYS.STORE_DELETE
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
