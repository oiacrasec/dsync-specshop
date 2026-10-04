import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from '@/app/layout/service/layout.service';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';

@Component({
    selector: 'visit-by-device-widget',
    standalone: true,
    imports: [CommonModule, SectionCard],
    template: ` <section-card>
        <ng-template #title> Visit by Device</ng-template>
        <div class="mt-4">
            <div class="p-2 pb-3 rounded-xl bg-white/64 dark:bg-white/10 shadow-v2">
                <div class="p-2 bg-surface-0 dark:bg-white/12 flex items-center justify-between gap-2 rounded-lg shadow-v1">
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
            <div class="mt-4 flex gap-4 justify-between">
                @for (item of visitByDevice; track item.title) {
                    <div class="flex-1 max-w-28 space-y-2">
                        <div class="flex items-center justify-between gap-1">
                            <div class="text-sm font-medium text-surface-500 dark:text-white">{{ item.title }}</div>
                            <div class="inline-flex gap-1" [ngClass]="item.status === 'success' ? 'text-green-600' : 'text-red-600'">
                                <i class="pi text-sm!" [ngClass]="item.status === 'success' ? 'pi-arrow-up-right' : 'pi-arrow-down-left'"></i>
                                <span class="text-sm font-medium">{{ item.change }}</span>
                            </div>
                        </div>
                        <div class="h-28 bg-white/64 dark:bg-white/10 rounded-xl overflow-hidden shadow-v2 relative flex flex-col">
                            <div class="flex-1 flex flex-col items-center pt-0.5">
                                <div class="w-2 h-2 rounded-full" [style]="{ background: color(item) }"></div>
                                <div class="flex-1 border-r border-dashed" [style]="{ borderColor: color(item) }"></div>
                            </div>
                            <div
                                class="relative w-full flex items-center justify-center"
                                [style]="{
                                    height: item.value + '%',
                                    background: background(item),
                                    boxShadow: isDarkTheme() ? '0px 3px 6px 0px rgba(255, 255, 255, 0.24) inset' : boxShadow(item)
                                }"
                            >
                                <div class="text-sm font-medium" [ngClass]="item.color.name === 'primary' ? 'text-primary-contrast' : 'text-white'">%{{ item.value }}</div>
                            </div>
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
export class VisitByDeviceWidget {
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

    color(item: any) {
        return `var(--p-${item.color.name}-300)`;
    }

    background(item: any) {
        return `var(--p-${item.color.name}-${item.color.background})`;
    }

    boxShadow(item: any) {
        return `inset 0px 3px 6px 0px color-mix(in srgb, var(--p-${item.color.name}-300) 60%, transparent 40%)`;
    }
}
