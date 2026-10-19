import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';
import { problemMessage } from '@/app/core/utils/api-problem';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { resolveCrudPermissions } from '@/app/shared/ui/table/crud-permissions';
import { UiTable, UiTableAction } from '@/app/shared/ui/table/table';
import { Organization } from '@/app/types/organizacao';
import { OrganizacaoService } from './organizacao.service';

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
    tableActions: UiTableAction<Organization>[] = [];

    ngOnInit() {
        const permissions = resolveCrudPermissions<Organization>(
            this.permissionContext,
            {
                create: PERMISSION_KEYS.ORGANIZATION_CREATE,
                update: PERMISSION_KEYS.ORGANIZATION_UPDATE,
                delete: PERMISSION_KEYS.ORGANIZATION_DELETE
            },
            {
                onEdit: (row) => this.edit(row.public_id),
                onDelete: (row) => this.delete(row)
            }
        );

        this.canCreate = permissions.canCreate;
        this.tableActions = permissions.actions;
    }

    create() {
        this.router.navigateByUrl('/pages/administracao/organizacao/novo');
    }

    edit(publicId: string) {
        this.router.navigateByUrl(`/pages/administracao/organizacao/${publicId}`);
    }

    delete(organization: Organization) {
        this.confirmationService.confirm({
            header: 'Excluir organização',
            message: `Confirma excluir a organização "${organization.name}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.organizacaoService.remove(organization.public_id).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Organização excluída', detail: 'Registro excluído com sucesso.' });
                        this.reloadKey++;
                    },
                    error: (error: unknown) => {
                        this.messageService.add({ severity: 'error', summary: 'Falha ao excluir', detail: problemMessage(error, 'Não foi possível excluir a organização.') });
                    }
                });
            }
        });
    }
}
