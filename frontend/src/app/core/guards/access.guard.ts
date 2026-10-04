import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { ACCESS_AUDIENCE, AccessAudience, AccessGuardData } from '@/app/core/tokens/access.types';

const CONTEXT_SELECTION_PATH = '/contexto/selecao';
const FIRST_ACCESS_PASSWORD_PATH = '/primeiro-acesso/trocar-senha';
const ADMIN_HOME_PATH = '/kpi';

function resolveGuardData(route: ActivatedRouteSnapshot): Required<AccessGuardData> {
    let audience: AccessAudience = ACCESS_AUDIENCE.AUTHENTICATED;
    let requireContext = false;

    for (const snapshot of route.pathFromRoot) {
        const data = (snapshot.data ?? {}) as AccessGuardData;

        if (data.audience) {
            audience = data.audience;
        }

        if (typeof data.requireContext === 'boolean') {
            requireContext = data.requireContext;
        }
    }

    return { audience, requireContext };
}

export const accessGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const authSession = inject(AuthSessionService);
    const userContextService = inject(UserContextService);

    if (!authSession.isAuthenticated()) {
        return router.createUrlTree(['/landing/login']);
    }

    const user = authSession.getUser();
    const isSuperuser = !!user?.is_superuser;
    const mustChangePassword = !!user?.must_change_password;
    const { audience, requireContext } = resolveGuardData(route);

    if (!isSuperuser && mustChangePassword) {
        if (state.url.startsWith(FIRST_ACCESS_PASSWORD_PATH)) {
            return true;
        }

        return router.createUrlTree([FIRST_ACCESS_PASSWORD_PATH], {
            queryParams: { returnUrl: state.url }
        });
    }

    if (audience === ACCESS_AUDIENCE.ADMIN && !isSuperuser) {
        return router.createUrlTree(['/notfound']);
    }

    if (audience === ACCESS_AUDIENCE.COMMON && isSuperuser) {
        return router.createUrlTree([ADMIN_HOME_PATH]);
    }

    if (requireContext && !isSuperuser && !userContextService.hasActiveContext()) {
        if (state.url.startsWith(CONTEXT_SELECTION_PATH)) {
            return true;
        }

        return router.createUrlTree([CONTEXT_SELECTION_PATH], {
            queryParams: { returnUrl: state.url }
        });
    }

    return true;
};
