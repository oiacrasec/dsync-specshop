import { Component } from '@angular/core';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { TagModule } from 'primeng/tag';
import { trackByFn } from '@/app/lib/utils';
import { MiniLineChart } from '@/app/pages/examples/dashboards/examples/ui/charts/minilinechart';

@Component({
    selector: 'stats-widget',
    standalone: true,
    imports: [SectionCard, TagModule, MiniLineChart],
    template: ` <app-section-card class="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 justify-between p-0">
        @for (item of statsData; track trackByFn()) {
            <div class="sm:flex-1 flex xl:flex-row flex-col items-center gap-6 sm:odd:border-r md:last:border-none md:even:border-r p-6 md:last:mr-0 border-surface-200 dark:border-surface-800">
                <div class="lg:flex-1 w-full">
                    <div class="text-sm text-surface-500 dark:text-white/64">{{ item.title }}</div>
                    <div class="flex items-center gap-1 mt-2">
                        <span class="text-xl font-medium text-surface-950 dark:text-surface-0">{{ item.value }}</span>
                        <p-tag [severity]="status(item)" [value]="item.change" />
                    </div>
                </div>
                <mini-line-chart class="max-h-16! min-w-[60px] h-full lg:flex-1 w-full [&_canvas]:w-full!" [data]="item.data" [bgColor]="item?.bgColor" [borderColor]="item?.borderColor" />
            </div>
        }
    </app-section-card>`
})
export class StatsWidget {
    protected readonly trackByFn = trackByFn;

    statsData = [
        {
            title: 'Revenue Status',
            value: '12.030',
            status: 'success',
            change: '27%',
            data: [10000, 14000, 20000, 16000, 18000, 20000, 16000, 14500, 18000],
            bgColor: ['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0)'],
            borderColor: 'rgba(59, 130, 246, 1)'
        },
        {
            title: 'Page View',
            value: '5592',
            status: 'success',
            change: '12%',
            data: [5000, 7500, 9000, 8500, 7000, 6000, 8000, 9500, 7200],
            bgColor: ['rgba(249, 115, 22, 0.15)', 'rgba(249, 115, 22, 0)'],
            borderColor: 'rgba(249, 115, 22, 1)'
        },
        {
            title: 'Bounce Rate',
            value: '55.65%',
            status: 'danger',
            change: '22%',
            data: [28000, 25000, 27000, 24000, 23000, 26000, 25000, 22000, 20000],
            bgColor: ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0)'],
            borderColor: 'rgba(239, 68, 68, 1)'
        },
        {
            title: 'Product Sale Rate',
            value: '12.56%',
            status: 'success',
            change: '17%',
            data: [15000, 12000, 18000, 22000, 14000, 11000, 25000, 20000, 17000],
            bgColor: ['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0)'],
            borderColor: 'rgba(139, 92, 246, 1)'
        }
    ];

    status(item: any) {
        return item.status;
    }
}
