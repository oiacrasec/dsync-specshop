import { CommonModule } from '@angular/common';
import { Component, Input, Optional, Self } from '@angular/core';
import { ControlValueAccessor, FormsModule, NgControl } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
    selector: 'ui-input-date',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePickerModule],
    template: `
        @if (label) {
            <label [for]="inputId ?? id" [ngClass]="labelClass">{{ label }}</label>
        }
        <p-datepicker
            [inputId]="inputId ?? id"
            [attr.name]="name"
            [placeholder]="resolvedPlaceholder"
            [showIcon]="showIcon"
            [dateFormat]="resolvedDateFormat"
            [dataType]="dataType"
            [showButtonBar]="showButtonBar"
            [minDate]="minDate"
            [maxDate]="maxDate"
            [view]="view"
            [readonlyInput]="readonly"
            [required]="required"
            [disabled]="disabled"
            [class]="resolvedClass"
            [appendTo]="appendTo"
            [inputStyle]="inputStyle"
            [inputStyleClass]="resolvedInputStyleClass"
            [(ngModel)]="value"
            [ngModelOptions]="{ standalone: true }"
            (onInput)="handleInput($event)"
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
export class UiInputDate implements ControlValueAccessor {
    @Input() id?: string;
    @Input() inputId?: string;
    @Input() name?: string;
    @Input() label?: string;
    @Input() errorMessage?: string;
    @Input() helpText?: string;
    @Input() labelClass = 'text-sm font-medium text-surface-600 dark:text-white/70';
    @Input() errorClass = 'text-red-500';
    @Input() helpTextClass = 'text-xs text-surface-500 dark:text-white/64';
    @Input() placeholder?: string;
    @Input() minDate?: Date;
    @Input() maxDate?: Date;
    @Input() showIcon = true;
    @Input() dateFormat?: string;
    @Input() dataType: 'string' | 'date' = 'string';
    @Input() showButtonBar = false;
    @Input() view: 'date' | 'month' | 'year' = 'date';
    @Input() readonly?: boolean;
    @Input() required: string | boolean = false;
    @Input() styleClass?: string;
    @Input() inputStyleClass?: string;
    @Input() appendTo?: HTMLElement | 'body';
    @Input() inputStyle?: Record<string, string | number>;
    @Input() useMask = true;
    @Input() locale?: string;

    value = '';
    disabled = false;

    private dateOrder: Array<'d' | 'm' | 'y'> = ['d', 'm', 'y'];
    private maskSeparator = '/';

    constructor(@Optional() @Self() public ngControl: NgControl) {
        if (this.ngControl) {
            this.ngControl.valueAccessor = this;
        }
        this.initLocale();
    }

    private onChange: (value: string) => void = () => {};
    private onTouched: () => void = () => {};

    writeValue(value: string | Date | null | undefined): void {
        if (value == null) {
            this.value = '';
            return;
        }
        if (typeof value === 'string' && this.dataType === 'string') {
            this.value = this.formatFromIso(value);
            return;
        }
        if (value instanceof Date) {
            const iso = this.toIsoFromDate(value);
            this.value = this.formatFromIso(iso);
            return;
        }
        this.value = String(value);
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    handleChange(value: string | Date | null) {
        if (this.useMask && this.dataType === 'string' && typeof value === 'string') {
            const masked = this.applyMask(value);
            this.value = masked;
            const iso = this.toIsoFromDisplay(masked);
            this.onChange(iso ?? '');
            return;
        }
        if (value instanceof Date) {
            const iso = this.toIsoFromDate(value);
            this.value = this.formatFromIso(iso);
            this.onChange(iso);
            return;
        }
        this.value = value ? String(value) : '';
        const iso = this.toIsoFromDisplay(this.value);
        this.onChange(iso ?? '');
    }

    handleInput(event: any) {
        if (!this.useMask || this.dataType !== 'string') {
            return;
        }

        const rawValue = typeof event === 'string' ? event : (event?.value ?? event?.target?.value ?? event?.originalEvent?.target?.value ?? '');

        if (typeof rawValue !== 'string') {
            return;
        }

        const masked = this.applyMask(rawValue);
        this.value = masked;
        const iso = this.toIsoFromDisplay(masked);
        this.onChange(iso ?? '');
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

    private initLocale() {
        const lang = (this.locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US')).toLowerCase();
        const parts = new Intl.DateTimeFormat(lang, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).formatToParts(new Date(2001, 10, 22));

        const order: Array<'d' | 'm' | 'y'> = [];
        let separator = '/';

        for (const part of parts) {
            if (part.type === 'day') {
                order.push('d');
            } else if (part.type === 'month') {
                order.push('m');
            } else if (part.type === 'year') {
                order.push('y');
            } else if (part.type === 'literal' && separator === '/') {
                const trimmed = part.value.trim();
                if (trimmed) {
                    separator = trimmed[0];
                }
            }
        }

        if (order.length === 3) {
            this.dateOrder = order;
        }
        this.maskSeparator = separator;
    }

    private applyMask(raw: string) {
        const digits = raw.replace(/\D/g, '');
        const maxLength = 8;
        const clipped = digits.slice(0, maxLength);

        const sizes: Record<'d' | 'm' | 'y', number> = { d: 2, m: 2, y: 4 };
        const segments: string[] = [];
        let index = 0;

        for (const part of this.dateOrder) {
            const size = sizes[part];
            const chunk = clipped.slice(index, index + size);
            if (!chunk) {
                break;
            }
            segments.push(this.normalizeSegment(part, chunk));
            index += chunk.length;
            if (chunk.length < size) {
                break;
            }
        }

        return segments.join(this.maskSeparator);
    }

    private toIsoFromDisplay(display: string) {
        const digits = display.replace(/\D/g, '');
        if (digits.length < 8) {
            return null;
        }
        const map: Record<'d' | 'm' | 'y', string> = { d: '', m: '', y: '' };
        let index = 0;
        for (const part of this.dateOrder) {
            const size = part === 'y' ? 4 : 2;
            map[part] = digits.slice(index, index + size);
            index += size;
        }
        if (!map.y || !map.m || !map.d) {
            return null;
        }
        return `${map.y}-${map.m}-${map.d}`;
    }

    private toIsoFromDate(date: Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private normalizeSegment(part: 'd' | 'm' | 'y', value: string) {
        if (value.length < 2 || part === 'y') {
            return part === 'y' && value.length > 4 ? value.slice(0, 4) : value;
        }
        const num = Number(value);
        if (Number.isNaN(num)) {
            return value;
        }
        if (part === 'd') {
            return String(Math.min(Math.max(num, 1), 31)).padStart(2, '0');
        }
        if (part === 'm') {
            return String(Math.min(Math.max(num, 1), 12)).padStart(2, '0');
        }
        return value;
    }

    private formatFromIso(value: string) {
        const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!isoMatch) {
            return value;
        }
        const [, year, month, day] = isoMatch;
        const map: Record<'d' | 'm' | 'y', string> = { d: day, m: month, y: year };
        return this.dateOrder.map((part) => map[part]).join(this.maskSeparator);
    }

    get resolvedDateFormat() {
        if (this.dateFormat) {
            return this.dateFormat;
        }

        const map: Record<'d' | 'm' | 'y', string> = { d: 'dd', m: 'mm', y: 'yy' };
        return this.dateOrder.map((part) => map[part]).join(this.maskSeparator);
    }

    get resolvedPlaceholder() {
        if (this.placeholder) {
            return this.placeholder;
        }

        const map: Record<'d' | 'm' | 'y', string> = { d: 'dd', m: 'mm', y: 'yyyy' };
        return this.dateOrder.map((part) => map[part]).join(this.maskSeparator);
    }

    get showError() {
        if (!this.errorMessage || !this.ngControl?.control) {
            return false;
        }
        return this.ngControl.control.touched && this.ngControl.control.invalid;
    }
}
