import { Component } from '@angular/core';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MeterGroupModule } from 'primeng/metergroup';

@Component({
    selector: 'traffic-widget',
    standalone: true,
    imports: [CommonModule, FormsModule, SectionCard, SelectModule, MeterGroupModule],
    template: ` <section-card class="xl:col-span-1 flex flex-col">
        <ng-template #title>Traffic</ng-template>
        <ng-template #action>
            <p-select [(ngModel)]="selectedTrafficMeterRange" [options]="trafficMeterRanges" optionLabel="name" placeholder="Select a Range" class="w-28" />
        </ng-template>
        <p-meter-group [value]="traffic" labelPosition="end" class="mt-6 flex-1">
            <ng-template #meter let-value let-class="class" let-width="size" let-index="index">
                <span [ngClass]="[class, index === 0 ? 'rounded-r-sm rounded-l-full' : 'rounded-sm ml-px']" [style]="{ background: value.color, width: width }"></span>
            </ng-template>
            <ng-template #label let-value>
                <div class="flex-1 flex flex-col justify-between gap-4">
                    @for (val of value; track val.label) {
                        <div class="flex items-center gap-2">
                            <span
                                class="w-2 h-2 rounded-full border border-surface-0 dark:border-surface-950 shadow-[0px_3px_1px_0px_rgba(0,0,0,0.00),0px_2px_1px_0px_rgba(0,0,0,0.01),0px_1px_1px_0px_rgba(0,0,0,0.02),0px_0px_1px_0px_rgba(0,0,0,0.03)]"
                                [style]="{ background: val.color }"
                            ></span>
                            <span class="flex-1 text-surface-600 dark:text-white/64">{{ val.label }}</span>
                            <span class="font-medium text-surface-950 dark:text-surface-0">{{ val.value }}%</span>
                        </div>
                    }
                </div>
            </ng-template>
        </p-meter-group>
    </section-card>`
})
export class TrafficWidget {
    selectedTrafficMeterRange = { name: 'Yearly', unit: 'year' };

    trafficMeterRanges = [
        { name: 'Weekly', unit: 'week' },
        { name: 'Monthly', unit: 'month' },
        { name: 'Quarter', unit: 'quarter' },
        { name: 'Yearly', unit: 'year' }
    ];

    traffic = [
        { label: 'Facebook', color: '#F59E0B', value: 22 },
        { label: 'Twitter', color: '#677489', value: 5 },
        { label: 'Instagram', color: '#22C55E', value: 15 },
        { label: 'Reddit', color: '#84CC16', value: 7 },
        { label: 'Shopify', color: '#14B8A6', value: 8 },
        { label: 'eBay', color: '#EAB308', value: 11 }
    ];
}
