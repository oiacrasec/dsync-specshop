import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from '@/app/layout/service/layout.service';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';

@Component({
    selector: 'global-rank-widget',
    standalone: true,
    imports: [CommonModule, SectionCard],
    template: ` <section-card class="flex flex-col">
        <ng-template #title> Global Rank</ng-template>
        <div class="mt-4 flex-1 flex flex-col">
            <div class="p-2 rounded-lg bg-surface-0 shadow-v1 bg-white/10 flex items-center justify-between gap-2">
                <div class="text-sm font-medium text-surface-950 dark:text-surface-0">Country</div>
                <div class="text-sm font-medium text-surface-950 dark:text-surface-0">Percentage</div>
            </div>
            <div class="flex-1 mt-4 flex flex-col justify-between gap-2 px-2">
                @for (item of globalRank; track item.country) {
                    <div>
                        <div class="flex items-start gap-1">
                            <div class="flex-1 text-surface-950 dark:text-surface-0">{{ item.country }}</div>
                            <div class="flex items-start gap-2">
                                <div class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ item.value }}</div>
                                <div class="text-primary-600 text-sm font-medium">{{ item.percentage }}%</div>
                            </div>
                        </div>
                        <div
                            class="relative mt-2 h-2 w-full rounded-full bg-primary-100/36 dark:bg-white/6 shadow-[inset_0px_3px_6px_0px_color-mix(in_srgb,var(--p-primary-300)_60%,transparent_40%)] dark:shadow-[0px_1px_6px_0px_rgba(255,255,255,0.24)_inset]"
                        >
                            <div
                                class="absolute top-0 left-0 h-full bg-primary rounded-full"
                                [style]="{
                                    width: item.percentage + '%',
                                    boxShadow: isDarkTheme()
                                        ? '0px 3px 6px 0px rgba(255, 255, 255, 0.24) inset, 0px 6px 2px 0px rgba(0, 0, 0, 0.00), 0px 4px 2px 0px rgba(0, 0, 0, 0.00), 0px 2px 1px 0px rgba(0, 0, 0, 0.01), 0px 1px 1px 0px rgba(0, 0, 0, 0.02), 0px 0px 1px 0px rgba(0, 0, 0, 0.02), 0px 0px 6px 0px rgba(0, 0, 0, 0.02) inset'
                                        : '0px 3px 6px 0px color-mix(in srgb, var(--p-primary-300) 60%, transparent 40%) inset, 0px 6px 2px 0px rgba(0, 0, 0, 0.00), 0px 4px 2px 0px rgba(0, 0, 0, 0.00), 0px 2px 1px 0px rgba(0, 0, 0, 0.01), 0px 1px 1px 0px rgba(0, 0, 0, 0.02), 0px 0px 1px 0px rgba(0, 0, 0, 0.02), 0px 0px 6px 0px rgba(0, 0, 0, 0.02) inset'
                                }"
                            ></div>
                        </div>
                    </div>
                }
            </div>
        </div>
    </section-card>`,
    host: {
        style: 'display: contents'
    }
})
export class GlobalRankWidget {
    layoutService = inject(LayoutService);

    isDarkTheme = computed(() => this.layoutService.isDarkTheme());

    globalRank = [
        {
            country: 'United States',
            value: '680.982',
            percentage: 44
        },
        {
            country: 'Australia',
            value: '234.124',
            percentage: 28
        },
        {
            country: 'Germany',
            value: '178.825',
            percentage: 20
        },
        {
            country: 'Ukraine',
            value: '140.759',
            percentage: 15
        }
    ];
}
