import { Component, computed, inject } from '@angular/core';
import { LayoutService } from '@/app/layout/service/layout.service';

@Component({
    selector: '[app-footer]',
    standalone: true,
    template: `
        <div class="layout-footer">
            <div class="footer-logo-container">
                <img src="/layout/images/logo-{{ isDarkTheme() ? 'white' : 'dark' }}.svg" alt="poseidon-layout" />
                <span class="footer-app-name">Datasync GIS</span>
            </div>
            <span class="footer-copyright">&#169; Datasync - {{ currentYear }}</span>
        </div>
    `
})
export class AppFooter {
    layoutService = inject(LayoutService);
    readonly currentYear = new Date().getFullYear();

    isDarkTheme = computed(() => this.layoutService.isDarkTheme());
}
