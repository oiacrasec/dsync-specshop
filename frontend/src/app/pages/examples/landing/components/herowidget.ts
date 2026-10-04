import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { PatternWidget } from './patternwidget';
import { LazyImageWidget } from './lazyimagewidget';
import { LayoutService } from '@/app/layout/service/layout.service';
import { CustomersLogoWidget } from './customerslogowidget';

@Component({
    selector: 'hero-widget',
    standalone: true,
    imports: [CommonModule, PatternWidget, LazyImageWidget, CustomersLogoWidget],
    template: `
        <section class="animate-fadein animate-duration-300 animate-ease-in relative lg:pb-14 lg:pt-52 pt-36 pb-10 overflow-hidden">
            <div class="overflow-hidden relative">
                <div class="relative z-10 mx-auto landing-container overflow-hidden">
                    <h1 class="font-semibold text-4xl lg:text-6xl text-center leading-tight text-surface-950 dark:text-surface-0">
                        Discover the Power of<br class="hidden md:block" />
                        Marketing Opportunities Await
                    </h1>
                    <p class="mt-8 text-base lg:text-xl text-surface-600 text-center max-w-2xl mx-auto">Unlock your brand’s potential with cutting-edge marketing strategies and seize the opportunities that await.</p>
                    <div class="mt-8 flex items-center justify-center gap-3.5">
                        <button class="button-primary">Get Started</button>
                        <button class="button">Explore Marketing</button>
                    </div>
                </div>
                <div class="relative z-10">
                    <div class="landing-container mx-auto relative mt-20 w-full">
                        <lazy-image-widget className="w-full h-auto" [src]="'/demo/images/banking-dashboard-' + (isDarkTheme() ? 'noir-dark' : layoutService.layoutConfig().primary) + '.png'" alt="Hero Dashborad Image" />
                    </div>
                    <div class="absolute bottom-0 w-full h-4/5 bg-[linear-gradient(0deg,var(--p-primary-50)_0%,rgba(234,239,249,0.00)_64.95%)] dark:bg-[linear-gradient(0deg,#09090B_0%,rgba(9,9,11,0.00)_64.95%)]"></div>
                </div>
                <pattern-widget leftClass="top-0" rightClass="top-0" />
            </div>
            <customers-logo-widget class="my-16 landing-container mx-auto" />
        </section>
    `
})
export class HeroWidget {
    layoutService = inject(LayoutService);

    isDarkTheme = computed(() => this.layoutService.isDarkTheme());
}
