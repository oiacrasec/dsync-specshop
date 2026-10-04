import { Component, computed, inject } from '@angular/core';
import { LayoutService } from '@/app/layout/service/layout.service';
import { generateRandomHeatmapData } from '@/app/lib/utils';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { CommonModule } from '@angular/common';
import { PatternWidget } from '@/app/pages/examples/landing/components/patternwidget';
import { HeatMapChart } from '@/app/pages/examples/dashboards/examples/ui/charts/heatmapchart';
import { MultiLineChart } from '@/app/pages/examples/dashboards/examples/ui/charts/multilinechart';
import { CustomersLogoWidget } from '@/app/pages/examples/landing/components/customerslogowidget';

interface HeatmapData {
    x: string;
    y: string;
    d: string;
    v: number;
}

@Component({
    selector: 'about-hero-widget',
    standalone: true,
    imports: [CommonModule, SectionCard, CustomersLogoWidget, PatternWidget, HeatMapChart, MultiLineChart],
    template: ` <section class="animate-fadein animate-duration-300 animate-ease-in relative w-full lg:pb-14 lg:pt-52 pt-36 pb-10 h-[620px] md:h-[680px] lg:h-[767px] overflow-hidden">
            <div class="relative z-10 mx-auto landing-container overflow-hidden">
                <h1 class="text-4xl lg:text-6xl font-semibold text-center text-surface-950 dark:text-surface-0 leading-none">
                    Powerful Features to<br class="hidden md:block" />
                    Elevate Your Marketing Efforts
                </h1>
                <p class="mt-8 text-base lg:text-xl text-surface-600 dark:text-white/64 text-center max-w-2xl mx-auto">Discover a suite of robust tools and functionalities designed to optimize your marketing strategies and drive business growth.</p>
                <div class="flex items-center justify-center mt-8 gap-3.5">
                    <button class="button-primary">Get Started</button>
                    <button class="button">Explore Marketing</button>
                </div>
            </div>
            <div class="absolute bottom-0 z-50 w-full h-32 bg-[linear-gradient(0deg,var(--p-primary-100)_0%,rgba(234,239,249,0.00)_42.04%)] dark:bg-[linear-gradient(0deg,#09090B_-12.4%,rgba(9,9,11,0.00)_28.29%)]"></div>
            <section-card
                class="flex flex-col gap-6 dark:bg-surface-950 w-[480px] h-100 backdrop-blur-xl absolute z-10 scale-50 md:scale-75 left-1/2 -translate-x-[80%] md:-translate-x-[120%] -bottom-32 rotate-[-14deg] opacity-90 shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)]"
            >
                <ng-template #title>Sales Performance</ng-template>
                <div class="flex-1 flex flex-col">
                    <div class="flex items-center justify-between">
                        @for (item of salesPerformanceHeader; track $index; let i = $index) {
                            <div>
                                <div class="inline-flex items-center gap-1">
                                    <span class="text-2xl font-medium text-surface-950 dark:text-surface-0">{{ item.value }}</span>
                                    <span [ngClass]="{ 'text-green-600': item.status === 'success', 'text-red-600': item.status !== 'success' }" class="text-sm font-medium inline-flex gap-1 items-center">
                                        <i class="pi text-sm!" [ngClass]="item.status === 'success' ? 'pi-arrow-up-right' : 'pi-arrow-down-left'"></i>
                                        <span class="flex-1">{{ item.change }}</span>
                                    </span>
                                </div>
                                <div class="mt-1 text-sm text-surface-500 dark:text-white/64">{{ item.title }}</div>
                            </div>
                        }
                    </div>
                    <div class="mt-8 flex-1 flex gap-3 justify-between">
                        @for (item of salesPerformanceData; track $index; let i = $index) {
                            <div class="flex flex-col items-center gap-3">
                                <div
                                    class="flex-1 min-h-44 w-4 flex flex-col items-end justify-end rounded overflow-hidden bg-primary-100/36 dark:bg-white/6 shadow-[inset_0px_3px_6px_0px_color-mix(in_srgb,var(--p-primary-300)_60%,transparent_40%)] dark:shadow-[0px_1px_6px_0px_rgba(255,255,255,0.24)_inset]"
                                >
                                    <div
                                        class="w-full bg-primary rounded shadow-[inset_0px_3px_6px_0px_color-mix(in_srgb,var(--p-primary-300)_60%,transparent_40%),inset_0px_0px_10px_0px_rgba(0,0,0,0.03)] dark:shadow-[0px_3px_6px_0px_rgba(255,255,255,0.24)_inset,0px_0px_10px_0px_rgba(0,0,0,0.03)_inset]"
                                        [style]="{ height: (item.y * 100) / salesPerformanceMax + '%' }"
                                    ></div>
                                </div>
                                <span class="text-sm text-surface-400 dark:text-white/64">
                                    {{ item.x.padStart(2, '0') }}
                                </span>
                            </div>
                        }
                    </div>
                </div>
            </section-card>
            <section-card
                class="flex flex-col gap-4 max-w-[500px] absolute z-20 md:scale-100 scale-[0.6] -translate-x-1/2 left-1/2 -bottom-40 lg:-bottom-32 backdrop-blur-xl bg-white dark:bg-surface-950 shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)]"
            >
                <ng-template #title>Promotion and Campaign Performance</ng-template>

                <heat-map-chart class="flex-1 pt-0 pb-2 border-y border-surface dark:border-white/8" [dataset]="randomHeatmapData" [conditions]="heatmapConditions" />

                <div class="flex items-center justify-between">
                    @for (item of heatmapConditions; track $index; let i = $index) {
                        <div class="inline-flex items-center gap-2">
                            <span
                                class="h-2.5 w-10 rounded-sm shadow-[0px_3px_6px_0px_rgba(255,255,255,0.30)_inset,0px_10px_10px_-8px_rgba(18,18,23,0.02),0px_2px_2px_-1.5px_rgba(18,18,23,0.02),0px_1px_1px_-0.5px_rgba(18,18,23,0.02)]"
                                [ngStyle]="{ background: 'var(' + (isDarkTheme() ? item.color.dark : item.color.light) + ')' }"
                            ></span>
                            <span class="text-sm font-medium text-surface-950 dark:text-white">{{ item.min.toLocaleString('en-US') }} - {{ item.max.toLocaleString('en-US') }}</span>
                        </div>
                    }
                </div>
            </section-card>
            <section-card
                class="flex flex-col justify-between dark:bg-surface-950 gap-4 w-[480px] h-100 backdrop-blur-xl absolute z-10 scale-50 md:scale-75 left-1/2 translate-x-[-15%] md:translate-x-[20%] -bottom-32 rotate-14 opacity-90 shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)]"
            >
                <ng-template #title>Email Data Chart</ng-template>
                <ng-template #action>
                    <div class="flex items-center gap-2">
                        <div class="px-3 py-1 rounded-full bg-surface-0 dark:bg-white/10 border dark:border-white/8 inline-flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-orange-500"></span>
                            <span class="text-sm font-medium text-surface-950 dark:text-surface-0">Click Through Rate</span>
                        </div>
                        <div class="px-3 py-1 rounded-full bg-surface-0 dark:bg-white/10 border dark:border-white/8 inline-flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-primary-500"></span>
                            <span class="text-sm font-medium text-surface-950 dark:text-surface-0">Open Rate</span>
                        </div>
                    </div>
                </ng-template>
                <div class="flex-1">
                    <multi-line-chart
                        [datasets]="datasets"
                        [labels]="['Click Through Rate', 'Open Rate']"
                        [bgColors]="[
                            ['rgba(234, 127, 51, 0.15)', 'rgba(234, 127, 51, 0)'],
                            ['rgba(37, 99, 235, 0.12)', 'rgba(37, 99, 235, 0)']
                        ]"
                        [borderColors]="['rgba(234, 127, 51, 1)', 'rgba(37, 99, 235, 1)']"
                        [option]="'year'"
                        [stepSize]="100000"
                        [dataReduction]="false"
                        tooltipPrefix=""
                    />
                </div>
            </section-card>

            <pattern-widget leftClass="top-40" rightClass="top-40" />
        </section>
        <customers-logo-widget class="my-16 landing-container mx-auto" />`
})
export class AboutHeroWidget {
    layoutService = inject(LayoutService);

