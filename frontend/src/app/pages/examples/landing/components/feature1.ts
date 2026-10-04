import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
    selector: 'feature1',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="landing-container py-12 lg:py-24">
            <div class="badge mx-auto w-fit">Feature</div>
            <h2 class="mt-4 text-4xl lg:text-5xl font-semibold text-surface-950 dark:text-surface-0 text-center">
                Comprehensive and <br class="hidden md:block" />
                Effective Marketing Tools
            </h2>
            <p class="mt-6 text-lg text-surface-500 dark:text-white/64 max-w-lg text-center mx-auto">A design approach that prioritizes ease of use and seamless navigation to enhance the overall user experience.</p>
            <div class="flex md:flex-row flex-col gap-8 mt-8 lg:mt-16">
                @for (item of features; track $index) {
                    <div class="flex-1 p-6 rounded-3xl shadow-custom-shadow bg-white/64 dark:bg-white/10">
                        <div class="w-14 h-14 rounded-xl shadow-custom-shadow flex items-center justify-center border border-surface bg-surface-0">
                            <i [class]="item.icon" class="text-surface-950 text-2xl!"></i>
                        </div>
                        <h5 class="mt-6 text-xl font-semibold text-surface-950 dark:text-surface-0">{{ item.title }}</h5>
                        <p class="mt-3 text-surface-500 dark:text-white/64">{{ item.description }}</p>
                    </div>
                }
            </div>
        </div>
    `
})
export class Feature1 {
    features = [
        {
            icon: 'pi pi-database',
            title: 'SEO Optimization',
            description: 'Improve search engine rankings with optimized content and meta tags. Enhance search engine visibility with keyword-rich content and well-structured meta tags, driving more organic traffic.'
        },
        {
            icon: 'pi pi-chart-bar',
            title: 'Analytics Integration',
            description: 'Track visitor behavior and campaign performance with built-in analytics tools. Use analytics tools to understand visitor behavior and campaign effectiveness, enabling data-driven improvements.'
        },
        {
            icon: 'pi pi-verified',
            title: 'Social Media Integration',
            description: 'Connect and share your content across various social media platforms effortlessly. Integrate with social media platforms for easy sharing and engagement, enhancing visibility and audience connection.'
        }
    ];
}
