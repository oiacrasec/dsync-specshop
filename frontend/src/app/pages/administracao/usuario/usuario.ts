import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';
import { problemMessage } from '@/app/core/utils/api-problem';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { TemporaryPasswordNotice } from '@/app/shared/ui/temporary-password/temporary-password';
import { resolveCrudPermissions } from '@/app/shared/ui/table/crud-permissions';
import { UiTable, UiTableAction } from '@/app/shared/ui/table/table';
import { ContractUser, ContractUserPasswordReset } from '@/app/types/usuario';
import { UsuarioService } from './usuario.service';

@Component({
    selector: 'app-usuario',
    standalone: true,
    imports: [CommonModule, UiTable, UiButton, UiConfirmDialog, TemporaryPasswordNotice],
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
    tableActions: UiTableAction<ContractUser>[] = [];
    resetResult: ContractUserPasswordReset | null = null;

    ngOnInit() {
        const permissions = resolveCrudPermissions<ContractUser>(
            this.permissionContext,
            { create: PERMISSION_KEYS.USER_CREATE, update: PERMISSION_KEYS.USER_UPDATE, delete: PERMISSION_KEYS.USER_DELETE },
            { onEdit: (row) => this.edit(row.public_id), onDelete: (row) => this.delete(row) }
        );

        this.canCreate = permissions.canCreate;
        this.tableActions = permissions.actions;

        if (this.permissionContext.hasPermission(PERMISSION_KEYS.USER_MANAGE)) {
            this.tableActions = [
                ...this.tableActions,
                { id: 'reset-password', label: 'Redefinir senha', icon: 'pi pi-key', handler: (row) => this.confirmResetPassword(row) },
                { id: 'reset-mfa', label: 'Redefinir verificação em duas etapas', icon: 'fa-solid fa-shield-halved', handler: (row) => this.confirmResetMfa(row) }
            ];
        }
    }

    create() {
        this.router.navigateByUrl('/pages/administracao/usuario/novo');
    }

    edit(publicId: string) {
        this.router.navigateByUrl(`/pages/administracao/usuario/${publicId}`);
    }

    delete(user: ContractUser) {
        this.confirmationService.confirm({
            header: 'Excluir usuário',
            message: `Confirma excluir o usuário "${user.username}"? A licença dele fica livre.`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.usuarioService.remove(user.public_id).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Usuário excluído', detail: 'Registro excluído com sucesso.' });
                        this.reloadKey++;
                    },
                    error: (error: unknown) => {
                        this.messageService.add({ severity: 'error', summary: 'Falha ao excluir', detail: problemMessage(error, 'Não foi possível excluir o usuário.') });
                    }
                });
            }
        });
    }

    private confirmResetPassword(user: ContractUser) {
        this.confirmationService.confirm({
            header: 'Redefinir senha',
            message: `Gerar uma nova senha temporária para "${user.username}"? As sessões abertas desse usuário serão encerradas.`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.usuarioService.resetPassword(user.public_id).subscribe({
                    next: (result) => {
                        this.resetResult = result;
                        this.reloadKey++;
                    },
                    error: (error: unknown) => {
                        this.messageService.add({ severity: 'error', summary: 'Falha ao redefinir senha', detail: problemMessage(error, 'Não foi possível redefinir a senha.') });
                    }
                });
            }
        });
    }

    private confirmResetMfa(user: ContractUser) {
        this.confirmationService.confirm({
            header: 'Redefinir verificação em duas etapas',
            message: `Remover a verificação em duas etapas de "${user.username}"? As sessões serão encerradas e os códigos reserva serão invalidados. O usuário poderá configurar novamente no Perfil. Esta ação está disponível apenas para usuários que não são administradores do contrato.`,
            icon: 'pi pi-exclamation-triangle',
            accept: () =>
                this.usuarioService.resetMfa(user.public_id).subscribe({
                    next: () => this.messageService.add({ severity: 'success', summary: 'Verificação redefinida', detail: 'Proteção removida e sessões encerradas. O usuário pode configurar novamente.' }),
                    error: (error: unknown) => this.messageService.add({ severity: 'error', summary: 'Falha ao redefinir', detail: problemMessage(error, 'Não foi possível redefinir a verificação em duas etapas.') })
                })
        });
    }
}
