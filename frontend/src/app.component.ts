import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { PrimeNG } from 'primeng/config';

import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { UserContextService } from '@/app/core/services/user-context.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule, ToastModule],
    template: `
        <router-outlet></router-outlet>
        <p-toast position="top-right"></p-toast>
    `
})
export class AppComponent {
    private authSession = inject(AuthSessionService);
    private permissionContextService = inject(PermissionContextService);
    private userContextService = inject(UserContextService);
    private primengConfig = inject(PrimeNG);

    constructor() {
        this.authSession.initExpiryWarning();
        this.preloadPermissions();
        this.configureLocale();
    }

    private preloadPermissions() {
        const user = this.authSession.getUser();
        if (!user) {
            return;
        }

        if (!user.is_superuser && !this.userContextService.hasActiveContext()) {
            return;
        }

        this.permissionContextService.loadForCurrentContext().subscribe({
            error: () => {
                // Guard/component-level checks handle permission errors.
            }
        });
    }

    private configureLocale() {
        const lang = (navigator.language || 'en').toLowerCase();
        if (lang.startsWith('pt')) {
            this.primengConfig.setTranslation({
                startsWith: 'Comeca com',
                contains: 'Contem',
                notContains: 'Nao contem',
                endsWith: 'Termina com',
                equals: 'Igual',
                notEquals: 'Diferente',
                noFilter: 'Sem filtro',
                lt: 'Menor que',
                lte: 'Menor ou igual a',
                gt: 'Maior que',
                gte: 'Maior ou igual a',
                dateIs: 'Data igual',
                dateIsNot: 'Data diferente',
                dateBefore: 'Data antes',
                dateAfter: 'Data depois',
                clear: 'Limpar',
                apply: 'Aplicar',
                matchAll: 'Todas',
                matchAny: 'Qualquer',
                addRule: 'Adicionar regra',
                removeRule: 'Remover regra',
                accept: 'Sim',
                reject: 'Nao',
                choose: 'Escolher',
                upload: 'Enviar',
                cancel: 'Cancelar',
                dayNames: ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
                dayNamesShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
                dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
                monthNames: ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
                monthNamesShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
                today: 'Hoje',
                weekHeader: 'Sem',
                firstDayOfWeek: 0,
                dateFormat: 'dd/mm/yy'
            });
        }
    }
}
