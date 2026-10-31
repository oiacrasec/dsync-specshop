import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { PrimeNG } from 'primeng/config';

import { AuthSessionService } from '@/app/core/services/auth-session.service';

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
    private primengConfig = inject(PrimeNG);

    constructor() {
        // Inicializa a sessão e a sincronização entre abas; sem polling de auth/permissões.
        inject(AuthSessionService);
        this.configureLocale();
    }

    private configureLocale() {
        const lang = (navigator.language || 'en').toLowerCase();

        if (lang.startsWith('pt')) {
            this.primengConfig.setTranslation({
                startsWith: 'Começa com',
                contains: 'Contém',
                notContains: 'Não contém',
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
                reject: 'Não',
                choose: 'Escolher',
                upload: 'Enviar',
                cancel: 'Cancelar',
                dayNames: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
                dayNamesShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
                dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
                monthNames: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
                monthNamesShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
                today: 'Hoje',
                weekHeader: 'Sem',
                firstDayOfWeek: 0,
                dateFormat: 'dd/mm/yy'
            });
        }
    }
}
