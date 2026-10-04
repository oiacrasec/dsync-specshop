import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoWidget } from './logowidget';

@Component({
    selector: 'footer-widget',
    standalone: true,
    imports: [CommonModule, RouterLink, LogoWidget],
    template: `
        <div class="relative z-20 landing-container mx-auto md:pt-20 md:pb-14 py-8">
            <footer class="flex items-center justify-between md:flex-row flex-col gap-8 md:gap-0">
                <div class="flex items-center md:flex-row flex-col gap-8 md:gap-0">
                    <a routerLink="/">
                        <logo-widget />
                    </a>
                    <div class="h-4 w-px bg-surface-200 dark:bg-surface-800 mx-4 md:block hidden"></div>
                    <ul class="flex items-center gap-4">
                        @for (nav of navs; track $index) {
                            <li>
                                <a [routerLink]="nav.to" class="body-small hover:underline">
                                    {{ nav.label }}
                                </a>
                            </li>
                        }
                    </ul>
                </div>
                <ul class="flex items-center gap-2">
                    @for (data of socials; track $index) {
                        <li>
                            <a
                                [href]="data.to"
                                target="_blank"
                                class="px-4 py-2 rounded-full border border-surface-200 dark:border-surface-800 text-surface-950 dark:text-surface-0 flex items-center justify-center hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
                            >
                                <i [class]="data.icon" class="text-md leading-none"></i>
                            </a>
                        </li>
                    }
                </ul>
            </footer>
            <div class="w-full h-px bg-surface-200 dark:bg-surface-800 my-7 md:my-4"></div>
            <div class="text-center body-small">© {{ currentYear }} PrimeTek</div>
        </div>
    `
})
export class FooterWidget {
    currentYear: number = new Date().getFullYear();

    navs = [
        { to: '', label: 'Product' },
        { to: '', label: 'Contact' },
        { to: '', label: 'Login' },
        { to: '', label: 'Register' }
    ];

    socials = [
        { to: '#', icon: 'pi pi-youtube' },
        { to: '#', icon: 'pi pi-twitter' },
        { to: '#', icon: 'pi pi-discord' }
    ];
}
