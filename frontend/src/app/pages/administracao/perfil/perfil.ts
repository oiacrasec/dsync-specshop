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
import { Profile } from '@/app/types/perfil';
import { PerfilService } from './perfil.service';

@Component({
    selector: 'app-perfil',
    standalone: true,
    imports: [CommonModule, UiTable, UiButton, UiConfirmDialog],
    templateUrl: './perfil.html',
    providers: [ConfirmationService]
})
export class PerfilPage implements OnInit {
    perfilService = inject(PerfilService);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private permissionContext = inject(PermissionContextService);

    reloadKey = 0;
    canCreate = false;
    tableActions: UiTableAction<Profile>[] = [];

    ngOnInit() {
        const permissions = resolveCrudPermissions<Profile>(
            this.permissionContext,
            { create: PERMISSION_KEYS.PROFILE_CREATE, update: PERMISSION_KEYS.PROFILE_UPDATE, delete: PERMISSION_KEYS.PROFILE_DELETE },
            { onEdit: (row) => this.edit(row.public_id), onDelete: (row) => this.delete(row) }
        );

        this.canCreate = permissions.canCreate;
        this.tableActions = permissions.actions;
    }

    create() {
        this.router.navigateByUrl('/pages/administracao/perfil/novo');
    }

    edit(publicId: string) {
        this.router.navigateByUrl(`/pages/administracao/perfil/${publicId}`);
    }

    delete(profile: Profile) {
        this.confirmationService.confirm({
            header: 'Excluir perfil',
            message: `Confirma excluir o perfil "${profile.name}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.perfilService.remove(profile.public_id).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Perfil excluído', detail: 'Registro excluído com sucesso.' });
                        this.reloadKey++;
                    },
                    error: (error: unknown) => {
                        this.messageService.add({ severity: 'error', summary: 'Falha ao excluir', detail: problemMessage(error, 'Não foi possível excluir o perfil.') });
                    }
                });
            }
        });
    }
}
