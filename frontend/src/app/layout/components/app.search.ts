import { Component, inject } from '@angular/core';
import { LayoutService } from '@/app/layout/service/layout.service';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { AutoFocusModule } from 'primeng/autofocus';

@Component({
    selector: '[app-search]',
    standalone: true,
    imports: [DialogModule, InputTextModule, AutoFocusModule],
    template: ` <p-dialog [(visible)]="searchBarActive" [breakpoints]="{ '992px': '75vw', '576px': '90vw' }" modal dismissableMask class="w-1/2 overflow-hidden! rounded-3xl!">
        <div class="search-container">
            <i class="pi pi-search"></i>
            <input pInputText type="text" [pAutoFocus]="true" class="p-inputtext search-input" placeholder="Search" (keydown.enter)="toggleSearchBar()" />
        </div>
    </p-dialog>`,
    styles: `
        :host ::ng-deep {
            .p-dialog-header {
                display: none;
            }
            .p-dialog-content {
                padding: 0px;
            }
        }
    `
})
export class AppSearch {
    layoutService = inject(LayoutService);

    toggleSearchBar() {
        this.layoutService.layoutState.update((value) => ({ ...value, searchBarActive: !value.searchBarActive }));
    }

    get searchBarActive(): boolean {
        return this.layoutService.layoutState().searchBarActive;
    }

    set searchBarActive(_val: boolean) {
        this.layoutService.layoutState.update((prev) => ({ ...prev, searchBarActive: _val }));
    }
}
