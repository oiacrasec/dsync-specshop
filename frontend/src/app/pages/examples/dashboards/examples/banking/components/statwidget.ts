import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';

@Component({
    selector: 'stat-widget',
    standalone: true,
    imports: [CommonModule, SectionCard],
    template: ` <section-card>
        <div class="flex flex-wrap gap-6">
            @for (item of salesStats; track item.title) {
                <div class="flex-1 flex gap-3 min-w-44">
                    <div class="w-1.5 rounded-full" [ngClass]="item.color"></div>
                    <div>
                        <h5 class="text-surface-500 dark:text-white/72">{{ item.title }}</h5>
                        <p class="mt-1 text-xl font-medium text-surface-950 dark:text-surface-0">{{ item.content }}</p>
                    </div>
                </div>
            }
        </div>
    </section-card>`,
    host: {
        style: 'display: contents'
    }
})
export class StatWidget {
    salesStats = [
        {
            title: 'Total Revenue',
            content: '$620,843.00',
            color: 'bg-emerald-500'
        },
        {
            title: 'Income',
            content: '$44,561.46',
            color: 'bg-blue-500'
        },
        {
            title: 'Savings',
            content: '$20,843.00',
            color: 'bg-orange-500'
        },
        {
            title: 'Expense',
            content: '$12,942.50',
            color: 'bg-rose-500'
        }
    ];
}
