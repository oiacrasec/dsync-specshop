import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';
import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { UsuarioService } from '@/app/pages/administracao/usuario/usuario.service';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { UiTable, UiTableAction } from '@/app/shared/ui/table/table';
import { Usuario } from '@/app/types/usuario';

@Component({
    selector: 'app-usuario',
    standalone: true,
    imports: [CommonModule, UiTable, UiButton, UiConfirmDialog],
    templateUrl: './usuario.html',
    providers: [ConfirmationService]
})
export class UsuarioPage implements OnInit {
    usuarioService = inject(UsuarioService);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private permissionContext = inject(PermissionContextService);

    reloadKey = 0;
    canCreate = false;
    canDelete = false;
    tableActions: UiTableAction<Usuario>[] = [];

    ngOnInit() {
        const canManage = this.permissionContext.hasPermission(PERMISSION_KEYS.USUARIO_MANAGE);

        this.canCreate = canManage;
        this.canDelete = canManage;

        const actions: UiTableAction<Usuario>[] = [
            {
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                handler: (row) => this.edit(row.id)
            }
        ];

        if (this.canDelete) {
            actions.push({
                id: 'delete',
                label: 'Excluir',
                icon: 'pi pi-trash',
                severity: 'danger',
                handler: (row) => this.delete(row)
            });
        }

        this.tableActions = actions;
    }

    create() {
        this.router.navigateByUrl('/pages/administracao/usuario/novo');
    }

    edit(id: number) {
        this.router.navigateByUrl(`/pages/administracao/usuario/${id}`);
    }

    delete(usuario: Usuario) {
        const fullName = (usuario.nome_completo ?? '').trim() || usuario.username;

        this.confirmationService.confirm({
            header: 'Excluir usuário',
            message: `Confirma excluir o usuário "${fullName}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.usuarioService.remove(usuario.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Usuário removido',
                            detail: 'Registro excluido com sucesso.'
                        });
                        this.reloadKey++;
                    },
                    error: (error) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Falha ao excluir',
                            detail: getBackendErrorMessage(error, 'Nao foi possivel excluir o usuário.')
                        });
                    }
                });
            }
        });
    }
}
