import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreditCard } from '@/app/layout/components/ui/creditcard';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';

@Component({
    selector: 'credit-widget',
    standalone: true,
    imports: [CommonModule, CreditCard, SectionCard],
    template: ` <section-card class="flex flex-col md:flex-row xl:flex-col gap-10">
        <credit-card name="Robert Jonas" last4digit="3772" [addCard]="true" class="max-w-96 lg:max-w-none" />
        <div class="flex-1 flex flex-col gap-4">
            @for (item of creditCardData; track item.title) {
                <div class="inline-flex items-center justify-between gap-6">
                    <span class="text-surface-500 dark:text-white/64">{{ item.title }}</span>
                    <span class="text-right text-lg font-medium text-surface-950 dark:text-surface-0">{{ item.content }}</span>
                </div>
            }
        </div>
    </section-card>`
})
export class CreditWidget {
    creditCardData = [
        {
            title: 'Your Balance',
            content: '$72,842.00'
        },
        {
            title: 'Spend Limit ',
            content: '$100,000.00'
        },
        {
            title: 'Currency',
            content: 'USD Dollar'
        }
    ];
}
