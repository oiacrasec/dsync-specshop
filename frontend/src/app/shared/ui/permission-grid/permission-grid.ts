import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { PermissionCatalogGroup, PermissionScope } from '@/app/types/permission';

// Grade de permissões por recurso (um bloco por recurso, uma caixa por ação), no layout do GIS.
// `locked`: códigos marcados e sem edição (ex.: administrador do contrato). O botão do cabeçalho
// marca todas as caixas do recurso, ou desmarca quando todas já estão marcadas.
@Component({
    selector: 'app-permission-grid',
    standalone: true,
    imports: [FormsModule, UiCheckbox],
    template: `
        <div class="flex flex-col gap-3">
            @for (group of visibleGroups(); track group.resource) {
                <div class="rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                    <div class="px-4 py-3 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between gap-3">
                        <div class="text-sm font-semibold text-surface-700 dark:text-surface-100">{{ group.label }}</div>
                        @if (!disabled() && editableCodes(group).length) {
                            <button
                                type="button"
                                class="text-xs font-medium px-2.5 py-1 rounded-md border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors"
                                [attr.aria-label]="(allChecked(group) ? 'Desmarcar todas as permissões de ' : 'Marcar todas as permissões de ') + group.label"
                                (click)="toggleGroup(group)"
                            >
                                {{ allChecked(group) ? 'Nenhum' : 'Todos' }}
                            </button>
                        }
                    </div>
                    <div class="p-4 overflow-x-auto">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                            @for (permission of group.permissions; track permission.code) {
                                <ui-checkbox
                                    [inputId]="idPrefix() + permission.code"
                                    [label]="permission.label"
                                    [disabled]="disabled() || lockedSet().has(permission.code)"
                                    [ngModel]="selectedSet().has(permission.code) || lockedSet().has(permission.code)"
                                    (ngModelChange)="toggle(permission.code, $event)"
                                />
                            }
                        </div>
                    </div>
                </div>
            } @empty {
                <small class="text-surface-700 dark:text-white/64">Nenhuma permissão disponível.</small>
            }
        </div>
    `
})
export class PermissionGrid {
    readonly groups = input<PermissionCatalogGroup[]>([]);
    readonly selected = input<string[]>([]);
    readonly disabled = input(false);
    readonly includeReserved = input(false);
    readonly locked = input<string[]>([]);
    readonly scope = input<PermissionScope | null>(null);
    readonly idPrefix = input('perm_');
    readonly selectedChange = output<string[]>();

    readonly selectedSet = computed(() => new Set(this.selected()));
    readonly lockedSet = computed(() => new Set(this.locked()));
    readonly visibleGroups = computed(() =>
        this.groups()
            .map((group) => ({ ...group, permissions: group.permissions.filter((item) => (this.includeReserved() || !item.reserved) && this.allowedInScope(item.scopes)) }))
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

    editableCodes(group: PermissionCatalogGroup) {
        return group.permissions.map((item) => item.code).filter((code) => !this.lockedSet().has(code));
    }

    allChecked(group: PermissionCatalogGroup) {
        return this.editableCodes(group).every((code) => this.selectedSet().has(code));
    }

    toggleGroup(group: PermissionCatalogGroup) {
        const next = new Set(this.selected());
        const codes = this.editableCodes(group);

        if (this.allChecked(group)) {
            codes.forEach((code) => next.delete(code));
        } else {
            codes.forEach((code) => next.add(code));
        }

        this.selectedChange.emit([...next].sort());
    }

    private allowedInScope(scopes: PermissionScope[]) {
        const scope = this.scope();

        return scope === null || scopes.includes(scope);
    }
}
