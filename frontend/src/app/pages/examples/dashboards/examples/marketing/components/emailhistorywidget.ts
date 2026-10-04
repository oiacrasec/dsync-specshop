import { Component, model, ViewChild } from '@angular/core';
import { FilterMatchMode } from 'primeng/api';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { AvatarModule } from 'primeng/avatar';

@Component({
    selector: 'email-history-widget',
    standalone: true,
    imports: [CommonModule, SectionCard, IconFieldModule, InputIconModule, ButtonModule, InputTextModule, FormsModule, TableModule, AvatarModule],
    template: ` <app-section-card>
        <div class="flex flex-wrap gap-2 items-center justify-between mb-6">
            <div>
                <h4 class="text-lg font-medium text-surface-950 dark:text-surface-0">Email History</h4>
                <p class="mt-1 text-sm text-surface-400 dark:text-white/64">This field displays the order history</p>
            </div>
            <div class="flex flex-wrap items-center gap-4">
                <p-icon-field>
                    <p-inputicon>
                        <i class="pi pi-search"></i>
                    </p-inputicon>
                    <input #inputEl pInputText [(ngModel)]="searchInput" (ngModelChange)="onFilter()" placeholder="Search..." />
                </p-icon-field>
                <div class="flex gap-4">
                    <p-button label="Filter" icon="pi pi-filter" rounded (onClick)="onFilter()" />
                    <p-button label="Export" icon="pi pi-download" severity="contrast" rounded />
                </div>
            </div>
        </div>
        <p-table
            #dt
            [value]="emailHistory"
            [(selection)]="selectedEmailHistory"
            selectionMode="multiple"
            [rowHover]="false"
            dataKey="id"
            paginator
            [rows]="10"
            [globalFilterFields]="filterFields"
            [rowsPerPageOptions]="[5, 10, 25]"
            showCurrentPageReport
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} products"
            [tableStyle]="{ 'min-width': '40rem' }"
        >
            <ng-template #header>
                <tr>
                    <th style="min-width:3rem">
                        <p-tableHeaderCheckbox />
                    </th>
                    <th style="min-width:6rem">ID</th>
                    <th style="min-width:10rem">Date</th>
                    <th style="min-width:12rem">Name</th>
                    <th style="min-width:12rem">Email Address</th>
                    <th style="min-width:10rem">Sent</th>
                    <th style="min-width:10rem">CTR</th>
                    <th style="min-width:10rem">Delivered Rate</th>
                    <th style="min-width:4rem"></th>
                </tr>
            </ng-template>
            <ng-template #body let-data>
                <tr [pSelectableRow]="data">
                    <td>
                        <p-tableCheckbox [value]="data" />
                    </td>
                    <td>
                        {{ data.id }}
                    </td>
                    <td>
                        {{ data.date }}
                    </td>
                    <td>
                        <div class="flex items-center gap-2">
                            <p-avatar [label]="data.name.shortValue" shape="circle" class="font-medium! text-sm!" [ngClass]="data.name.avatarStyle" />
                            <div class="flex-1 font-medium text-surface-950 dark:text-surface-0 line-clamp-1">{{ data.name.value }}</div>
                        </div>
                    </td>
                    <td>
                        {{ data.emailAddress }}
                    </td>
                    <td>
                        {{ data.sent }}
                    </td>
                    <td>
                        {{ data.ctr }}
                    </td>
                    <td>
                        {{ data.deliveredRate }}
                    </td>
                    <td>
                        <div class="flex items-end justify-end">
                            <p-button icon="pi pi-ellipsis-h" severity="secondary" text rounded />
                        </div>
                    </td>
                </tr>
            </ng-template>
        </p-table>
    </app-section-card>`,
    styles: `
        :host ::ng-deep {
            .p-datatable-tbody > tr.p-datatable-row-selected {
                background: var(--p-datatable-row-background);
                color: var(--p-datatable-row-color);
            }

            .p-datatable-tbody > tr.p-datatable-row-selected > td,
            .p-datatable-tbody > tr:has(+ .p-datatable-row-selected) > td {
                border-bottom-color: var(--p-datatable-body-cell-border-color);
            }
        }
    `,
    host: {
        style: 'display: contents'
    }
})
export class EmailHistoryWidget {
    filters = {
        global: { value: null, matchMode: FilterMatchMode.CONTAINS }
    };

    filterFields = ['id', 'date', 'name', 'emailAddress', 'sent', 'ctr', 'deliveredRate'];

    selectedEmailHistory: any;

    emailHistory = [
        {
            id: '#12546',
            date: 'May 5th, 2024',
            name: {
                avatarStyle: 'bg-lime-200! text-lime-950!',
                value: 'Jerome Bell',
                shortValue: 'JB'
            },
            emailAddress: 'jeromebell@gmail.com',
            sent: '5',
            ctr: '1.32%',
            deliveredRate: '100%'
        },
        {
            id: '#12545',
            date: 'May 5th, 2024',
            name: {
                avatarStyle: 'bg-indigo-200! text-indigo-950!',
                value: 'Annette Black',
                shortValue: 'AB'
            },
            emailAddress: 'hi@annetteblack.com',
            sent: '7',
            ctr: '6.32%',
            deliveredRate: '100%'
        },
        {
            id: '#12544',
            date: 'May 5th, 2024',
            name: {
                avatarStyle: 'bg-rose-200! text-rose-950!',
                value: 'Onyama Limba',
                shortValue: 'OL'
            },
            emailAddress: 'hi@onyamalimba.co',
            sent: '12',
            ctr: '9.45%',
            deliveredRate: '100%'
        },
        {
            id: '#12543',
            date: 'May 5th, 2024',
            name: {
                avatarStyle: 'bg-violet-200! text-violet-950!',
                value: 'Courtney Henry',
                shortValue: 'CH'
            },
            emailAddress: 'hi@courtneyhenry.com',
            sent: '4',
            ctr: '4.57%',
            deliveredRate: '100%'
        },
        {
            id: '#12542',
            date: 'May 5th, 2024',
            name: {
                avatarStyle: 'bg-cyan-200! text-cyan-950!',
                value: 'Dianne Russell',
                shortValue: 'DR'
            },
            emailAddress: 'hi@diannerussell.com',
            sent: '17',
            ctr: '7.21%',
            deliveredRate: '100%'
        },
        {
            id: '#12541',
            date: 'May 5th, 2024',
            name: {
                avatarStyle: 'bg-yellow-200! text-yellow-950!',
                value: 'Amy Elsner',
                shortValue: 'AE'
            },
            emailAddress: 'hi@amyelsner.com',
            sent: '9',
            ctr: '3.32%',
            deliveredRate: '100%'
        },
        {
            id: '#12540',
            date: 'May 5th, 2024',
            name: {
                avatarStyle: 'bg-blue-200! text-blue-950!',
                value: 'Arlene McCoy',
                shortValue: 'AM'
            },
            emailAddress: 'hi@arlenemccoy.com',
            sent: '11',
            ctr: '8.15%',
            deliveredRate: '100%'
        }
    ];

    searchInput = model<string>('');

    @ViewChild('dt', { static: false }) dt!: Table;

    onFilter() {
        const value = this.searchInput();

        this.dt.filterGlobal(value, this.filters.global.matchMode);
    }
}
