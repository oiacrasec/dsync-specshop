import { CreditCard } from '@/app/layout/components/ui/creditcard';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
    selector: 'financial-management',
    standalone: true,
    imports: [CommonModule, SectionCard, CreditCard],
    template: `
        <div class="landing-container max-w-296 py-24 flex lg:flex-row flex-col-reverse gap-14">
            <div class="flex-1">
                <span class="badge">Financial Management</span>
                <h2 class="mt-4 text-4xl lg:text-5xl font-semibold text-surface-950 dark:text-surface-0 max-w-md">Personal Financial Management Tools</h2>
                <p class="mt-6 text-surface-500 dark:text-white/64 text-lg">Balance your budget, save, and achieve your financial goals using our personal financial management tools.</p>
                <ul class="mt-8 text-surface-500 dark:text-white/64 space-y-3.5 list-inside list-disc">
                    <li class="text-lg">Invest with instant transaction speed.</li>
                    <li class="text-lg">User-friendly investment execution.</li>
                    <li class="text-lg">Advanced investment security.</li>
                </ul>
                <button class="button-primary mt-8">Get Started</button>
            </div>
            <section-card class="flex-1 p-4 lg:p-6">
                <div>
                    <credit-card name="Robert Jonas" last4digit="3772" [addCard]="true" class="block max-h-64" />
                </div>
                <div class="border border-surface border-dashed rounded-xl mt-6">
                    <div
                        class="flex flex-col gap-4 bg-white dark:bg-white/16 dark:backdrop-blur-lg p-6 rounded-xl translate-y-5 translate-x-0 -rotate-[4deg] shadow-[0px_46px_13px_0px_rgba(163,163,163,0.00),0px_30px_12px_0px_rgba(163,163,163,0.01),0px_17px_10px_0px_rgba(163,163,163,0.02),0px_7px_7px_0px_rgba(163,163,163,0.03),0px_2px_4px_0px_rgba(163,163,163,0.04)]"
                    >
                        @for (item of creditCardData; track $index; let i = $index) {
                            <div class="inline-flex items-center justify-between gap-6">
                                <span class="text-surface-500 dark:text-white/64">{{ item.title }}</span>
                                <span class="text-right text-lg font-medium text-surface-950 dark:text-surface-0">{{ item.content }}</span>
                            </div>
                        }
                    </div>
                </div>
            </section-card>
        </div>
    `
})
export class FinancialManagement {
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
