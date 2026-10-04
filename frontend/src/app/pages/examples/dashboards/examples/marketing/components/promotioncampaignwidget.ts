import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { LayoutService } from '@/app/layout/service/layout.service';
import { generateRandomHeatmapData } from '@/app/lib/utils';
import { HeatMapChart } from '@/app/pages/examples/dashboards/examples/ui/charts/heatmapchart';

@Component({
    selector: 'promotion-campaign-widget',
    standalone: true,
    imports: [CommonModule, SectionCard, HeatMapChart],
    template: ` <app-section-card class="flex flex-col gap-4">
        <ng-template #title>Promotion and Campaign Performance</ng-template>
        <div class="flex-1 pt-0 pb-2 border-y border-surface dark:border-white/10">
            <heat-map-chart [dataset]="randomHeatmapData" [conditions]="heatmapConditions" />
        </div>
        <div class="flex items-center justify-between">
            @for (item of heatmapConditions; track item.min; let i = $index) {
                <div class="inline-flex items-center gap-2">
                    <span
                        class="h-2.5 w-10 rounded-sm shadow-[0px_3px_6px_0px_rgba(255,255,255,0.30)_inset,0px_10px_10px_-8px_rgba(18,18,23,0.02),0px_2px_2px_-1.5px_rgba(18,18,23,0.02),0px_1px_1px_-0.5px_rgba(18,18,23,0.02)]"
                        [ngStyle]="{ 'background-color': backgroundColor(item) }"
                    ></span>
                    <span class="text-sm font-medium text-surface-950 dark:text-white">{{ item.min.toLocaleString('en-US') }} - {{ item.max.toLocaleString('en-US') }}</span>
                </div>
            }
        </div>
    </app-section-card>`
})
export class PromotionCampaignWidget {
    layoutService = inject(LayoutService);

    isDarkTheme = computed(() => this.layoutService.isDarkTheme());

    heatmapConditions = [
        { min: 200, max: 500, color: { light: '--p-primary-200', dark: '--p-primary-950' } },
        { min: 501, max: 800, color: { light: '--p-primary-300', dark: '--p-primary-800' } },
        { min: 801, max: 1000, color: { light: '--p-primary-400', dark: '--p-primary-700' } },
        { min: 1001, max: 1500, color: { light: '--p-primary-color', dark: '--p-primary-color' } }
    ];

    randomHeatmapData = generateRandomHeatmapData();

    backgroundColor(item: any) {
        return `var(${this.isDarkTheme() ? item.color.dark : item.color.light})`;
    }
}
