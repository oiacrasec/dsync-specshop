import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { UiTableAction } from '@/app/shared/ui/table/table';

export interface CrudPermissionKeys {
    create?: string;
    update?: string;
    delete?: string;
    manage?: string;
}

export interface CrudPermissionResult<T> {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    actions: UiTableAction<T>[];
}

export function resolveCrudPermissions<T>(
    permission: PermissionContextService,
    keys: CrudPermissionKeys,
    opts: {
        onEdit?: (row: T) => void;
        onDelete?: (row: T) => void;
        editLabel?: string;
        deleteLabel?: string;
    }
): CrudPermissionResult<T> {
    const has = (key?: string) => (key ? permission.hasPermission(key) : false);

    const canCreate = has(keys.create) || has(keys.manage);
    const canUpdate = has(keys.update) || has(keys.manage);
    const canDelete = has(keys.delete) || has(keys.manage);

    const actions: UiTableAction<T>[] = [];

    if (canUpdate && opts.onEdit) {
        actions.push({
            id: 'edit',
            label: opts.editLabel ?? 'Editar',
            icon: 'pi pi-pencil',
            handler: opts.onEdit
        });
    }

    if (canDelete && opts.onDelete) {
        actions.push({
            id: 'delete',
            label: opts.deleteLabel ?? 'Excluir',
            icon: 'pi pi-trash',
            severity: 'danger',
            handler: opts.onDelete
        });
    }

    return { canCreate, canUpdate, canDelete, actions };
}
