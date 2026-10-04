import { Component } from '@angular/core';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { generateRandomMultiData } from '@/app/lib/utils';
import { MultiLineChart } from '@/app/pages/examples/dashboards/examples/ui/charts/multilinechart';

@Component({
    selector: 'top-products-widget',
    standalone: true,
    imports: [CommonModule, FormsModule, SelectModule, SectionCard, MultiLineChart],
    template: ` <app-section-card class="xl:flex-1 xl:col-span-2 flex flex-col">
        <ng-template #title>Top Products</ng-template>
        <ng-template #action>
            <p-select [(ngModel)]="selectedTopProductChartRange" [options]="topProductChartRanges" optionLabel="name" placeholder="Select a Range" class="w-28" />
        </ng-template>
        <div class="flex-1 w-full overflow-auto mt-5">
            <multi-line-chart [datasets]="randomData" [labels]="labels" [bgColors]="bgColors" [borderColors]="borderColors" [option]="selectedTopProductChartRange.unit" class="min-w-104 min-h-72" />
        </div>
    </app-section-card>`,
    host: {
        style: 'display: contents;'
    }
})
export class TopProductsWidget {
    randomData = generateRandomMultiData('2020-10-27T00:00:00', '2023-11-03T00:00:00', 4, 2000, 3000, 2, true);

    topProductChartRanges = [
        { name: 'Weekly', unit: 'week' },
        { name: 'Monthly', unit: 'month' },
        { name: 'Quarter', unit: 'quarter' },
        { name: 'Yearly', unit: 'year' }
    ];

    selectedTopProductChartRange = { name: 'Yearly', unit: 'year' };

    bgColors = [
        ['rgba(37, 99, 235, 0.12)', 'rgba(37, 99, 235, 0)'],
        ['rgba(234, 127, 51, 0.15)', 'rgba(234, 127, 51, 0)']
    ];

    borderColors = ['rgba(37, 99, 235, 1)', 'rgba(234, 127, 51, 1)'];

    labels = ['Income', 'Expenses'];
}
