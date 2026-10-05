import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { PermissionContextResponse } from '@/app/types/permission';

// DESABILITADO: não há endpoint de resumo de permissões no core nesta etapa.
// A seleção não chama o contrato legado do Spatial; futuras telas negam por padrão.
@Injectable({ providedIn: 'root' })
export class PermissionContextService {
    loadForCurrentContext(): Observable<PermissionContextResponse> {
        return throwError(() => new Error('Resumo de permissões ainda não disponível.'));
    }

    refreshForCurrentContext() {
        return this.loadForCurrentContext();
    }

    clearCache() {
        localStorage.removeItem('dss_permission_context');
    }

    getSnapshot(): PermissionContextResponse | null {
        return null;
    }

    hasPermission(_permission: string) {
        void _permission;

        return false;
    }

    hasAnyPermission(permissions: string[]) {
        return permissions.length === 0;
    }

    hasAllPermissions(permissions: string[]) {
        return permissions.length === 0;
    }
}
