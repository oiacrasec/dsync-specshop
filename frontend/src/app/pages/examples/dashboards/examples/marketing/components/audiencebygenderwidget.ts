import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { GaugeChart } from '@/app/pages/examples/dashboards/examples/ui/charts/gaugechart';

@Component({
    selector: 'audience-by-gender-widget',
    standalone: true,
    imports: [CommonModule, SectionCard, GaugeChart],
    template: ` <app-section-card class="flex flex-col">
        <ng-template #title> Audience By Gender</ng-template>
        <div class="flex-1 flex items-center justify-center">
            <gauge-chart [data]="data()" [labels]="labels()" [bgColors]="bgColors()" title="All Gender" [description]="totalAudience.toLocaleString('en-US')" />
        </div>
        <div class="p-3 rounded-lg w-full flex items-center gap-8 justify-between bg-surface-0 dark:bg-white/10 shadow-v1">
            @for (item of audienceByGender(); track item.label) {
                <div class="flex-1 flex items-center">
                    <div class="w-1 h-4 rounded-full shadow-[0px_3px_1px_0px_rgba(0,0,0,0.00),0px_2px_1px_0px_rgba(0,0,0,0.01),0px_1px_1px_0px_rgba(0,0,0,0.02),0px_0px_1px_0px_rgba(0,0,0,0.03)]" [ngStyle]="{ background: background(item) }"></div>
                    <div class="ml-3 mr-2 text-sm text-surface-950 dark:text-surface-0">{{ item.label }}</div>
                    <div class="font-medium" [ngStyle]="{ color: background(item) }">{{ item.percentage }}%</div>
                </div>
            }
        </div>
    </app-section-card>`,
    host: {
        style: 'display: contents'
    }
})
export class AudienceByGenderWidget {
    totalAudience = 17772480;

    audienceByGender = signal([
        {
            label: 'Woman Visitor',
            color: 'primary-color',
            percentage: 60
        },
        {
            label: 'Men Visitor',
            color: 'green-500',
            percentage: 40
        }
    ]);

    data = computed(() => this.audienceByGender().map((item) => (this.totalAudience * item.percentage) / 100));

    labels = computed(() => this.audienceByGender().map((item) => item.label));

    bgColors = computed(() => this.audienceByGender().map((item) => item.color));

    background(item: any) {
        return `var(--p-${item.color})`;
    }
}
