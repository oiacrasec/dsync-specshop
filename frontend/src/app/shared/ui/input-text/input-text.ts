import { CommonModule } from '@angular/common';
import { Component, inject, Input, ViewChild } from '@angular/core';
import { ControlValueAccessor, FormsModule, NgControl } from '@angular/forms';
import { InputMask, InputMaskModule } from 'primeng/inputmask';
import { InputTextModule } from 'primeng/inputtext';

@Component({
    selector: 'ui-input-text',
    standalone: true,
    imports: [CommonModule, FormsModule, InputTextModule, InputMaskModule],
    template: `
        @if (label) {
            <label [for]="inputId ?? id" [ngClass]="labelClass">{{ label }}</label>
        }
        @if (mask) {
            <p-inputmask
                #maskRef
                [inputId]="inputId ?? id"
                [mask]="mask"
                [slotChar]="slotChar"
                [autoClear]="autoClear"
                [keepBuffer]="keepBuffer"
                [showClear]="showClearMask"
                [unmask]="unmask"
                [placeholder]="resolvedPlaceholder"
                [autocomplete]="autocomplete"
                [readonly]="readonly"
                [disabled]="disabled"
                [class]="resolvedMaskHostClass"
                [styleClass]="resolvedMaskInputClass"
                [style]="inputStyle"
                [(ngModel)]="value"
                [ngModelOptions]="{ standalone: true }"
                (ngModelChange)="handleMaskChange($event)"
                (onInput)="handleMaskInput($event)"
                (onBlur)="handleMaskBlur()"
            />
        } @else {
            <input
                pInputText
                [id]="inputId ?? id"
                [name]="name"
                [type]="type"
                [attr.placeholder]="resolvedPlaceholder"
                [autocomplete]="autocomplete"
                [attr.inputmode]="inputMode"
                [attr.minlength]="minlength"
                [attr.maxlength]="maxlength"
                [attr.pattern]="pattern"
                [readonly]="readonly"
                [required]="required"
                [disabled]="disabled"
                [ngClass]="resolvedInputClass"
                [ngStyle]="inputStyle"
                [value]="displayValue"
                (input)="handleInput($event)"
                (blur)="markTouched()"
            />
        }
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
export class UiInputText implements ControlValueAccessor {
    @Input() id?: string;
    @Input() inputId?: string;
    @Input() name?: string;
    @Input() label?: string;
    @Input() errorMessage?: string;
    @Input() helpText?: string;
    @Input() labelClass = 'text-sm font-medium text-surface-600 dark:text-white/70';
    @Input() errorClass = 'text-red-500';
    @Input() helpTextClass = 'text-xs text-surface-500 dark:text-white/64';
    @Input() type = 'text';
    @Input() placeholder?: string;
    @Input() autocomplete?: string;
    @Input() inputMode?: string;
    @Input() minlength?: number;
    @Input() maxlength?: number;
    @Input() pattern?: string;
    @Input() mask?: string;
    @Input() slotChar = '_';
    @Input() autoClear = false;
    @Input() keepBuffer = false;
    @Input() showClearMask = false;
    @Input() unmask = true;
    @Input() clearOnIncompleteMask = true;
    @Input() readonly?: boolean;
    @Input() required?: boolean;
    @Input() styleClass?: string | string[] | Record<string, boolean>;
    @Input() inputStyle?: Record<string, string | number>;

    value: string | null = null;
    disabled = false;
    @ViewChild('maskRef') maskRef?: InputMask;

    public ngControl = inject(NgControl, { optional: true, self: true });

    constructor() {
        if (this.ngControl) {
            this.ngControl.valueAccessor = this;
        }
    }

    private onChange: (value: string | null) => void = () => {};
    private onTouched: () => void = () => {};

    writeValue(value: string | null | undefined): void {
        this.value = value ?? null;
    }

    registerOnChange(fn: (value: string | null) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    handleInput(event: Event) {
        const target = event.target as HTMLInputElement;
        const nextValue = target.value;

        this.value = nextValue;
        this.onChange(nextValue);
    }

    handleMaskChange(value: string | null) {
        this.value = value;
        this.onChange(value);
    }

    handleMaskInput(event: { value?: string | null } | Event) {
        const nextValue = typeof event === 'object' && event !== null && 'value' in event ? (event.value ?? '') : (this.value ?? '');

        this.value = String(nextValue);
        this.onChange(this.value);
    }

    handleMaskBlur() {
        if (this.clearOnIncompleteMask && this.isIncompleteMaskValue(this.value)) {
            this.clearMaskValue();
        }

        this.markTouched();
    }

    markTouched() {
        this.onTouched();
    }

    get displayValue() {
        return this.value ?? '';
    }

    get resolvedPlaceholder() {
        return this.placeholder;
    }

    get resolvedMaskHostClass() {
        return 'w-full';
    }

    get resolvedMaskInputClass() {
        const customClass = typeof this.styleClass === 'string' ? this.styleClass.trim() : '';

        return customClass ? `${customClass} w-full` : 'w-full';
    }

    get resolvedInputClass() {
        if (!this.styleClass) {
            return 'w-full';
        }

        return [this.styleClass, 'w-full'];
    }

    private isIncompleteMaskValue(value: string | null) {
        const currentValue = (value ?? '').trim();

        if (!currentValue || !this.mask) {
            return false;
        }

        if (currentValue.includes(this.slotChar)) {
            return true;
        }

        const requiredTokens = (this.mask.match(/[9a*]/g) ?? []).length;

        if (!requiredTokens) {
            return false;
        }

        const typedTokens = currentValue.replace(/\W/g, '').length;

        return typedTokens < requiredTokens;
    }

    private clearMaskValue() {
        this.maskRef?.clear();
        this.value = '';
        this.onChange('');
        queueMicrotask(() => {
            this.value = '';
            this.onChange('');
        });
    }

    get showError() {
        if (!this.errorMessage || !this.ngControl?.control) {
            return false;
        }

        return this.ngControl.control.touched && this.ngControl.control.invalid;
    }
}
