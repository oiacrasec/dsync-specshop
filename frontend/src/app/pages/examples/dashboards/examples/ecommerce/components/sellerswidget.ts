import { Component, QueryList, ViewChildren } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { CommonModule } from '@angular/common';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';

@Component({
    selector: 'sellers-widget',
    standalone: true,
    imports: [CommonModule, SectionCard, ButtonModule, MenuModule, AvatarModule],
    template: ` <section-card class="flex flex-col">
        <ng-template #title>Seller List</ng-template>
        <ng-template #action>
            <div>
                <p-button icon="pi pi-ellipsis-h" severity="secondary" text (onClick)="menu.toggle($event)" />
                <p-menu #menu [model]="items" popup="true" appendTo="body" />
            </div>
        </ng-template>
        <div class="flex-1 mt-6 flex flex-col justify-between gap-6">
            @for (item of sellerList; track item.name; let i = $index) {
                <div class="flex items-center gap-3">
                    <p-avatar [image]="item.image" class="w-10! h-10! rounded-lg! overflow-hidden!" />
                    <div class="flex-1 font-medium text-surface-950 dark:text-surface-0 line-clamp-1">{{ item.name }}</div>
                    <div class="inline-flex items-center gap-1">
                        <i class="pi pi-star-fill text-yellow-500"></i>
                        <span class="font-medium text-surface-950 dark:text-surface-0">{{ item.point }}</span>
                    </div>
                    <div>
                        <p-button icon="pi pi-ellipsis-h" severity="secondary" text (onClick)="toggleSellerListMenu(i, $event)" />
                        <p-menu #sellerListMenu [model]="items" popup="true" appendTo="body" />
                    </div>
                </div>
            }
        </div>
    </section-card>`
})
export class SellersWidget {
    sellerList = [
        {
            image: 'demo/images/avatars/avatar-m-1.png',
            name: 'Brook Simmons',
            point: '4.8',
            menuItems: {
                label: 'Options',
                items: [
                    {
                        label: 'Refresh',
                        icon: 'pi pi-refresh'
                    }
                ]
            }
        },
        {
            image: 'demo/images/avatars/avatar-f-1.png',
            name: 'Dianne Russell',
            point: '4.4',
            menuItems: {
                label: 'Options',
                items: [
                    {
                        label: 'Refresh',
                        icon: 'pi pi-refresh'
                    }
                ]
            }
        },
        {
            image: 'demo/images/avatars/avatar-m-2.png',
            name: 'Jacob Jones',
            point: '4.2',
            menuItems: {
                label: 'Options',
                items: [
                    {
                        label: 'Refresh',
                        icon: 'pi pi-refresh'
                    }
                ]
            }
        },
        {
            image: 'demo/images/avatars/avatar-m-3.png',
            name: 'Darrell Steward',
            point: '3.9',
            menuItems: {
                label: 'Options',
                items: [
                    {
                        label: 'Refresh',
                        icon: 'pi pi-refresh'
                    }
                ]
            }
        },
        {
            image: 'demo/images/avatars/avatar-f-2.png',
            name: 'Arlene McCoy',
            point: '3.8',
            menuItems: {
                label: 'Options',
                items: [
                    {
                        label: 'Refresh',
                        icon: 'pi pi-refresh'
                    }
                ]
            }
        }
    ];

    items = [
        {
            label: 'Options',
            items: [
                {
                    label: 'Refresh',
                    icon: 'pi pi-refresh'
                },
                {
                    label: 'Export',
                    icon: 'pi pi-upload'
                }
            ]
        }
    ];

    @ViewChildren('sellerListMenu') sellerListMenu!: QueryList<Menu>;

    toggleSellerListMenu(index: number, event: any) {
        const menusToToggle = this.sellerListMenu.toArray();
        menusToToggle[index].toggle(event);
    }
}
