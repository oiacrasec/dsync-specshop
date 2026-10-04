import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { generateRandomData } from '@/app/lib/utils';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { BarChart } from '@/app/pages/examples/dashboards/examples/ui/charts/barchart';
import { TableModule } from 'primeng/table';
import { AuthLogoWidget } from '@/app/pages/auth/components/authlogowidget';

@Component({
    selector: 'about-section-one-widget',
    standalone: true,
    imports: [CommonModule, SectionCard, BarChart, TableModule, AuthLogoWidget],
    template: ` <section class="landing-container relative py-12 lg:py-24">
        <div class="badge mx-auto w-fit">Feature</div>
        <h2 class="text-center text-4xl lg:text-5xl font-semibold mt-4 leading-none text-surface-950 dark:text-surface-0">
            Key Features for a<br class="hidden md:block" />
            Seamless Banking Experience
        </h2>
        <p class="mt-6 text-lg text-surface-500 dark:text-white/64 max-w-xl mx-auto text-center">Discover a range of features designed to provide secure, efficient, and user-friendly banking services.</p>
        <section-card class="flex-1 flex flex-col h-100 mt-14">
            <ng-template #title>
                <h4>Overview</h4>
            </ng-template>
            <ng-template #action>
                <div class="flex items-center gap-2">
                    <div class="px-3 py-1 rounded-full bg-surface-0 dark:bg-white/10 border dark:border-white/8 inline-flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-primary-500"></span>
                        <span class="text-sm font-medium text-surface-950 dark:text-surface-0">Revenue</span>
                    </div>
                </div>
            </ng-template>
            <div class="flex-1 mt-6 w-full overflow-auto">
                <bar-chart label="'Revenue'" [dataset]="randomData" tooltipPrefix="$" [option]="'month'" className="min-w-[560px] flex-1 h-full w-full cursor-pointer" [stepSize]="10000" />
            </div>
        </section-card>
        <div class="flex items-center gap-6 my-6">
            <span class="flex-1 h-px w-full bg-primary-500/15"></span>
            <auth-logo-widget className="w-10" />
            <span class="flex-1 h-px w-full bg-primary-500/15"></span>
        </div>
        <section-card class="flex-1 flex flex-col mt-14">
            <ng-template #title>Account History </ng-template>
            <ng-template #description>In this area you can see the flow of account.</ng-template>
            <div class="mt-10 overflow-auto">
                <p-table [value]="accountHistory" [tableStyle]="{ 'min-width': '40rem' }">
                    <ng-template #header>
                        <tr>
                            <th class="bg-transparent!">Name</th>
                            <th class="bg-transparent!">Date</th>
                            <th class="bg-transparent!">Amount</th>
                            <th class="bg-transparent!">Account</th>
                            <th class="bg-transparent!"></th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-account>
                        <tr class="bg-transparent!">
                            <td>{{ account.name }}</td>
                            <td>{{ account.date }}</td>
                            <td>
                                <div [ngClass]="{ 'text-red-600 dark:text-red-400': account.amount.orientation === 'down', 'text-green-600 dark:text-green-400': account.amount.orientation === 'up' }">
                                    {{ account.amount.value }}
                                </div>
                            </td>
                            <td>{{ account.account }}</td>
                            <td>
                                <button class="w-9 h-9 flex items-center justify-center"><i class="pi pi-ellipsis-h"></i></button>
                            </td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>
        </section-card>
    </section>`
})
export class AboutSectionOneWidget {
    randomData: any[] = [];

    ngOnInit() {
        this.randomData = generateRandomData('2020-10-27T00:00:00', '2023-11-03T00:00:00', 4, 10000, 50000);
    }

    accountHistory = [
        {
            name: 'Jerome Bell',
            date: 'May 5th, 2024',
            amount: {
                orientation: 'up',
                value: '+£12.875,98'
            },
            account: '**** **** 8288'
        },
        {
            name: 'Annette Black',
            date: 'Mar 17th, 2024',
            amount: {
                orientation: 'up',
                value: '+€7.245,44'
            },
            account: '**** **** 9284'
        },
        {
            name: 'Onyama Limba',
            date: 'May 24th, 2024',
            amount: {
                orientation: 'down',
                value: '-₺76.276,90'
            },
            account: '**** **** 2534'
        },
        {
            name: 'Courtney Henry',
            date: 'Jun 28th, 2024',
            amount: {
                orientation: 'down',
                value: '-£2.875,98'
            },
            account: '**** **** 8288'
        },
        {
            name: 'Dianne Russell',
            date: 'Jul 21th, 2024',
            amount: {
                orientation: 'up',
                value: '+$12.423,04'
            },
            account: '**** **** 8234'
        },
        {
            name: 'Amy Elsner',
            date: 'Jul 21th, 2024',
            amount: {
                orientation: 'up',
                value: '+€17.876,24'
            },
            account: '**** **** 9284'
        }
    ];
}
