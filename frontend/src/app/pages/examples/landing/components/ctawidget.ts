import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { LazyImageWidget } from './lazyimagewidget';
import { PatternWidget } from './patternwidget';
import { LayoutService } from '@/app/layout/service/layout.service';

@Component({
    selector: 'cta-widget',
    standalone: true,
    imports: [CommonModule, LazyImageWidget, PatternWidget],
    template: `
        <section class="my-24 landing-container">
            <div class="relative overflow-hidden pt-8 px-6 md:pt-20 h-128 md:h-176 dark:bg-white/12 rounded-3xl shadow-custom-shadow">
                <div class="relative z-20">
                    <h2 class="text-center max-w-lg mx-auto text-4xl md:text-5xl font-semibold text-surface-950 dark:text-surface-0">Enhance Your Marketing Strategy</h2>
                    <p class="mt-6 text-lg text-surface-500 dark:text-white/64 max-w-2xl text-center md:mx-auto">Utilize our comprehensive tools and insights to optimize your campaigns, increase engagement, and drive business growth.</p>
                    <button class="button-primary mt-8 mx-auto">Get Started</button>
                </div>
                <lazy-image-widget
                    [src]="'/demo/images/ecommerce-dashboard-' + (isDarkTheme() ? 'noir-dark' : layoutService.layoutConfig().primary) + '.png'"
                    alt="CTA Dashboard Image"
                    className="absolute top-[340px] sm:top-[320px] md:top-[412px] left-[32px] sm:left-[62px] md:left-[82px] z-10 w-[260px] md:w-[420px] h-auto rotate-[-15deg] drop-shadow-md"
                />
                <lazy-image-widget
                    [src]="'/demo/images/marketing-dashboard-' + (isDarkTheme() ? 'noir-dark' : layoutService.layoutConfig().primary) + '.png'"
                    alt="CTA Dashboard Image"
                    className="absolute top-[300px] sm:top-[270px] md:top-[360px] lg:top-[335px] left-1/2 -translate-x-1/2 z-20 w-[240px] sm:w-[280px] md:w-[420px] lg:w-[500px] h-auto drop-shadow-lg"
                />
                <lazy-image-widget
                    [src]="'/demo/images/banking-dashboard-' + (isDarkTheme() ? 'noir-dark' : layoutService.layoutConfig().primary) + '.png'"
                    alt="CTA Dashboard Image"
                    className="absolute top-[340px] sm:top-[320px] md:top-[412px] right-[32px] sm:right-[62px] md:right-[82px] z-10 w-[260px] md:w-[420px] h-auto rotate-15 drop-shadow-md"
                />
                <pattern-widget />
            </div>
        </section>
    `
})
export class CTAWidget {
    layoutService = inject(LayoutService);

    isDarkTheme = computed(() => this.layoutService.isDarkTheme());
}
