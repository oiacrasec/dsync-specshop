import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { PreferencesService } from '@/app/core/services/preferences.service';

// Telas sem sessão: aparência padrão; a do usuário vem da tela de Configurações após entrar.
@Component({
    selector: 'app-auth-layout',
    standalone: true,
    imports: [RouterModule],
    template: `
        <main>
            <router-outlet></router-outlet>
        </main>
    `
})
export class AuthLayout implements OnInit {
    private preferences = inject(PreferencesService);

    ngOnInit() {
        this.preferences.resetToDefault();
    }
}
