import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';
import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { MapaService } from '@/app/pages/geoespacial/mapa/mapa.service';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { resolveCrudPermissions } from '@/app/shared/ui/table/crud-permissions';
import { UiTable, UiTableAction } from '@/app/shared/ui/table/table';
import { Mapa } from '@/app/types/mapa';

@Component({
    selector: 'app-mapa',
    standalone: true,
    imports: [CommonModule, UiTable, UiButton, UiConfirmDialog],
    templateUrl: './mapa.html',
    providers: [ConfirmationService]
})
export class MapaPage implements OnInit {
    mapaService = inject(MapaService);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private permissionContext = inject(PermissionContextService);

    reloadKey = 0;
    canCreate = false;
    canUpdate = false;
    canDelete = false;
    canOpenEditor = false;
    tableActions: UiTableAction<Mapa>[] = [];

    ngOnInit() {
        this.resolvePermissions();
    }

    create() {
        this.router.navigateByUrl('/pages/geoespacial/mapas/novo');
    }

    edit(id: number) {
        this.router.navigateByUrl(`/pages/geoespacial/mapas/${id}`);
    }

    openEditor(id: number) {
        this.router.navigateByUrl(`/pages/geoespacial/mapas/${id}/editor`);
    }

    delete(mapa: Mapa) {
        this.confirmationService.confirm({
            header: 'Excluir mapa',
            message: `Confirma excluir o mapa "${mapa.nome}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.mapaService.remove(mapa.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Mapa removido',
                            detail: 'Registro excluido com sucesso.'
                        });
                        this.reloadKey++;
                    },
                    error: (error: unknown) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Falha ao excluir',
                            detail: getBackendErrorMessage(error, 'Nao foi possivel excluir o mapa.')
                        });
                    }
                });
            }
        });
    }

    private resolvePermissions() {
        const permissionState = resolveCrudPermissions<Mapa>(
            this.permissionContext,
            {
                create: PERMISSION_KEYS.MAPA_CREATE,
                update: PERMISSION_KEYS.MAPA_UPDATE,
                delete: PERMISSION_KEYS.MAPA_DELETE
            },
            {
                onEdit: (row) => this.edit(row.id),
                onDelete: (row) => this.delete(row)
            }
        );

        this.canCreate = permissionState.canCreate;
        this.canUpdate = permissionState.canUpdate;
        this.canDelete = permissionState.canDelete;
        this.canOpenEditor = this.permissionContext.hasPermission(PERMISSION_KEYS.MAPEDITOR_VIEW);

        const actions: UiTableAction<Mapa>[] = [];

        if (this.canOpenEditor) {
            actions.push({
                id: 'open_editor',
                label: 'Abrir mapa',
                icon: 'pi pi-map',
                handler: (row) => this.openEditor(row.id)
            });
        }

        this.tableActions = [...actions, ...permissionState.actions];
    }
}
