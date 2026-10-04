import { CommonModule } from '@angular/common';
import { Component, Input, Optional, Self } from '@angular/core';
import { ControlValueAccessor, FormsModule, NgControl } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
    selector: 'ui-input-number',
    standalone: true,
    imports: [CommonModule, FormsModule, InputNumberModule],
    template: `
        @if (label) {
            <label [for]="inputId ?? id" [ngClass]="labelClass">{{ label }}</label>
        }
        <p-inputnumber
            [inputId]="inputId ?? id"
            [min]="min"
            [max]="max"
            [useGrouping]="useGrouping"
            [mode]="mode"
            [prefix]="prefix"
            [suffix]="suffix"
            [placeholder]="placeholder"
            [step]="step"
            [minFractionDigits]="minFractionDigits"
            [maxFractionDigits]="maxFractionDigits"
            [showButtons]="showButtons"
            [buttonLayout]="buttonLayout!"
            [incrementButtonClass]="incrementButtonClass"
            [decrementButtonClass]="decrementButtonClass"
            [locale]="locale"
            [class]="resolvedClass"
            [inputStyleClass]="resolvedInputStyleClass"
            [inputStyle]="inputStyle"
            [disabled]="disabled"
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
    providers: [],
    styles: [
        `
            :host {
                display: contents;
            }
        `
    ]
})
export class UiInputNumber implements ControlValueAccessor {
    @Input() id?: string;
    @Input() inputId?: string;
    @Input() label?: string;
    @Input() errorMessage?: string;
    @Input() helpText?: string;
    @Input() labelClass = 'text-sm font-medium text-surface-600 dark:text-white/70';
    @Input() errorClass = 'text-red-500';
    @Input() helpTextClass = 'text-xs text-surface-500 dark:text-white/64';
    @Input() min?: number;
    @Input() max?: number;
    @Input() useGrouping?: boolean;
    @Input() mode?: string;
    @Input() prefix?: string;
    @Input() suffix?: string;
    @Input() placeholder?: string;
    @Input() step?: number;
    @Input() minFractionDigits?: number;
    @Input() maxFractionDigits?: number;
    @Input() showButtons?: boolean;
    @Input() buttonLayout?: string;
    @Input() incrementButtonClass?: string;
    @Input() decrementButtonClass?: string;
    @Input() locale?: string;
    @Input() styleClass?: string;
    @Input() inputStyleClass?: string;
    @Input() inputStyle?: Record<string, string | number>;

    value: number | null = null;
    disabled = false;

    constructor(@Optional() @Self() public ngControl: NgControl) {
        if (this.ngControl) {
            this.ngControl.valueAccessor = this;
        }
    }

    private onChange: (value: number | null) => void = () => {};
    private onTouched: () => void = () => {};

    writeValue(value: number | null): void {
        this.value = value;
    }

    registerOnChange(fn: (value: number | null) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    handleChange(value: number | null) {
        this.value = value;
        this.onChange(value);
    }

    markTouched() {
        this.onTouched();
    }

    get resolvedClass() {
        return this.styleClass ? `${this.styleClass} w-full` : 'w-full';
    }

    get resolvedInputStyleClass() {
        return this.inputStyleClass ? `${this.inputStyleClass} w-full` : 'w-full';
    }

    get showError() {
        if (!this.errorMessage || !this.ngControl?.control) {
            return false;
        }
        return this.ngControl.control.touched && this.ngControl.control.invalid;
    }
}
