import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { PermissionCatalogGroup } from '@/app/types/permission';

// Grade de permissões por recurso (um bloco por recurso, uma caixa por ação), no layout do GIS.
@Component({
    selector: 'app-permission-grid',
    standalone: true,
    imports: [FormsModule, UiCheckbox],
    template: `
        <div class="flex flex-col gap-3">
            @for (group of visibleGroups(); track group.resource) {
                <div class="rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                    <div class="px-4 py-3 border-b border-surface-200 dark:border-surface-700">
                        <div class="text-sm font-semibold text-surface-700 dark:text-surface-100">{{ group.label }}</div>
                    </div>
                    <div class="p-4 overflow-x-auto">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                            @for (permission of group.permissions; track permission.code) {
                                <ui-checkbox [inputId]="idPrefix() + permission.code" [label]="permission.label" [disabled]="disabled()" [ngModel]="selectedSet().has(permission.code)" (ngModelChange)="toggle(permission.code, $event)" />
                            }
                        </div>
                    </div>
                </div>
            } @empty {
                <small class="text-surface-500 dark:text-white/64">Nenhuma permissão disponível.</small>
            }
        </div>
    `
})
export class PermissionGrid {
    readonly groups = input<PermissionCatalogGroup[]>([]);
    readonly selected = input<string[]>([]);
    readonly disabled = input(false);
    readonly includeReserved = input(false);
    readonly idPrefix = input('perm_');
    readonly selectedChange = output<string[]>();

    readonly selectedSet = computed(() => new Set(this.selected()));
    readonly visibleGroups = computed(() =>
        this.groups()
            .map((group) => ({ ...group, permissions: group.permissions.filter((item) => this.includeReserved() || !item.reserved) }))
            .filter((group) => group.permissions.length > 0)
    );

    toggle(code: string, checked: boolean) {
        const next = new Set(this.selected());

        if (checked) {
            next.add(code);
        } else {
            next.delete(code);
        }

        this.selectedChange.emit([...next].sort());
    }
}
