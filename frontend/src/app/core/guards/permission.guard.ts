import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';

import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { PermissionGuardData } from '@/app/core/tokens/permission.types';

const CONTEXT_SELECTION_PATH = '/contexto/selecao';
const ACCESS_DENIED_PATH = '/landing/access';

interface ResolvedPermissionData {
    requiredAllPermissions: string[];
    requiredAnyPermissions: string[];
}

function resolvePermissionData(route: ActivatedRouteSnapshot): ResolvedPermissionData {
    const result: ResolvedPermissionData = {
        requiredAllPermissions: [],
        requiredAnyPermissions: []
    };

    for (const snapshot of route.pathFromRoot) {
        const data = (snapshot.data ?? {}) as PermissionGuardData;

        if (data.requiredPermission) {
            result.requiredAllPermissions = [data.requiredPermission];
        }

        if (Array.isArray(data.requiredAllPermissions)) {
            result.requiredAllPermissions = data.requiredAllPermissions;
        }

        if (Array.isArray(data.requiredAnyPermissions)) {
            result.requiredAnyPermissions = data.requiredAnyPermissions;
        }
    }

    return result;
}

export const permissionGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const authSession = inject(AuthSessionService);
    const permissionContext = inject(PermissionContextService);
    const userContextService = inject(UserContextService);

    if (!authSession.isAuthenticated()) {
        return router.createUrlTree(['/landing/login']);
    }

    const user = authSession.getUser();

    if (user?.is_superuser) {
        return true;
    }

    const { requiredAllPermissions, requiredAnyPermissions } = resolvePermissionData(route);

    if (requiredAllPermissions.length === 0 && requiredAnyPermissions.length === 0) {
        return true;
    }

    if (!userContextService.hasActiveContext()) {
        return router.createUrlTree([CONTEXT_SELECTION_PATH], {
            queryParams: { returnUrl: state.url }
        });
    }

    return permissionContext.loadForCurrentContext().pipe(
        map(() => {
            const hasAll = permissionContext.hasAllPermissions(requiredAllPermissions);
            const hasAny = permissionContext.hasAnyPermission(requiredAnyPermissions);

            return hasAll && hasAny
                ? true
                : router.createUrlTree([ACCESS_DENIED_PATH], {
                      queryParams: {
                          from: router.url,
                          denied: state.url
                      }
                  });
        }),
        catchError(() =>
            of(
                router.createUrlTree([CONTEXT_SELECTION_PATH], {
                    queryParams: { returnUrl: state.url }
                })
            )
        )
    );
};
