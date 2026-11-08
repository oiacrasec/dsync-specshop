import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { UUID_PATTERN } from '@/app/core/utils/session-data';
import { SPECSHOP_PERMISSION_KEYS } from '@/app/project/permission.keys';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiTable, UiTableAction } from '@/app/shared/ui/table/table';
import { PriceSearchListRow } from '@/app/types/pesquisa';
import { ShoppingService } from './shopping.service';

@Component({
    selector: 'app-shopping',
    standalone: true,
    imports: [UiTable, UiButton],
    templateUrl: './shopping.html'
})
export class ShoppingPage implements OnInit {
    readonly shoppingService = inject(ShoppingService);
    private router = inject(Router);
    private permissionContext = inject(PermissionContextService);

    canCreate = false;
    tableActions: UiTableAction<PriceSearchListRow>[] = [];

    ngOnInit() {
        this.canCreate = this.permissionContext.hasPermission(SPECSHOP_PERMISSION_KEYS.SEARCH_CREATE);

        if (this.permissionContext.hasPermission(SPECSHOP_PERMISSION_KEYS.SEARCH_VIEW)) {
            this.tableActions = [{ id: 'open', label: 'Abrir', icon: 'fa-solid fa-arrow-up-right-from-square', handler: (row) => this.open(row.public_id) }];
        }
    }

    create() {
        this.router.navigateByUrl('/pages/pesquisa-precos/shopping/nova');
    }

    open(publicId: string) {
        if (UUID_PATTERN.test(publicId)) {
            this.router.navigate(['/pages/pesquisa-precos/shopping', publicId]);
        }
    }
}
