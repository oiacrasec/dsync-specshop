import { CommonModule } from '@angular/common';
import { Component, Input, Optional, Self } from '@angular/core';
import { ControlValueAccessor, FormsModule, NgControl } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
    selector: 'ui-checkbox',
    standalone: true,
    imports: [CommonModule, FormsModule, CheckboxModule],
    template: `
        <div class="flex items-center gap-2" [style.margin-top]="marginTopStyle">
            <p-checkbox [inputId]="inputId ?? id" [binary]="binary" [disabled]="disabled" [(ngModel)]="value" [ngModelOptions]="{ standalone: true }" (ngModelChange)="handleChange($event)" (onBlur)="markTouched()" />
            @if (label) {
                <label [for]="inputId ?? id" [ngClass]="labelClass">{{ label }}</label>
            }
        </div>
        @if (helpText) {
            <small [ngClass]="helpTextClass">{{ helpText }}</small>
        }
        @if (showError) {
            <small [ngClass]="errorClass">{{ errorMessage }}</small>
        }
    `,
    styles: [
        `
            :host {
                display: contents;
            }
        `
    ]
})
export class UiCheckbox implements ControlValueAccessor {
    @Input() id?: string;
    @Input() inputId?: string;
    @Input() label?: string;
    @Input() helpText?: string;
    @Input() binary = true;
    @Input() labelClass = 'text-sm text-surface-600 dark:text-white/70';
    @Input() errorMessage?: string;
    @Input() errorClass = 'text-red-500';
    @Input() helpTextClass = 'text-xs text-surface-500 dark:text-white/64';
    @Input() marginTop?: number | string;

    value = false;
    disabled = false;

    constructor(@Optional() @Self() public ngControl: NgControl) {
        if (this.ngControl) {
            this.ngControl.valueAccessor = this;
        }
    }

    private onChange: (value: boolean) => void = () => {};
    private onTouched: () => void = () => {};

    writeValue(value: boolean | null): void {
        this.value = Boolean(value);
    }

    registerOnChange(fn: (value: boolean) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    handleChange(value: boolean) {
        this.value = value;
        this.onChange(value);
    }

    markTouched() {
        this.onTouched();
    }

    get showError() {
        if (!this.errorMessage || !this.ngControl?.control) {
            return false;
        }

        return this.ngControl.control.touched && this.ngControl.control.invalid;
    }

    get marginTopStyle() {
        if (this.marginTop === undefined || this.marginTop === null || this.marginTop === '') {
            return null;
        }

        if (typeof this.marginTop === 'number') {
            return `${this.marginTop}px`;
        }

        return this.marginTop;
    }
}
