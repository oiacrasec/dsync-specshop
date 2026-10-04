import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { ButtonModule } from 'primeng/button';

type ButtonIconPosition = 'left' | 'right' | 'top' | 'bottom';
type ButtonSeverity = 'success' | 'info' | 'warn' | 'danger' | 'help' | 'primary' | 'secondary' | 'contrast' | null | undefined;

@Component({
    selector: 'ui-button',
    standalone: true,
    imports: [CommonModule, ButtonModule],
    template: `
        <p-button
            [label]="label"
            [icon]="icon"
            [iconPos]="iconPos"
            [severity]="severity"
            [text]="text"
            [outlined]="outlined"
            [raised]="raised"
            [rounded]="rounded"
            [size]="size"
            [badge]="badge"
            [badgeClass]="badgeClass"
            [disabled]="disabled"
            [loading]="loading"
            [type]="type"
            [class]="styleClass"
            [style]="style"
            [ariaLabel]="ariaLabel"
            (onClick)="onClick.emit($event)"
        />
    `,
    styles: [
        `
        :host {
            display: contents;
        }
        `
    ]
})
export class UiButton {
    @Input() label?: string;
    @Input() icon?: string;
    @Input() iconPos: ButtonIconPosition = 'left';
    @Input() severity?: ButtonSeverity;
    @Input({ transform: booleanAttribute }) text = false;
    @Input({ transform: booleanAttribute }) outlined = false;
    @Input({ transform: booleanAttribute }) raised = false;
    @Input({ transform: booleanAttribute }) rounded = false;
    @Input() size?: 'small' | 'large';
    @Input() badge?: string;
    @Input() badgeClass?: string;
    @Input({ transform: booleanAttribute }) disabled = false;
    @Input({ transform: booleanAttribute }) loading = false;
    @Input() type: string = 'button';
    @Input() styleClass?: string;
    @Input() style?: Record<string, string | number>;
    @Input() ariaLabel?: string;

    @Output() onClick = new EventEmitter<Event>();
}
