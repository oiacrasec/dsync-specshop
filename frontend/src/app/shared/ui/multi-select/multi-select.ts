import { CommonModule } from '@angular/common';
import { Component, Input, Optional, Self } from '@angular/core';
import { ControlValueAccessor, FormsModule, NgControl } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';

export interface UiMultiSelectOption {
    label: string;
    value: string | number;
}

@Component({
    selector: 'ui-multi-select',
    standalone: true,
    imports: [CommonModule, FormsModule, MultiSelectModule],
    template: `
        @if (label) {
            <label [for]="inputId ?? id" [ngClass]="labelClass">{{ label }}</label>
        }

        <p-multiSelect
            [inputId]="inputId ?? id"
            [options]="options"
            [optionLabel]="optionLabel"
            [optionValue]="optionValue"
            [placeholder]="placeholder"
            [display]="display"
            [maxSelectedLabels]="maxSelectedLabels"
            [showClear]="showClear"
            [filter]="filter"
            [disabled]="disabled"
            [class]="resolvedClass"
            [appendTo]="appendTo"
            [panelStyleClass]="panelStyleClass"
            [(ngModel)]="value"
            [ngModelOptions]="{ standalone: true }"
            (ngModelChange)="handleChange($event)"
            (onBlur)="markTouched()"
        />

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
export class UiMultiSelect implements ControlValueAccessor {
    @Input() id?: string;
    @Input() inputId?: string;
    @Input() label?: string;
    @Input() helpText?: string;
    @Input() options: UiMultiSelectOption[] = [];
    @Input() optionLabel = 'label';
    @Input() optionValue = 'value';
    @Input() placeholder = 'Selecione';
    @Input() display: 'comma' | 'chip' = 'chip';
    @Input() maxSelectedLabels = 3;
    @Input() showClear = true;
    @Input() filter = true;
    @Input() appendTo: 'body' | string = 'body';
    @Input() labelClass = 'text-sm font-medium text-surface-600 dark:text-white/70';
    @Input() errorMessage?: string;
    @Input() errorClass = 'text-red-500';
    @Input() helpTextClass = 'text-xs text-surface-500 dark:text-white/64';
    @Input() styleClass?: string;
    @Input() panelStyleClass?: string;

    value: Array<string | number> = [];
    disabled = false;

    constructor(@Optional() @Self() public ngControl: NgControl) {
        if (this.ngControl) {
            this.ngControl.valueAccessor = this;
        }
    }

    private onChange: (value: Array<string | number>) => void = () => {};
    private onTouched: () => void = () => {};

    writeValue(value: Array<string | number> | null): void {
        this.value = Array.isArray(value) ? value : [];
    }

    registerOnChange(fn: (value: Array<string | number>) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    handleChange(value: Array<string | number> | null) {
        this.value = Array.isArray(value) ? value : [];
        this.onChange(this.value);
    }

    markTouched() {
        this.onTouched();
    }

    get resolvedClass() {
        return this.styleClass ? `${this.styleClass} w-full` : 'w-full';
    }

    get showError() {
        if (!this.errorMessage || !this.ngControl?.control) {
            return false;
        }
        return this.ngControl.control.touched && this.ngControl.control.invalid;
    }
}
