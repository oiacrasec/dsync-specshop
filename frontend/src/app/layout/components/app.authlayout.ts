import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '@/app/layout/service/layout.service';

@Component({
    selector: 'auth-layout',
    standalone: true,
    imports: [RouterModule, AppConfigurator],
    template: `
        <main>
            <router-outlet></router-outlet>
        </main>
        <button class="layout-config-button config-link" (click)="layoutService.toggleConfigSidebar()">
            <i class="pi pi-cog"></i>
        </button>
        <app-configurator location="landing" />
    `
})
export class AuthLayout {
    layoutService: LayoutService = inject(LayoutService);
}
