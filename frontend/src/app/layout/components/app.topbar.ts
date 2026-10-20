import { Component, computed, ElementRef, inject, model, signal, ViewChild } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '@/app/layout/service/layout.service';
import { AppBreadcrumb } from './app.breadcrumb';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { RippleModule } from 'primeng/ripple';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { AvatarModule } from 'primeng/avatar';
import { FormsModule } from '@angular/forms';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { MessageService } from 'primeng/api';
import { finalize } from 'rxjs';

interface NotificationsBars {
    id: string;
    label: string;
    badge?: string | any;
}

@Component({
    selector: '[app-topbar]',
    standalone: true,
    imports: [RouterModule, CommonModule, FormsModule, StyleClassModule, AppBreadcrumb, InputTextModule, ButtonModule, IconFieldModule, InputIconModule, RippleModule, BadgeModule, OverlayBadgeModule, AvatarModule],
    template: ` <div class="layout-topbar">
        <div class="topbar-left">
            <img class="horizontal-logo" src="/layout/images/logo-white.svg" alt="logo" />
            @if (shouldShowBreadcrumb()) {
                <div app-breadcrumb></div>
            }
            <span class="topbar-separator"></span>
            <a tabindex="0" #menubutton type="button" class="menu-button" (click)="onMenuButtonClick()">
                <i class="pi pi-chevron-left"></i>
            </a>
            <a routerLink="/">
                <img class="mobile-logo" src="/layout/images/logo-{{ isDarkTheme() ? 'white' : 'dark' }}.svg" alt="logo" />
            </a>
        </div>

        <div class="topbar-right">
            <ul class="topbar-menu">
                <li class="right-sidebar-item">
                    <a class="right-sidebar-button" (click)="toggleSearchBar()">
                        <i class="pi pi-search"></i>
                    </a>
                </li>
                <li class="right-sidebar-item static sm:relative">
                    <a class="right-sidebar-button relative z-50" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveActiveClass="animate-fadeout" leaveToClass="hidden" [hideOnOutsideClick]="true">
                        <span class="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2.5"></span>
                        <i class="pi pi-bell"></i>
                    </a>
                    <div
                        class="list-none m-0 py-4 px-4 rounded-3xl border border-surface absolute bg-surface-0 dark:bg-surface-900 overflow-hidden hidden origin-top min-w-72 sm:w-[24rem] mt-2 right-0 z-50 top-auto shadow-[0px_56px_16px_0px_rgba(0,0,0,0.00),0px_36px_14px_0px_rgba(0,0,0,0.01),0px_20px_12px_0px_rgba(0,0,0,0.02),0px_9px_9px_0px_rgba(0,0,0,0.03),0px_2px_5px_0px_rgba(0,0,0,0.04)]"
                        style="right: -100px"
                    >
                        <div class="flex items-center gap-2 justify-between">
                            <span class="text-lg font-medium text-surface-950 dark:text-surface-0">Notifications</span>
                            <button pRipple class="text-surface-700 dark:text-surface-300 text-sm font-medium">Mark all as read</button>
                        </div>
                        <div class="my-2 shadow-custom-shadow border border-surface-200 dark:border-surface-800 bg-white/55 dark:bg-white/8 flex items-center gap-2 rounded-full p-1">
                            @for (item of notificationsBars(); track item.id; let i = $index) {
                                <button
                                    [ngClass]="{ 'bg-primary-100 dark:bg-primary-900': selectedNotificationBar() === item.id, 'hover:bg-primary-100/30 dark:hover:bg-primary-900/30': selectedNotificationBar() !== item.id }"
                                    class="rounded-full p-2 flex-1 flex items-center justify-center transition-all hover:cursor-pointer"
                                    (click)="selectedNotificationBar.set(item.id)"
                                >
                                    <span class="capitalize font-medium text-surface-950 dark:text-surface-0">{{ item.id }}</span>
                                </button>
                            }
                        </div>
                        <div class="mt-4 mb-8">
                            <p-icon-field>
                                <p-inputicon class="pi pi-search" />
                                <input pInputText [(ngModel)]="notificationSearch" placeholder="Search" class="w-full!" />
                            </p-icon-field>
                        </div>
                        <ul class="flex flex-col gap-8">
                            @for (item of selectedNotificationsBarData(); track item.name; let i = $index) {
                                <li class="flex gap-3">
                                    <div class="flex flex-col items-center gap-1">
                                        <p-overlay-badge value="" severity="danger" class="inline-flex">
                                            <p-avatar size="large">
                                                <img [src]="item.image" class="rounded-lg" />
                                            </p-avatar>
                                        </p-overlay-badge>
                                        <span class="flex-1 w-px bg-surface-200 dark:bg-surface-800"></span>
                                    </div>
                                    <div class="flex-1 pt-2 space-y-2">
                                        <div class="flex items-center justify-between gap-2">
                                            <span class="font-medium text-surface-950 dark:text-surface-0">{{ item.name }}</span>
                                            <div class="text-sm text-surface-700 dark:text-surface-200 flex items-center gap-1">
                                                {{ item.time }}
                                                @if (!item.read) {
                                                    <div class="w-2! h-2! rounded-full bg-green-500"></div>
                                                }
                                            </div>
                                        </div>
                                        <div class="p-2 bg-surface-100 dark:bg-surface-800 border border-surface rounded-lg">
                                            <p class="text-sm text-surface-700 dark:text-surface-200 line-clamp-2 text-ellipsis">
                                                {{ item.description }}
                                            </p>
                                        </div>
                                        @if (item.attachment) {
                                            <div class="p-2 bg-surface-100 dark:bg-surface-800 border border-surface rounded-lg flex items-start gap-3">
                                                <div class="w-8 h-8 flex items-center justify-center rounded-md shadow-sm bg-surface-0 dark:bg-surface-950">
                                                    <i class="pi pi-file-pdf text-primary"></i>
                                                </div>
                                                <div class="flex-1 flex flex-col gap-0.5">
                                                    <span class="text-sm font-medium text-surface-700 dark:text-surface-200">{{ item.attachment.title }}</span>
                                                    <span class="text-xs text-surface-700 dark:text-surface-200">{{ item.attachment.size }}</span>
                                                </div>
                                                <p-button icon="pi pi-download" severity="contrast" class="w-8! h-8! p-0!"></p-button>
                                            </div>
                                        }
                                    </div>
                                </li>
                            }
                        </ul>
                    </div>
                </li>
                <li class="profile-item static sm:relative">
                    <a class="right-sidebar-button relative z-50" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveActiveClass="animate-fadeout" leaveToClass="hidden" [hideOnOutsideClick]="true">
                        <p-avatar class="w-10! h-10!">
                            <img src="/layout/images/profile.jpg" />
                        </p-avatar>
                    </a>
                    <div
                        class="list-none p-2 m-0 rounded-2xl border border-surface overflow-hidden absolute bg-surface-0 dark:bg-surface-900 hidden origin-top w-52 mt-2 right-0 z-999 top-auto shadow-[0px_56px_16px_0px_rgba(0,0,0,0.00),0px_36px_14px_0px_rgba(0,0,0,0.01),0px_20px_12px_0px_rgba(0,0,0,0.02),0px_9px_9px_0px_rgba(0,0,0,0.03),0px_2px_5px_0px_rgba(0,0,0,0.04)]"
                    >
                        <ul class="flex flex-col gap-1">
                            @if (canSwitchContext()) {
                                <li>
                                    <a class="label-small dark:text-surface-400 flex gap-2 py-2 px-2.5 rounded-lg items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer" (click)="switchContext($event)">
                                        <i class="pi pi-sitemap"></i>
                                        <span>Trocar organização</span>
                                    </a>
                                </li>
                            }
                            <li>
                                <a class="label-small dark:text-surface-400 flex gap-2 py-2 px-2.5 rounded-lg items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer">
                                    <i class="pi pi-user"></i>
                                    <span>Perfil</span>
                                </a>
                            </li>
                            <li>
                                <a class="label-small dark:text-surface-400 flex gap-2 py-2 px-2.5 rounded-lg items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer">
                                    <i class="pi pi-calendar"></i>
                                    <span>Agenda</span>
                                </a>
                            </li>
                            <li>
                                <a routerLink="/documentacoes" class="label-small dark:text-surface-400 flex gap-2 py-2 px-2.5 rounded-lg items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer">
                                    <i class="pi pi-book"></i>
                                    <span>Documentações</span>
                                </a>
                            </li>
                            <li>
                                <a routerLink="/configuracoes" class="label-small dark:text-surface-400 flex gap-2 py-2 px-2.5 rounded-lg items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer">
                                    <i class="pi pi-cog"></i>
                                    <span>Configurações</span>
                                </a>
                            </li>
                            <li>
                                <a class="label-small dark:text-surface-400 flex gap-2 py-2 px-2.5 rounded-lg items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer" (click)="logout($event)">
                                    <i class="pi pi-power-off"></i>
                                    <span>Sair</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </li>
            </ul>
        </div>
    </div>`
})
export class AppTopbar {
    layoutService = inject(LayoutService);
    private authSession = inject(AuthSessionService);
    private permissionContext = inject(PermissionContextService);
    private router = inject(Router);
    private messages = inject(MessageService);
    private leaving = false;

