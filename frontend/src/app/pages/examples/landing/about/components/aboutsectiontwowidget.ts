import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { TableModule } from 'primeng/table';
import { GaugeChart } from '@/app/pages/examples/dashboards/examples/ui/charts/gaugechart';
import { LayoutService } from '@/app/layout/service/layout.service';

@Component({
    selector: 'about-section-two-widget',
    standalone: true,
    imports: [CommonModule, SectionCard, TableModule, GaugeChart],
    template: ` <section class="landing-container max-w-272 relative py-12 lg:py-24 flex flex-col gap-24 lg:gap-48">
        <div class="flex lg:flex-row flex-col gap-16">
            <section-card class="flex flex-col flex-1">
                <ng-template #title> Audience By Gender </ng-template>
                <div class="flex-1 flex items-center justify-center">
                    <gauge-chart [data]="data()" [labels]="labels()" [bgColors]="bgColors()" title="All Gender" [description]="formattedTotalAudience" />
                </div>
                <div class="p-3 rounded-lg w-full flex items-center gap-8 justify-between bg-surface-0 dark:bg-white/10 shadow-v1">
                    @for (item of audienceByGender(); track $index; let i = $index) {
                        <div class="flex-1 flex items-center">
                            <div class="w-1 h-4 rounded-full" [ngStyle]="{ background: 'var(--p-' + item.color + ')' }"></div>
                            <div class="ml-3 mr-2 text-sm text-surface-950 dark:text-surface-0">
                                {{ item.label }}
                            </div>
                            <div class="font-medium" [ngStyle]="{ color: 'var(--p-' + item.color + ')' }">{{ item.percentage }}%</div>
                        </div>
                    }
                </div>
            </section-card>
            <div class="flex-1">
                <span class="badge">Feature</span>
                <h2 class="text-4xl lg:text-5xl font-semibold leading-none text-surface-950 dark:text-surface-0 mt-4">Audience Gender Breakdown</h2>
                <p class="mt-4 text-lg text-surface-500 dark:text-white/64">Understand the gender composition of your audience to better customize your marketing efforts.</p>
                <ul class="my-8 list-disc list-inside space-y-3.5 text-lg text-surface-500 dark:text-white/64">
                    <li>Detailed Gender Insights</li>
                    <li>Targeted Campaigns</li>
                    <li>Performance Tracking</li>
                </ul>
                <button class="button-primary">Get Started</button>
            </div>
        </div>
        <div class="flex lg:flex-row flex-col-reverse gap-16">
            <div class="flex-1">
                <span class="badge">Financial Management </span>
                <h2 class="text-4xl lg:text-5xl font-semibold leading-none text-surface-950 dark:text-surface-0 mt-4">Global Rank Performance Insights</h2>
                <p class="mt-4 text-lg text-surface-500 dark:text-white/64">Monitor and analyze your website’s global ranking to understand its performance and visibility on an international scale.</p>
                <ul class="my-8 list-disc list-inside space-y-3.5 text-lg text-surface-500 dark:text-white/64">
                    <li>Real-Time Ranking Updates</li>
                    <li>Competitor Comparison</li>
                    <li>Traffic Source Analysis</li>
                </ul>
                <button class="button-primary">Get Started</button>
            </div>
            <section-card class="flex flex-col flex-1">
                <ng-template #title> Global Rank </ng-template>
                <div class="mt-4 flex-1 flex flex-col">
                    <div class="p-2 rounded-lg bg-surface-0 shadow-v1 bg-white/10 flex items-center justify-between gap-2">
                        <div class="text-sm font-medium text-surface-950 dark:text-surface-0">Country</div>
                        <div class="text-sm font-medium text-surface-950 dark:text-surface-0">Percentage</div>
                    </div>
                    <div class="flex-1 mt-4 flex flex-col justify-between gap-2 px-2">
                        @for (item of globalRank; track $index; let i = $index) {
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
                                        [ngStyle]="{
                                            width: item.percentage + '%',
                                            'box-shadow': isDarkTheme()
                                                ? '0px 3px 6px 0px rgba(255, 255, 255, 0.24) inset, 0px 6px 2px 0px rgba(0, 0, 0, 0.00), 0px 4px 2px 0px rgba(0, 0, 0, 0.00), 0px 2px 1px 0px rgba(0, 0, 0, 0.01), 0px 1px 1px 0px rgba(0, 0, 0, 0.02), 0px 0px 1px 0px rgba(0, 0, 0, 0.02), 0px 0px 6px 0px rgba(0, 0, 0, 0.02) inset'
                                                : '0px 3px 6px 0px color-mix(in srgb, var(--p-primary-300) 60%, transparent 40%) inset, 0px 6px 2px 0px rgba(0, 0, 0, 0.00), 0px 4px 2px 0px rgba(0, 0, 0, 0.00), 0px 2px 1px 0px rgba(0, 0, 0, 0.01), 0px 1px 1px 0px rgba(0, 0, 0, 0.02), 0px 0px 1px 0px rgba(0, 0, 0, 0.02), 0px 0px 6px 0px rgba(0, 0, 0, 0.02) inset'
                                        }"
                                    ></div>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </section-card>
        </div>
    </section>`
})
export class AboutSectionTwoWidget {
    totalAudience = 17772480;

    layoutService = inject(LayoutService);

    isDarkTheme = computed(() => this.layoutService.isDarkTheme());

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
        },
        {
            country: 'France',
            value: '24.759',
            percentage: 6
        }
    ];

    data = computed(() => this.audienceByGender().map((item) => (this.totalAudience * item.percentage) / 100));

    labels = computed(() => this.audienceByGender().map((item) => item.label));

    bgColors = computed(() => this.audienceByGender().map((item) => item.color));

    get formattedTotalAudience() {
        return this.totalAudience.toLocaleString('en-US');
    }
}
