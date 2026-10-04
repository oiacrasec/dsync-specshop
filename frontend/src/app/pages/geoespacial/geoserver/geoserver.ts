import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';
import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { GeoServerService } from '@/app/pages/geoespacial/geoserver/geoserver.service';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { resolveCrudPermissions } from '@/app/shared/ui/table/crud-permissions';
import { UiTable, UiTableAction } from '@/app/shared/ui/table/table';
import { GeoServer } from '@/app/types/geoserver';

@Component({
    selector: 'app-geoserver',
    standalone: true,
    imports: [CommonModule, UiTable, UiButton, UiConfirmDialog],
    templateUrl: './geoserver.html',
    providers: [ConfirmationService]
})
export class GeoServerPage implements OnInit {
    geoserverService = inject(GeoServerService);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private permissionContext = inject(PermissionContextService);

    reloadKey = 0;
    canCreate = false;
    canUpdate = false;
    canDelete = false;
    tableActions: UiTableAction<GeoServer>[] = [];

    ngOnInit() {
        this.resolvePermissions();
    }

    create() {
        this.router.navigateByUrl('/pages/geoespacial/geoservers/novo');
    }

    edit(id: number) {
        this.router.navigateByUrl(`/pages/geoespacial/geoservers/${id}`);
    }

    delete(geoserver: GeoServer) {
        this.confirmationService.confirm({
            header: 'Excluir GeoServer',
            message: `Confirma excluir o GeoServer "${geoserver.nome}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.geoserverService.remove(geoserver.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'GeoServer removido',
                            detail: 'Registro excluído com sucesso.'
                        });
                        this.reloadKey++;
                    },
                    error: (error: unknown) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Falha ao excluir',
                            detail: getBackendErrorMessage(error, 'Não foi possível excluir o GeoServer.')
                        });
                    }
                });
            }
        });
    }

    private resolvePermissions() {
        const permissionState = resolveCrudPermissions<GeoServer>(
            this.permissionContext,
            {
                create: PERMISSION_KEYS.GEOSERVER_CREATE,
                update: PERMISSION_KEYS.GEOSERVER_UPDATE,
                delete: PERMISSION_KEYS.GEOSERVER_DELETE
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