    isDarkTheme = computed(() => this.layoutService.isDarkTheme());

    ngOnInit() {
        this.randomHeatmapData = generateRandomHeatmapData();
    }

    randomHeatmapData: HeatmapData[] = [];

    datasets = [
        { x: new Date('2014-04-12'), y: [110000, 24000] },
        { x: new Date('2015-04-12'), y: [320000, 180000] },
        { x: new Date('2016-04-12'), y: [490000, 300000] },
        { x: new Date('2017-04-12'), y: [475000, 360000] },
        { x: new Date('2018-04-12'), y: [420000, 480000] },
        { x: new Date('2019-04-12'), y: [400000, 460000] },
        { x: new Date('2020-04-12'), y: [410000, 390000] },
        { x: new Date('2021-04-12'), y: [280000, 340000] },
        { x: new Date('2022-04-12'), y: [282000, 374000] },
        { x: new Date('2023-04-12'), y: [100000, 100000] }
    ];

    heatmapConditions = [
        { min: 200, max: 500, color: { light: '--p-primary-200', dark: '--p-primary-950' } },
        { min: 501, max: 800, color: { light: '--p-primary-300', dark: '--p-primary-800' } },
        { min: 801, max: 1000, color: { light: '--p-primary-400', dark: '--p-primary-700' } },
        { min: 1001, max: 1500, color: { light: '--p-primary-color', dark: '--p-primary-color' } }
    ];

    salesPerformanceMax = 500;

    salesPerformanceData = [
        { x: '1', y: 234 },
        { x: '2', y: 420 },
        { x: '3', y: 152 },
        { x: '4', y: 398 },
        { x: '5', y: 73 },
        { x: '6', y: 420 },
        { x: '7', y: 365 },
        { x: '8', y: 298 },
        { x: '9', y: 99 },
        { x: '10', y: 451 },
        { x: '11', y: 183 },
        { x: '12', y: 312 },
        { x: '13', y: 276 },
        { x: '14', y: 415 }
    ];

    salesPerformanceHeader = [
        {
            title: 'Weekly Revenue',
            value: '$2.302',
            change: '29%',
            status: 'success'
        },
        {
            title: 'Monthly Income',
            value: '$72.302',
            change: '48%',
            status: 'success'
        },
        {
            title: 'Annual Income ',
            value: '$780.302',
            change: '64%',
            status: 'success'
        }
    ];
}