    isDarkTheme = computed(() => this.layoutService.isDarkTheme());

    @ViewChild('menubutton') menuButton!: ElementRef;

    notificationSearch = '';

    notificationsBars = signal<NotificationsBars[]>([
        {
            id: 'inbox',
            label: 'Inbox',
            badge: '2'
        },
        {
            id: 'general',
            label: 'General'
        },
        {
            id: 'archived',
            label: 'Archived'
        }
    ]);

    notifications = signal<any[]>([
        {
            id: 'inbox',
            data: [
                {
                    image: '/demo/images/avatar/avatar-square-m-2.jpg',
                    name: 'Michael Lee',
                    description: 'You have a new message from the support team regarding your recent inquiry.',
                    time: '1 hour ago',
                    attachment: {
                        title: 'Contract',
                        size: '2.1 MB'
                    },
                    read: false
                },
                {
                    image: '/demo/images/avatar/avatar-square-f-1.jpg',
                    name: 'Alice Johnson',
                    description: 'Your report has been successfully submitted and is under review.',
                    time: '10 minutes ago',
                    read: true
                },
                {
                    image: '/demo/images/avatar/avatar-square-f-2.jpg',
                    name: 'Emily Davis',
                    description: 'The project deadline has been updated to September 30th. Please check the details.',
                    time: 'Yesterday at 4:35 PM',
                    read: false
                }
            ]
        },
        {
            id: 'general',
            data: [
                {
                    image: '/demo/images/avatar/avatar-square-f-1.jpg',
                    name: 'Alice Johnson',
                    description: 'Reminder: Your subscription is about to expire in 3 days. Renew now to avoid interruption.',
                    time: '30 minutes ago',
                    read: true
                },
                {
                    image: '/demo/images/avatar/avatar-square-m-2.jpg',
                    name: 'Michael Lee',
                    description: 'The server maintenance has been completed successfully. No further downtime is expected.',
                    time: 'Yesterday at 2:15 PM',
                    read: false
                }
            ]
        },
        {
            id: 'archived',
            data: [
                {
                    image: '/demo/images/avatar/avatar-square-m-1.jpg',
                    name: 'Lucas Brown',
                    description: 'Your appointment with Dr. Anderson has been confirmed for October 12th at 10:00 AM.',
                    time: '1 week ago',
                    read: false
                },
                {
                    image: '/demo/images/avatar/avatar-square-f-2.jpg',
                    name: 'Emily Davis',
                    description: 'The document you uploaded has been successfully archived for future reference.',
                    time: '2 weeks ago',
                    read: true
                }
            ]
        }
    ]);

