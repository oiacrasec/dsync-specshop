import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { generateRandomData } from '@/app/lib/utils';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { BarChart } from '@/app/pages/examples/dashboards/examples/ui/charts/barchart';

@Component({
    selector: 'overview-widget',
    standalone: true,
    imports: [CommonModule, SectionCard, BarChart],
    template: ` <section-card class="flex-1 flex flex-col">
        <ng-template #title>
            <h4>Overview</h4>
        </ng-template>
        <ng-template #action>
            <div class="flex items-center gap-2">
                <div class="px-3 py-1 rounded-full bg-surface-0 dark:bg-white/10 border border-surface dark:border-white/8 inline-flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-primary-500"></span>
                    <span class="text-sm font-medium text-surface-950 dark:text-surface-0">Revenue</span>
                </div>
            </div>
        </ng-template>
        <div class="card flex-1 mt-6 w-full overflow-auto">
            <bar-chart [label]="'Revenue'" [dataset]="randomData" tooltipPrefix="$" [option]="'month'" class="min-w-[640px] max-h-80 flex-1 h-full w-full cursor-pointer" [stepSize]="10000" />
        </div>
    </section-card>`,
    host: {
        style: 'display: contents'
    }
})
export class OverviewWidget {
    randomData = generateRandomData('2020-10-27T00:00:00', '2023-11-03T00:00:00', 4, 10000, 50000);
}
