import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LogoWidget } from './logowidget';

@Component({
    selector: 'topbar-widget',
    standalone: true,
    imports: [CommonModule, RouterLink, LogoWidget],
    template: `
        <section>
            <nav
                class="landing-container fixed top-4 left-1/2 -translate-x-1/2 w-full z-1000 transition-all duration-300"
                [ngClass]="{
                    'md:min-w-[360px] max-w-[320px] md:max-w-[720px] lg:max-w-[900px]': !isAtTop(),
                    'max-w-full!': openMobileMenu()
                }"
            >
                <div
                    #nav
                    class="py-4 pl-4 md:pl-7 pr-4 rounded-3xl lg:rounded-full border border-transparent transition-all duration-300"
                    [ngClass]="{
                        'backdrop-blur-[90px] border-surface-200 dark:border-white/10 bg-white/64 dark:bg-white/12! shadow-[0px_85px_24px_0px_rgba(0,0,0,0.00),0px_55px_22px_0px_rgba(0,0,0,0.01),0px_31px_18px_0px_rgba(0,0,0,0.02),0px_14px_14px_0px_rgba(0,0,0,0.03),0px_3px_8px_0px_rgba(0,0,0,0.04)] md:shadow-none':
                            openMobileMenu(),
                        'backdrop-blur-[90px] border-surface-200 dark:border-white/10s bg-white/64 dark:bg-white/12! shadow-sm': !isAtTop()
                    }"
                >
                    <div class="flex items-center justify-between">
                        <div class="flex-1 flex">
                            <a routerLink="/landing" class="w-fit">
                                <logo-widget></logo-widget>
                            </a>
                        </div>
                        <ul class="flex-none hidden md:flex items-center gap-2">
                            @for (nav of navs; track nav.name) {
                                <li>
                                    <a [routerLink]="nav.to" [ngClass]="activeRouteName() === nav.name ? '' : 'hover:button'" class="px-4! py-2!">
                                        {{ nav.label }}
                                    </a>
                                </li>
                            }
                        </ul>
                        <div class="flex-1 hidden md:flex items-center justify-end gap-4">
                            <a routerLink="/landing/login" class="button py-2 px-4 min-w-20"> Login </a>
                            <a routerLink="/landing/register" class="button-primary py-2 px-4 min-w-20"> Register </a>
                        </div>
                        <button
                            (click)="toggleMobileMenu()"
                            class="flex md:hidden items-center justify-center rounded-lg text-surface-950 dark:text-surface-0 w-9 h-9 border border-surface-200 dark:border-white/10 hover:bg-surface-100 dark:hover:bg-white/10 transition-all"
                        >
                            <i class="leading-none" [ngClass]="openMobileMenu() ? 'pi pi-times ' : 'pi pi-bars '"></i>
                        </button>
                    </div>
                    <div class="md:hidden block transition-all duration-300 ease-out overflow-hidden" [style.maxHeight]="maxHeightStyle()" [ngClass]="openMobileMenu() ? 'mt-8 opacity-100' : 'opacity-0'">
                        <div #menuContent class="flex flex-col gap-8 transition-all">
                            <ul class="flex flex-col gap-2">
                                @for (nav of navs; track nav.name) {
                                    <li>
                                        <a
                                            [routerLink]="nav.to"
                                            (click)="openMobileMenu.set(false)"
                                            [ngClass]="activeRouteName() === nav.name ? ' w-full bg-white dark:bg-white/10 border-surface dark:border-white/10' : ' '"
                                            class="button py-2 bg-transparent shadow-none hover:bg-white dark:hover:bg-white/10 hover:shadow-sm border border-transparent hover:border-surface dark:hover:border-white/10"
                                        >
                                            {{ nav.label }}
                                        </a>
                                    </li>
                                }
                            </ul>
                            <div class="flex flex-col items-center gap-4">
                                <a routerLink="/landing/login" class="button py-2 w-full border dark:border-white/10"> Login </a>
                                <a routerLink="/landing/register" class="button-primary w-full py-2"> Register </a>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </section>
    `
})
export class TopbarWidget {
    private router = inject(Router);
    private elRef = inject(ElementRef);

    openMobileMenu = signal(false);
    isAtTop = signal(true);
    activeRouteName = signal('');

    menuContent = viewChild<ElementRef<HTMLDivElement>>('menuContent');

    navs = [
        { name: 'about', label: 'About', to: '/landing/about' },
        { name: 'pricing', label: 'Pricing', to: '/landing/pricing' },
        { name: 'contact', label: 'Contact', to: '/landing/contact' }
    ];

    maxHeightStyle = computed(() => {
        if (this.openMobileMenu()) {
            const content = this.menuContent();
            return content ? `${content.nativeElement.scrollHeight}px` : '0px';
        }
        return '0px';
    });

    private handleScroll = () => {
        this.isAtTop.set(window.scrollY === 0);
    };

    constructor() {
        afterNextRender(() => {
            this.activeRouteName.set(this.router.url);
            this.isAtTop.set(window.scrollY === 0);
            window.addEventListener('scroll', this.handleScroll);
        });
    }

    toggleMobileMenu() {
        this.openMobileMenu.update((v) => !v);
    }

    @HostListener('document:click', ['$event'])
    handleClickOutside(event: Event) {
        const navElement = this.elRef.nativeElement;
        if (navElement && !navElement.contains(event.target)) {
            this.openMobileMenu.set(false);
        }
    }

    ngOnDestroy() {
        window.removeEventListener('scroll', this.handleScroll);
    }
}
