import { CommonModule } from '@angular/common';
import { Component, ContentChild, TemplateRef, AfterContentInit } from '@angular/core';

@Component({
    selector: 'app-section-card',
    standalone: true,
    imports: [CommonModule],
    template: `
        @if (hasTitle || hasDescription || hasAction) {
            <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                    @if (titleTemplate) {
                        <h4 class="text-lg font-medium text-surface-950 dark:text-surface-0">
                            <ng-container *ngTemplateOutlet="titleTemplate"></ng-container>
                        </h4>
                    }

                    @if (descriptionTemplate) {
                        <p class="mt-1 text-sm text-surface-500">
                            <ng-container *ngTemplateOutlet="descriptionTemplate"></ng-container>
                        </p>
                    }
                </div>

                @if (actionTemplate) {
                    <ng-container [ngTemplateOutlet]="actionTemplate"></ng-container>
                }
            </div>
        }

        <ng-content></ng-content>
        @if (footerTemplate) {
            <ng-container [ngTemplateOutlet]="footerTemplate"></ng-container>
        }
    `,
    host: {
        class: 'card'
    }
})
export class SectionCard implements AfterContentInit {
    @ContentChild('title') titleTemplate!: TemplateRef<any>;

    @ContentChild('description') descriptionTemplate!: TemplateRef<any>;

    @ContentChild('action') actionTemplate!: TemplateRef<any>;

    @ContentChild('footer') footerTemplate!: TemplateRef<any>;

    hasTitle: boolean = false;

    hasDescription: boolean = false;

    hasAction: boolean = false;

    ngAfterContentInit() {
        this.hasTitle = !!this.titleTemplate;

        this.hasDescription = !!this.descriptionTemplate;

        this.hasAction = !!this.actionTemplate;
    }
}
