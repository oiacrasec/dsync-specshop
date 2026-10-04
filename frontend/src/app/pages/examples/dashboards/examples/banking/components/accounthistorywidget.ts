import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { TableModule } from 'primeng/table';

@Component({
    selector: 'account-history-widget',
    standalone: true,
    imports: [CommonModule, SectionCard, ButtonModule, TableModule],
    template: ` <section-card>
        <ng-template #title>Account History</ng-template>
        <ng-template #action>
            <p-button label="View All" rounded text severity="contrast" class="py-0.5! px-1.5! text-sm!" />
        </ng-template>
        <ng-template #description>In this area you can see the flow of account.</ng-template>
        <div class="mt-10 overflow-auto">
            <p-table [value]="accountHistory" [tableStyle]="{ 'min-width': '40rem' }">
                <ng-template #header>
                    <tr>
                        <th>Name</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Account</th>
                        <th></th>
                    </tr>
                </ng-template>
                <ng-template #body let-data>
                    <tr>
                        <td>
                            {{ data.name }}
                        </td>
                        <td>
                            {{ data.date }}
                        </td>
                        <td>
                            <div [ngClass]="{ 'text-red-600 dark:text-red-400': data?.amount?.orientation === 'down', 'text-green-600 dark:text-green-400': data?.amount?.orientation === 'up' }">
                                {{ data?.amount.value }}
                            </div>
                        </td>
                        <td>
                            {{ data.account }}
                        </td>
                        <td>
                            <div class="flex items-end justify-end">
                                <button class="w-9 h-9 flex items-center justify-center">
                                    <i class="pi pi-ellipsis-h"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                </ng-template>
            </p-table>
        </div>
    </section-card>`,
    styles: `
        :host ::ng-deep {
            .p-datatable {
                .p-datatable-thead > tr th {
                    background: transparent;
                }

                .p-datatable-tbody > tr {
                    background: transparent;
                }
            }
        }
    `,
    host: {
        style: 'display: contents'
    }
})
export class AccountHistoryWidget {
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
