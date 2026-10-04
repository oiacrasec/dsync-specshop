import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from '@/app/layout/service/layout.service';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'last-card-movements-widget',
    standalone: true,
    imports: [CommonModule, SectionCard, ButtonModule],
    template: ` <section-card class="flex flex-col justify-between gap-4">
        <ng-template #title>Last Card Movements</ng-template>
        <ng-template #action>
            <p-button label="View All" rounded text severity="contrast" class="py-0.5! px-1.5! text-sm!" />
        </ng-template>
        <div class="flex-1 flex flex-col justify-between">
            @for (item of data; track item.title; let i = $index) {
                <div class="flex items-center gap-4 py-4">
                    <div class="w-12 h-12 bg-surface-0 dark:bg-white/4 border border-surface-200 dark:border-white/8 rounded-2xl flex items-center justify-center">
                        <img [src]="item.logo + (isDarkTheme() ? '-dark' : '') + '.svg'" alt="Logo" />
                    </div>
                    <div class="flex-1">
                        <h5 class="font-medium text-surface-950 dark:text-surface-0">{{ item.title }}</h5>
                        <p class="text-sm text-surface-500 dark:text-white/64 mt-1">{{ item.date }}</p>
                    </div>
                    <div class="flex-1 inline-flex items-center justify-end text-right text-lg font-medium text-surface-500 dark:text-white/72">
                        <span [ngClass]="{ 'text-red-500': item.orientation === 'down', 'text-emerald-500': item.orientation === 'up' }">{{ item.amount }}</span
                        >&nbsp;
                        {{ item.currency }}
                    </div>
                </div>
                @if (i < data.length - 1) {
                    <div class="h-px w-full bg-(--surface-border) dark:bg-white/8"></div>
                }
            }
        </div>
    </section-card>`,
    host: {
        style: 'display: contents'
    }
})
export class LastCardMovementsWidget {
    layoutService = inject(LayoutService);

    isDarkTheme = computed(() => this.layoutService.isDarkTheme());

    data = [
        {
            title: 'Open Ai',
            date: 'May 29th, 2024',
            amount: '-$15',
            currency: 'USD',
            orientation: 'down',
            logo: 'demo/images/openai-logo'
        },
        {
            title: 'Adobe',
            date: 'May 22th, 2024',
            amount: '+$8',
            currency: 'USD',
            orientation: 'up',
            logo: 'demo/images/adobe-logo'
        },
        {
            title: 'Framer',
            date: 'May 16th, 2024',
            amount: '-$19',
            currency: 'USD',
            orientation: 'down',
            logo: 'demo/images/framer-logo'
        },
        {
            title: 'Webflow',
            date: 'May 12th, 2024',
            amount: '-$29',
            currency: 'USD',
            orientation: 'down',
            logo: 'demo/images/webflow-logo'
        },
        {
            title: 'Spotify',
            date: 'May 7th, 2024',
            amount: '-$24',
            currency: 'USD',
            orientation: 'down',
            logo: 'demo/images/spotify-logo'
        }
    ];
}
