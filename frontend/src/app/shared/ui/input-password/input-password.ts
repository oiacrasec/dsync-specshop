import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject, Input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NgControl } from '@angular/forms';
import { PasswordModule } from 'primeng/password';

@Component({
    selector: 'ui-input-password',
    standalone: true,
    imports: [CommonModule, FormsModule, PasswordModule],
    template: `
        @if (label) {
            <label [for]="inputId ?? id" [ngClass]="labelClass">{{ label }}</label>
        }

        <p-password
            [inputId]="inputId ?? id"
            [placeholder]="placeholder"
            [feedback]="feedback"
            [toggleMask]="toggleMask"
            [disabled]="disabled"
            [promptLabel]="promptLabel"
            [weakLabel]="weakLabel"
            [mediumLabel]="mediumLabel"
            [strongLabel]="strongLabel"
            [class]="resolvedClass"
            [inputStyleClass]="resolvedInputStyleClass"
            [inputStyle]="inputStyle"
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
export class UiInputPassword implements ControlValueAccessor, AfterViewInit {
    @Input() id?: string;
    @Input() inputId?: string;
    @Input() name?: string;
    @Input() autocomplete?: string;
    @Input() label?: string;
    @Input() placeholder?: string;
    @Input() helpText?: string;
    @Input() feedback = true;
    @Input() toggleMask = true;
    @Input() promptLabel = 'Digite uma senha';
    @Input() weakLabel = 'Fraca';
    @Input() mediumLabel = 'Media';
    @Input() strongLabel = 'Forte';
    @Input() labelClass = 'text-sm font-medium text-surface-600 dark:text-white/70';
    @Input() errorMessage?: string;
    @Input() errorClass = 'text-red-500';
    @Input() helpTextClass = 'text-xs text-surface-500 dark:text-white/64';
    @Input() styleClass?: string;
    @Input() inputStyleClass?: string;
    @Input() inputStyle?: Record<string, string | number>;

    value: string | null = null;
    disabled = false;
    private hostElement = inject(ElementRef<HTMLElement>);

    public ngControl = inject(NgControl, { optional: true, self: true });

    constructor() {
        if (this.ngControl) {
            this.ngControl.valueAccessor = this;
        }
    }

    private onChange: (value: string | null) => void = () => {};
    private onTouched: () => void = () => {};

    writeValue(value: string | null): void {
        this.value = value;
        queueMicrotask(() => this.applyNativeInputAttributes());
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

    handleChange(value: string | null) {
        this.value = value;
        this.onChange(value);
        queueMicrotask(() => this.applyNativeInputAttributes());
    }

    markTouched() {
        this.onTouched();
    }

    ngAfterViewInit(): void {
        this.applyNativeInputAttributes();
        setTimeout(() => this.applyNativeInputAttributes());
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

    private applyNativeInputAttributes() {
        const input = this.hostElement.nativeElement.querySelector('input');

        if (!(input instanceof HTMLInputElement)) {
            return;
        }

        if (this.name) {
            input.setAttribute('name', this.name);
        }

        if (this.autocomplete) {
            input.setAttribute('autocomplete', this.autocomplete);
        }
    }
}
