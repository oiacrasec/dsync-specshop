import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { LayoutService } from '@/app/layout/service/layout.service';
import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';

@Component({
    selector: 'feature2',
    standalone: true,
    imports: [CommonModule, SectionCard],
    template: `
        <div class="landing-container max-w-296 py-12 lg:py-24 flex lg:flex-row flex-col gap-8 lg:gap-14">
            <section-card class="flex-1 flex flex-col min-h-80">
                <ng-template #title> Visit by Device </ng-template>
                <div class="flex-1 mt-4 flex flex-col">
                    <div class="p-2 pb-3 rounded-xl bg-white/64 dark:bg-white/10 shadow-custom-shadow">
                        <div class="p-2 bg-surface-0 dark:bg-white/12 flex items-center justify-between gap-2 rounded-lg shadow-sm">
                            <div class="font-medium text-surface-500 dark:text-white">Total Visit</div>
                            <div class="inline-flex gap-1 items-center" [ngClass]="totalVisit.status === 'success' ? 'text-green-600' : 'text-red-600'">
                                <i class="pi text-sm!" [ngClass]="totalVisit.status === 'success' ? 'pi-arrow-up-right' : 'pi-arrow-down-left'"></i>
                                <span class="text-sm font-medium">{{ totalVisit.change }}</span>
                            </div>
                        </div>
                        <div class="mt-3 text-3xl font-medium text-center text-surface-950 dark:text-surface-0">
                            {{ totalVisit.value }}
                        </div>
                    </div>
                    <div class="flex-1 mt-4 flex gap-4 justify-between">
                        @for (item of visitByDevice; track $index) {
                            <div class="flex-1 flex flex-col max-w-40 space-y-2">
                                <div class="flex items-center justify-between gap-1">
                                    <div class="text-sm font-medium text-surface-500 dark:text-white">{{ item.title }}</div>
                                    <div class="inline-flex gap-1" [ngClass]="item.status === 'success' ? 'text-green-600' : 'text-red-600'">
                                        <i class="pi text-sm!" [ngClass]="item.status === 'success' ? 'pi-arrow-up-right' : 'pi-arrow-down-left'"></i>
                                        <span class="text-sm font-medium">{{ item.change }}</span>
                                    </div>
                                </div>
                                <div class="flex-1 h-28 bg-white/64 dark:bg-white/10 rounded-xl overflow-hidden shadow-v2 relative flex flex-col">
                                    <div class="flex-1 flex flex-col items-center pt-0.5">
                                        <div class="w-2 h-2 rounded-full" [ngStyle]="{ background: 'var(--p-' + item.color.name + '-300)' }"></div>
                                        <div class="flex-1 border-r border-dashed" [ngStyle]="{ 'border-color': 'var(--p-' + item.color.name + '-300)' }"></div>
                                    </div>
                                    <div
                                        class="relative w-full flex items-center justify-center"
                                        [ngStyle]="{
                                            height: item.value + '%',
                                            background: 'var(--p-' + item.color.name + '-' + item.color.background + ')',
                                            'box-shadow': isDarkTheme() ? '0px 3px 6px 0px rgba(255, 255, 255, 0.24) inset' : 'inset 0px 3px 6px 0px color-mix(in srgb, var(--p-' + item.color.name + '-300) 60%, transparent 40%)'
                                        }"
                                    >
                                        <div class="text-sm font-medium" [ngClass]="item.color.name === 'primary' ? 'text-primary-contrast' : 'text-white'">%{{ item.value }}</div>
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </section-card>
            <div class="flex-1">
                <span class="badge">Feature</span>
                <h2 class="mt-4 text-4xl lg:text-5xl font-semibold text-surface-950 dark:text-surface-0 max-w-md">User-Friendly Interface Design</h2>
                <p class="mt-6 text-surface-500 dark:text-white/64 text-lg">A design approach that prioritizes ease of use and seamless navigation to enhance the overall user experience.</p>
                <ul class="mt-8 text-surface-500 dark:text-white/64 space-y-3.5 list-inside list-disc">
                    <li class="text-lg">Easy Navigation</li>
                    <li class="text-lg">Responsive Layout</li>
                    <li class="text-lg">Clean and Modern</li>
                </ul>
                <button class="button-primary mt-8">Get Started</button>
            </div>
        </div>
    `
})
export class Feature2 {
    layoutService = inject(LayoutService);

    isDarkTheme = computed(() => this.layoutService.isDarkTheme());

    visitByDevice = [
        {
            title: 'Web',
            change: '24%',
            status: 'success',
            value: 44,
            color: {
                name: 'primary',
                background: 'color'
            }
        },
        {
            title: 'Mobile',
            change: '16%',
            status: 'danger',
            value: 36,
            color: {
                name: 'orange',
                background: '500'
            }
        },
        {
            title: 'Tablet',
            change: '12%',
            status: 'success',
            value: 20,
            color: {
                name: 'surface',
                background: '400'
            }
        }
    ];

    totalVisit = {
        change: '64%',
        status: 'success',
        value: '1,772.480'
    };
}