    selectedNotificationBar = model(this.notificationsBars()[0].id ?? 'inbox');

    selectedNotificationsBarData = computed(() => this.notifications().find((f) => f.id === this.selectedNotificationBar()).data);

    shouldShowBreadcrumb() {
        let current: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;

        while (current) {
            if (current.data?.['hideBreadcrumbBar'] === true) {
                return false;
            }

            current = current.firstChild ?? null;
        }

        return true;
    }

    onMenuButtonClick() {
        this.layoutService.onMenuToggle();
    }

    showRightMenu() {
        this.layoutService.toggleRightMenu();
    }

    toggleSearchBar() {
        this.layoutService.layoutState.update((value) => ({ ...value, searchBarActive: !value.searchBarActive }));
    }

    logout(event: Event) {
        event.preventDefault();

        if (this.leaving) {
            return;
        }

        this.leaving = true;
        this.permissionContext.clearCache();
        this.authSession
            .logout()
            .pipe(
                finalize(() => {
                    this.leaving = false;
                    void this.router.navigateByUrl('/landing/login');
                })
            )
            .subscribe({
                error: () => this.messages.add({ severity: 'warn', summary: 'Sessão encerrada neste navegador', detail: 'Não foi possível confirmar a revogação no servidor.' })
            });
    }

    switchContext(event: Event) {
        event.preventDefault();
        const currentUrl = this.router.url || '/dashboards';

        this.router.navigate(['/contexto/selecao'], { queryParams: { returnUrl: currentUrl } });
    }

    canSwitchContext() {
        return !this.authSession.getUser()?.is_superuser;
    }
}
