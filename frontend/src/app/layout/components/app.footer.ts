import { Component, computed, inject } from '@angular/core';
import { LayoutService } from '@/app/layout/service/layout.service';
import { APP_BRAND } from '@/app/core/tokens/app-brand';

@Component({
    selector: '[app-footer]',
    standalone: true,
    template: `
        <div class="layout-footer">
            <div class="footer-logo-container">
                <img src="/layout/images/logo-{{ isDarkTheme() ? 'white' : 'dark' }}.svg" alt="" />
                <span class="footer-app-name">{{ brand.name }}</span>
            </div>
            <span class="footer-copyright">&#169; {{ brand.company }} - {{ currentYear }}</span>
        </div>
    `
})
export class AppFooter {
    layoutService = inject(LayoutService);
    readonly brand = inject(APP_BRAND);
    readonly currentYear = new Date().getFullYear();

    isDarkTheme = computed(() => this.layoutService.isDarkTheme());
}
