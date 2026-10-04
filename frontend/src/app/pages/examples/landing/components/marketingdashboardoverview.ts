import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { LazyImageWidget } from './lazyimagewidget';
import { LayoutService } from '@/app/layout/service/layout.service';

@Component({
    selector: 'marketing-dashboard-overview',
    standalone: true,
    imports: [CommonModule, LazyImageWidget],
    template: `
        <section class="landing-container max-w-lg lg:max-w-340 my-24">
            <div class="relative overflow-hidden p-6 lg:p-16 h-288 lg:h-176 dark:bg-white/12 rounded-3xl shadow-custom-shadow">
                <div class="relative z-20 lg:w-126.5">
                    <h2 class="text-4xl lg:text-5xl font-semibold text-surface-950 dark:text-surface-0">Marketing Dashboard Overview</h2>
                    <p class="text-lg text-surface-500 dark:text-white/48 mt-4">Gain real-time insights and comprehensive analytics to optimize your marketing strategies. Track key performance indicators and make data-driven decisions with ease.</p>
                    <div class="h-px w-full bg-black/5 my-8"></div>
                    <div class="flex flex-col gap-6">
                        @for (detail of details; track $index; let i = $index) {
                            <div class="flex items-start gap-2">
                                <i [class]="detail.icon" class="p-1 -mt-1 text-surface-950 dark:text-surface-0 text-lg!"></i>
                                <div>
                                    <h3 class="text-xl font-medium text-surface-950 dark:text-surface-0">{{ detail.title }}</h3>
                                    <p class="text-surface-500 dark:text-white/48 mt-2">{{ detail.description }}</p>
                                </div>
                            </div>
                        }
                    </div>
                </div>
                <div class="absolute top-60 lg:-top-32 -right-40 lg:right-40 rotate-[-50deg] scale-x-[-1]">
                    <div class="pattern w-368 h-312 absolute top-0 left-0"></div>
                    <div class="pattern w-328 h-288 absolute top-28 left-0"></div>
                    <div class="pattern w-284 h-60 absolute top-56 left-60"></div>
                </div>
                <lazy-image-widget
                    [src]="'/demo/images/marketing-dashboard-' + (isDarkTheme() ? 'noir-dark' : layoutService.layoutConfig().primary) + '.png'"
                    alt="Marketing Dashboard Image"
                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 lg:translate-x-0 lg:top-[57px] lg:left-auto lg:-right-[88px] z-10 w-[90%] max-w-[400px] lg:w-[600px] h-auto drop-shadow-md"
                />
            </div>
        </section>
    `
})
export class MarketingDashboardOverview {
    layoutService = inject(LayoutService);

    isDarkTheme = computed(() => this.layoutService.isDarkTheme());

    details = [
        {
            title: 'Real-Time Analytics',
            description: 'Monitor your marketing campaigns’ performance instantly with up-to-date data',
            icon: 'pi pi-chart-line'
        },
        {
            title: 'Customizable Reports',
            description: 'Generate tailored reports to meet specific business needs and objectives',
            icon: 'pi pi-file'
        },
        {
            title: 'Campaign Tracking',
            description: 'Keep an eye on all your marketing campaigns in one place for better management and optimization',
            icon: 'pi pi-ticket'
        }
    ];
}
