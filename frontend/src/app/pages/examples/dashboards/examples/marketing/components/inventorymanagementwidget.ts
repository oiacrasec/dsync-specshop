import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';

@Component({
    selector: 'inventory-management-widget',
    standalone: true,
    imports: [CommonModule, SectionCard],
    template: ` <section-card class="flex flex-col gap-6 w-full">
        <ng-template #title>Inventory Management</ng-template>
        <div class="flex-1 flex flex-col">
            <div class="flex flex-wrap gap-4 items-center justify-between">
                @for (item of inventoryManagementHeader; track item.title) {
                    <div class="flex gap-2">
                        <div
                            [ngStyle]="{ background: itemBackgroundColor(item) }"
                            class="w-2 rounded-full shadow-[0px_3px_1px_0px_rgba(0,0,0,0.00),0px_2px_1px_0px_rgba(0,0,0,0.01),0px_1px_1px_0px_rgba(0,0,0,0.02),0px_0px_1px_0px_rgba(0,0,0,0.03)]"
                        ></div>
                        <div>
                            <div class="inline-flex items-center gap-1">
                                <span class="text-2xl font-medium text-surface-950 dark:text-surface-0">{{ item.value }}</span>
                                <span [ngClass]="item.status === 'success' ? 'text-green-600' : 'text-red-600'" class="text-sm font-medium inline-flex gap-1 items-center">
                                    <i class="pi text-sm!" [ngClass]="item.status === 'success' ? 'pi-arrow-up-right' : 'pi-arrow-down-left'"></i>
                                    <span class="flex-1">{{ item.change }}</span>
                                </span>
                            </div>
                            <div class="mt-1 text-sm text-surface-500 dark:text-white/64">{{ item.title }}</div>
                        </div>
                    </div>
                }
            </div>
            <div class="mt-8 flex-1 flex flex-col justify-between gap-3">
                @for (item of inventoryManagementData; track item.x) {
                    <div class="flex items-center gap-3">
                        <span class="text-sm text-surface-400 dark:text-white/64 w-7">{{ item.x }}</span>
                        <div
                            class="h-4 flex-1 flex rounded overflow-hidden bg-primary-100/36 dark:bg-white/6 shadow-[inset_0px_3px_6px_0px_color-mix(in_srgb,var(--p-primary-300)_60%,transparent_40%)] dark:shadow-[0px_1px_6px_0px_rgba(255,255,255,0.24)_inset]"
                        >
                            @for (x of item.y; track x; let j = $index) {
                                <div
                                    class="h-full shadow-[0px_0px_10px_0px_rgba(0,0,0,0.03)_inset]"
                                    [ngClass]="j === item.y.length - 1 ? 'rounded-r' : ''"
                                    [ngStyle]="{ width: (100 * x) / inventoryManagementDataMax + '%', background: backgroundColor(j) }"
                                ></div>
                            }
                        </div>
                    </div>
                }
            </div>
        </div>
    </section-card>`,
    host: {
        class: 'flex h-full w-full'
    }
})
export class InventoryManagementWidget {
    inventoryManagementDataMax = 500;

    inventoryManagementData = [
        {
            x: '500',
            y: [123, 87, 156]
        },
        {
            x: '400',
            y: [98, 175, 43]
        },
        {
            x: '300',
            y: [54, 129, 190]
        },
        {
            x: '200',
            y: [88, 144, 72]
        },
        {
            x: '100',
            y: [67, 192, 35]
        }
    ];

    inventoryManagementHeader = [
        {
            title: 'Stock Status',
            value: '22.543',
            change: '24%',
            status: 'success',
            color: 'primary-color'
        },
        {
            title: 'Inventory Turnover',
            value: '17.472',
            change: '28%',
            status: 'success',
            color: 'orange-500'
        },
        {
            title: 'Products Ordered',
            value: '19.582',
            change: '22%',
            status: 'success',
            color: 'yellow-500'
        }
    ];

    backgroundColor(j: number) {
        return `var(--p-${this.inventoryManagementHeader[j].color})`;
    }

    itemBackgroundColor(item: any) {
        return `var(--p-${item.color})`;
    }
}
