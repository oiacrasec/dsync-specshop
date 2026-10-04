import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';
import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { GeoServerBancoService } from '@/app/pages/geoespacial/geoserver-banco/geoserver-banco.service';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { resolveCrudPermissions } from '@/app/shared/ui/table/crud-permissions';
import { UiTable, UiTableAction } from '@/app/shared/ui/table/table';
import { GeoServerBanco } from '@/app/types/geoserver-banco';

@Component({
    selector: 'app-geoserver-banco',
    standalone: true,
    imports: [CommonModule, UiTable, UiButton, UiConfirmDialog],
    templateUrl: './geoserver-banco.html',
    providers: [ConfirmationService]
})
export class GeoServerBancoPage implements OnInit {
    geoserverBancoService = inject(GeoServerBancoService);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private permissionContext = inject(PermissionContextService);

    reloadKey = 0;
    canCreate = false;
    canUpdate = false;
    canDelete = false;
    tableActions: UiTableAction<GeoServerBanco>[] = [];

    ngOnInit() {
        this.resolvePermissions();
    }

    create() {
        this.router.navigateByUrl('/pages/geoespacial/geoserver-bancos/novo');
    }

    edit(id: number) {
        this.router.navigateByUrl(`/pages/geoespacial/geoserver-bancos/${id}`);
    }

    delete(vinculo: GeoServerBanco) {
        this.confirmationService.confirm({
            header: 'Excluir vínculo',
            message: `Confirma excluir o vínculo "${vinculo.geoserver_label ?? vinculo.geoserver} x ${vinculo.banco_label ?? vinculo.banco}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.geoserverBancoService.remove(vinculo.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Vínculo removido',
                            detail: 'Registro excluído com sucesso.'
                        });
                        this.reloadKey++;
                    },
                    error: (error: unknown) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Falha ao excluir',
                            detail: getBackendErrorMessage(error, 'Não foi possível excluir o vínculo.')
                        });
                    }
                });
            }
        });
    }

    private resolvePermissions() {
        const permissionState = resolveCrudPermissions<GeoServerBanco>(
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
