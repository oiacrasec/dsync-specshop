import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
    selector: 'pricing-compare-widget',
    standalone: true,
    imports: [CommonModule],
    template: `
        <section class="landing-container py-24">
            <div class="hidden lg:grid grid-cols-[1.15fr_1fr_1fr_1fr_1fr] gap-4 p-7 rounded-3xl shadow-custom-shadow bg-white/64 dark:bg-white/10">
                <div class="divide-y divide-primary-500/10 shadow-custom-shadow bg-white dark:bg-white/12 rounded-xl">
                    <div class="px-6 py-4 text-xl font-medium text-primary">Plan</div>
                    @for (planTitle of plans; track $index; let index = $index) {
                        <div class="px-6 py-4 text-lg font-medium text-surface-950 dark:text-surface-0">
                            {{ planTitle }}
                        </div>
                    }
                </div>
                @for (item of planDetails; track $index; let index = $index) {
                    <div class="divide-y divide-primary-500/10 shadow-custom-shadow bg-white dark:bg-white/12 rounded-xl">
                        <div class="px-6 py-4 text-xl font-medium text-primary capitalize text-center">{{ item.title }}</div>
                        @for (planIngredient of item.ingredients; track $index; let j = $index) {
                            <div class="px-6 py-4 text-center text-lg text-surface-950 dark:text-surface-0">
                                @if (planIngredient === '_yes_') {
                                    <i class="pi pi-check"></i>
                                } @else if (planIngredient === '_no_') {
                                    <i class="pi pi-minus text-surface-500 dark:text-white/64 opacity-64"></i>
                                } @else {
                                    <span>{{ planIngredient }}</span>
                                }
                            </div>
                        }
                    </div>
                }
            </div>
            <div
                class="lg:hidden bg-white/64 dark:bg-white/10 backdrop-blur-3xl p-6 rounded-3xl shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)] dark:shadow-sm"
            >
                @for (item of plans; track $index; let index = $index) {
                    <div>
                        <div class="px-6 py-4 shadow-custom-shadow bg-surface-0 dark:bg-white/16 rounded-xl text-lg font-medium text-surface-950 dark:text-surface-0">
                            {{ item }}
                        </div>
                        <div class="flex items-center justify-between py-4 border-b border-surface-200 dark:border-white/10">
                            @for (plan of planDetails; track $index; let index = $index) {
                                <div class="text-lg text-surface-950 dark:text-surface-0 text-center capitalize flex-1">
                                    {{ plan.title }}
                                </div>
                            }
                        </div>
                        <div class="flex items-center justify-between py-4">
                            @for (_ of [0, 1, 2, 3]; track $index; let j = $index) {
                                <div class="text-lg text-surface-950 dark:text-white/64 text-center flex-1">
                                    @if (planDetails[j].ingredients[index] === '_yes_') {
                                        <i class="pi pi-check"></i>
                                    } @else if (planDetails[j].ingredients[index] === '_no_') {
                                        <i class="pi pi-minus text-surface-500 dark:text-white/64 opacity-64"></i>
                                    } @else {
                                        <span>{{ planDetails[j].ingredients[index] }}</span>
                                    }
                                </div>
                            }
                        </div>
                    </div>
                }
            </div>
        </section>
    `
})
export class PricingCompareWidget {
    plans = ['3 Active Members', 'Up to 10 Components', 'High Request Limits', 'Unlimited Access', 'Advanced Analytics', 'Data Export', 'Prioritized Support', 'Real-time Updates', 'Batch Requests', 'Webhooks'];

    planDetails = [
        {
            title: 'basic',
            ingredients: ['$24', 'Unlimited', '10', '15', '_yes_', '_yes_', '_no_', '_no_', '_no_', '_no_']
        },
        {
            title: 'pro',
            ingredients: ['$64', 'Unlimited', 'Unlimited', '20', '_yes_', '_yes_', '_yes_', '_no_', '_no_', '_no_']
        },
        {
            title: 'premium',
            ingredients: ['$130', 'Unlimited', 'Unlimited', '25', '_yes_', '_yes_', '_yes_', '_yes_', '_no_', '_no_']
        },
        {
            title: 'team',
            ingredients: ['320$', 'Unlimited', 'Unlimited', 'Unlimited', '_yes_', '_yes_', '_yes_', '_yes_', '_yes_', '_yes_']
        }
    ];
}
