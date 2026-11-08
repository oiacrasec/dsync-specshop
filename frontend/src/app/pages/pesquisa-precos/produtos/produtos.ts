import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { problemMessage } from '@/app/core/utils/api-problem';
import { SPECSHOP_PERMISSION_KEYS } from '@/app/project/permission.keys';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { resolveCrudPermissions } from '@/app/shared/ui/table/crud-permissions';
import { UiTable, UiTableAction } from '@/app/shared/ui/table/table';
import { TrackedProduct } from '@/app/types/produto';
import { ProdutosService } from './produtos.service';

@Component({
    selector: 'app-produtos',
    standalone: true,
    imports: [CommonModule, UiTable, UiButton, UiConfirmDialog],
    templateUrl: './produtos.html',
    providers: [ConfirmationService]
})
export class ProdutosPage implements OnInit {
    produtosService = inject(ProdutosService);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private permissionContext = inject(PermissionContextService);

    reloadKey = 0;
    canCreate = false;
    tableActions: UiTableAction<TrackedProduct>[] = [];

    ngOnInit() {
        const permissions = resolveCrudPermissions<TrackedProduct>(
            this.permissionContext,
            {
                create: SPECSHOP_PERMISSION_KEYS.PRODUCT_CREATE,
                update: SPECSHOP_PERMISSION_KEYS.PRODUCT_UPDATE,
                delete: SPECSHOP_PERMISSION_KEYS.PRODUCT_DELETE
            },
            {
                onEdit: (row) => this.edit(row.public_id),
                onDelete: (row) => this.archive(row),
                deleteLabel: 'Arquivar'
            }
        );

        this.canCreate = permissions.canCreate;
        this.tableActions = permissions.actions.map((action) => ({ ...action, visible: (row) => !row.is_archived }));
    }

    create() {
        this.router.navigateByUrl('/pages/pesquisa-precos/produtos/novo');
    }

    edit(publicId: string) {
        this.router.navigateByUrl(`/pages/pesquisa-precos/produtos/${publicId}`);
    }

    archive(product: TrackedProduct) {
        if (product.is_archived) {
            return;
        }

        this.confirmationService.confirm({
            header: 'Arquivar produto',
            message: `Arquivar "${product.name} · ${product.model}"? Ele sai da lista e das pesquisas. O histórico de preços é mantido.`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.produtosService.archive(product.public_id).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Produto arquivado', detail: 'O produto saiu da lista.' });
                        this.reloadKey++;
                    },
                    error: (error: unknown) => {
                        this.messageService.add({ severity: 'error', summary: 'Falha ao arquivar', detail: problemMessage(error, 'Não foi possível arquivar o produto.') });
                    }
                });
            }
        });
    }
}
