import { Component } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { CommonModule } from '@angular/common';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';

@Component({
    selector: 'product-list-widget',
    standalone: true,
    imports: [CommonModule, SectionCard, ButtonModule, MenuModule, AvatarModule],
    template: ` <section-card class="flex flex-col">
        <ng-template #title>Product List</ng-template>
        <ng-template #action>
            <div>
                <p-button icon="pi pi-ellipsis-h" severity="secondary" text (onClick)="menu.toggle($event)" />
                <p-menu #menu [model]="items" popup="true" appendTo="body" />
            </div>
        </ng-template>
        <div class="flex-1 mt-6 flex flex-col justify-between gap-6">
            @for (item of productList; track item.product) {
                <div class="flex items-center gap-3">
                    <p-avatar [image]="item.image" class="w-10! h-10! rounded-lg! overflow-hidden!" />
                    <div class="flex-1">
                        <div class="font-medium text-surface-950 dark:text-surface-0">{{ item.product }}</div>
                        <div class="mt-px text-sm text-surface-500 dark:text-white/40">{{ item.owner }}</div>
                    </div>
                    <span>
                        @if (item.status === 'success') {
                            <i class="pi pi-arrow-up-right text-green-600"></i>
                        } @else {
                            <i class="pi pi-arrow-down-left text-red-600"></i>
                        }
                    </span>
                </div>
            }
        </div>
    </section-card>`
})
export class ProductListWidget {
    productList = [
        {
            product: 'iPhone 16 Pro',
            owner: 'Jerome Bell',
            image: 'demo/images/ecommerce-productlist-1.png',
            status: 'success'
        },
        {
            product: 'iPhone 15 Pro',
            owner: 'Amelia White',
            image: 'demo/images/ecommerce-productlist-2.png',
            status: 'danger'
        },
        {
            product: 'Apple Watch 10',
            owner: 'Oliver Smith',
            image: 'demo/images/ecommerce-productlist-3.png',
            status: 'success'
        },
        {
            product: 'AirPods 4',
            owner: 'Sophia Johnson',
            image: 'demo/images/ecommerce-productlist-4.png',
            status: 'danger'
        },
        {
            product: 'Apple Watch 9',
            owner: 'Liam Brown',
            image: 'demo/images/ecommerce-productlist-5.png',
            status: 'success'
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
}
