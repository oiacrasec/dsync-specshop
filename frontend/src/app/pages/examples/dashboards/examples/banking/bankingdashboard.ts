import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatWidget } from '@/app/pages/examples/dashboards/examples/banking/components/statwidget';
import { OverviewWidget } from '@/app/pages/examples/dashboards/examples/banking/components/overviewwidget';
import { CreditWidget } from '@/app/pages/examples/dashboards/examples/banking/components/creditwidget';
import { AccountHistoryWidget } from '@/app/pages/examples/dashboards/examples/banking/components/accounthistorywidget';
import { LastCardMovementsWidget } from '@/app/pages/examples/dashboards/examples/banking/components/lastcardmovementswidget';

@Component({
    selector: 'banking-dashboard',
    standalone: true,
    imports: [CommonModule, StatWidget, OverviewWidget, CreditWidget, AccountHistoryWidget, LastCardMovementsWidget],
    template: ` <div class="flex flex-col gap-6">
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div class="flex flex-col gap-6 flex-1 xl:col-span-2">
                <stat-widget />
                <overview-widget />
            </div>
            <credit-widget />
        </div>
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div class="flex flex-col gap-6 flex-1 xl:col-span-2">
                <account-history-widget />
            </div>
            <last-card-movements-widget />
        </div>
    </div>`
})
export class BankingDashboard {}
