import { Component } from '@angular/core';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { MenuModule } from 'primeng/menu';

@Component({
    selector: 'leader-board-widget',
    standalone: true,
    imports: [CommonModule, ButtonModule, MenuModule, AvatarModule, SectionCard],
    template: ` <app-section-card class="flex flex-col">
        <ng-template #title>Leaderboard</ng-template>
        <ng-template #action>
            <div>
                <p-button icon="pi pi-ellipsis-h" severity="secondary" text (onClick)="menu.toggle($event)" />
                <p-menu #menu [model]="items" [popup]="true" appendTo="body" />
            </div>
        </ng-template>
        <div class="flex-1 mt-6 flex flex-col justify-between gap-6">
            @for (item of leaderboard; track item.shortName) {
                <div class="flex items-center gap-2">
                    <div class="flex-1 flex items-center gap-3">
                        <p-avatar [label]="item.shortName" class="w-10! h-10! rounded-lg! font-medium!" [class]="item.avatarStyle" />
                        <span class="flex-1 font-medium text-surface-950 dark:text-surface-0 line-clamp-1">{{ item.name }}</span>
                    </div>
                    <div class="font-medium text-surface-950 dark:text-surface-0">{{ item.value }}</div>
                    <div>
                        @if (item.status === 'success') {
                            <i class="pi pi-arrow-up-right text-green-600"></i>
                        } @else {
                            <i class="pi pi-arrow-down-left text-red-600"></i>
                        }
                    </div>
                </div>
            }
        </div>
    </app-section-card>`
})
export class LeaderBoardWidget {
    leaderboard = [
        {
            shortName: 'JB',
            name: 'Jerome Bell',
            value: '$124.44',
            status: 'success',
            avatarStyle: 'bg-lime-200! text-lime-950!'
        },
        {
            shortName: 'AB',
            name: 'Annette Black',
            value: '$67.32',
            status: 'success',
            avatarStyle: 'bg-indigo-200! text-indigo-950!'
        },
        {
            shortName: 'OL',
            name: 'Onyama Limba',
            value: '$50.23',
            status: 'success',
            avatarStyle: 'bg-rose-200! text-rose-950!'
        },
        {
            shortName: 'CH',
            name: 'Courtney Henry',
            value: '$235.23',
            status: 'success',
            avatarStyle: 'bg-violet-200! text-violet-950!'
        },
        {
            shortName: 'DR',
            name: 'Dianne Russell ',
            value: '$66.54',
            status: 'success',
            avatarStyle: 'bg-cyan-200! text-cyan-950!'
        }
    ];

    items = [
        {
            label: 'Options',
            items: [
                {
                    label: 'Refresh',
                    icon: 'pi pi-refresh'
                },
                {
                    label: 'Export',
                    icon: 'pi pi-upload'
                }
            ]
        }
    ];
}
