import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PatternWidget } from '../../components/patternwidget';
import { CustomersLogoWidget } from '../../components/customerslogowidget';

@Component({
    selector: 'pricing-hero-widget',
    standalone: true,
    imports: [CommonModule, PatternWidget, CustomersLogoWidget],
    template: `
        <section class="animate-fadein animate-duration-300 animate-ease-in relative lg:pb-14 lg:pt-52 pt-36 pb-10 overflow-hidden">
            <div class="landing-container mx-auto relative z-20">
                <h1 class="text-4xl lg:text-6xl font-semibold text-surface-950 dark:text-surface-0 text-center">
                    Choose the Right<br />
                    Plan for Your Financial Needs
                </h1>
                <p class="mt-8 lg:text-xl text-surface-600 dark:text-white/64 max-w-3xl text-center mx-auto">
                    Explore our range of tailored banking packages designed to provide secure, efficient, and comprehensive financial services for individuals and teams.
                </p>
                <div class="mt-10 flex items-center gap-6 justify-center">
                    <div (click)="isYearly = false" class="cursor-pointer text-surface-900 dark:text-surface-0 text-xl font-medium">Monthly</div>
                    <button (click)="isYearly = !isYearly" class="w-18 h-9 rounded-full relative bg-surface-100 hover:bg-surface-50 dark:bg-surface-900 dark:hover:bg-surface-800 border border-surface-200 dark:border-surface-800 transition-all">
                        <span class="w-7 h-7 rounded-full bg-primary-500 absolute top-[0.2rem] transition-all ease-in-out duration-200" [ngClass]="isYearly ? 'left-[calc(100%-2rem)]' : 'left-1'"></span>
                    </button>
                    <div (click)="isYearly = true" class="cursor-pointer text-surface-900 dark:text-surface-0 text-xl font-medium">Yearly</div>
                </div>
                <div
                    class="mt-14 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 rounded-3xl border-white/10 bg-white/45 dark:bg-surface-950 divide-x divide-primary-500/10 backdrop-blur-[90px] divide-y md:divide-y-0 shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)] dark:shadow-md"
                >
                    @for (data of pricingData; track $index; let i = $index) {
                        <div class="p-6">
                            <div class="badge w-fit capitalize border-none">
                                {{ data.type }}
                            </div>
                            <div class="mt-8 text-surface-950 dark:text-surface-0">
                                <span class="text-6xl font-semibold mr-2.5">{{ data.price[isYearly ? 'yearly' : 'monthly'] }}</span>
                                <span class="text-2xl">/ {{ isYearly ? 'Yearly' : 'Monthly' }}</span>
                            </div>
                            <p class="mt-8 text-surface-500 dark:text-white/64 text-lg text-left">
                                {{ data.description }}
                            </p>
                            <button class="mt-8 button-primary w-full">Get Started</button>
                            <div class="w-full h-px bg-surface-200 dark:bg-surface-800 my-8"></div>
                            <div class="flex flex-col gap-3">
                                @for (content of data.ingredients; track $index; let j = $index) {
                                    <div class="flex items-center gap-3 text-surface-950 dark:text-white/64">
                                        <i class="pi pi-check leading-none"></i>
                                        <span class="flex-1 body-medium text-left">{{ content }}</span>
                                    </div>
                                }
                            </div>
                        </div>
                    }
                </div>
            </div>
            <pattern-widget left-class="top-0" right-class="top-0" />
            <customers-logo-widget class="py-16 mt-20 landing-container mx-auto" />
        </section>
    `
})
export class PricingHeroWidget {
    isYearly = false;

    pricingData = [
        {
            type: 'basic',
            price: {
                yearly: '$48',
                monthly: '$24'
            },
            description: 'Our essential package offers core features at an affordable price, perfect for budget-conscious customers.',
            ingredients: ['Simple Budget Management', 'Fund Transfers', 'Limited Support']
        },
        {
            type: 'pro',
            price: {
                yearly: '$128',
                monthly: '$64'
            },
            description: 'Elevate your experience with our Pro package, unlocking advanced features and enhanced performance',
            ingredients: ['Simple Budget Management', 'Fund Transfers', 'Limited Support', 'Real-Time Alerts']
        },
        {
            type: 'premium',
            price: {
                yearly: '$260',
                monthly: '$130'
            },
            description: 'Experience ultimate luxury and exclusivity with our Premium package, offering unmatched benefits and personalization',
            ingredients: ['Simple Budget Management', 'Fund Transfers', 'All Pro Features', 'Higher Transaction Limits', 'Advanced Investment Tools', 'Rewards Program']
        },
        {
            type: 'team',
            price: {
                yearly: '$640',
                monthly: '$320'
            },
            description: 'It features advanced tools, user accounts and collaborative planning for secure, efficient financial management.',
            ingredients: ['Simple Budget Management', 'Fund Transfers', 'All Premium Features', 'Multiple User Accounts', 'Team Management Tools', 'Advanced Security Features', 'Dedicated Support Team', 'Custom Account Settings']
        }
    ];
}
