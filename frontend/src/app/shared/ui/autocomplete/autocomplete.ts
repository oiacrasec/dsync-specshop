import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnDestroy, Output } from '@angular/core';
import { ControlValueAccessor, FormsModule, NgControl } from '@angular/forms';
import { Observable, Subject, of, timer } from 'rxjs';
import { catchError, distinctUntilChanged, finalize, map, switchMap, takeUntil } from 'rxjs/operators';
import { AutoCompleteModule } from 'primeng/autocomplete';

export interface UiLookupOption {
    value: string | number;
    label: string;
    [key: string]: unknown;
}

export interface UiLookupQuery {
    q?: string;
    pk?: string | number;
    first?: number;
    rows?: number;
}

export interface UiLookupOptionsResponse {
    data: UiLookupOption[];
    totalRecords: number;
    first: number;
    rows: number;
    hasNext: boolean;
}

export type UiLookupOptionsProvider = (query: UiLookupQuery) => Observable<UiLookupOptionsResponse>;

interface UiAutocompleteCompleteEvent {
    query: string;
}

interface UiAutocompleteDropdownClickEvent {
    query?: string;
}

interface UiAutocompleteSearchRequest {
    query: UiAutocompleteNormalizedQuery;
    debounceMs: number;
    triggerId: number;
}

interface UiAutocompleteNormalizedQuery {
    q: string;
    first: number;
    rows: number;
    pk?: string | number;
}

@Component({
    selector: 'ui-autocomplete',
    standalone: true,
    imports: [CommonModule, FormsModule, AutoCompleteModule],
    template: `
        @if (label) {
            <label [for]="inputId ?? id" [ngClass]="labelClass">{{ label }}</label>
        }

        <p-autocomplete
            [inputId]="inputId ?? id"
            [placeholder]="placeholder"
            [suggestions]="suggestions"
            [optionLabel]="optionLabel"
            [dropdown]="dropdown"
            [forceSelection]="forceSelection"
            [showClear]="showClear"
            [readonly]="readonly"
            [disabled]="disabled"
            [minLength]="minLength"
            [minQueryLength]="minLength"
            [delay]="0"
            [emptyMessage]="emptyMessage"
            [autocomplete]="autocomplete"
            [class]="styleClass"
            [inputStyleClass]="resolvedInputStyleClass"
            [inputStyle]="inputStyle"
            [appendTo]="appendTo"
            [(ngModel)]="selectedOption"
            [ngModelOptions]="{ standalone: true }"
            (completeMethod)="handleComplete($event)"
            (onDropdownClick)="handleDropdownClick($event)"
            (ngModelChange)="handleModelChange($event)"
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
export class UiAutocomplete implements ControlValueAccessor, OnDestroy {
    private cdRef = inject(ChangeDetectorRef);

    @Input() id?: string;
    @Input() inputId?: string;
    @Input() label?: string;
    @Input() placeholder?: string;
    @Input() errorMessage?: string;
    @Input() helpText?: string;
    @Input() labelClass = 'text-sm font-medium text-surface-600 dark:text-white/70';
    @Input() errorClass = 'text-red-500';
    @Input() helpTextClass = 'text-xs text-surface-500 dark:text-white/64';

    @Input() optionLabel: string = 'label';
    @Input() optionValue: string = 'value';
    @Input() optionsProvider?: UiLookupOptionsProvider;

    @Input() minLength = 1;
    @Input() rows = 50;
    @Input() debounceMs = 300;
    @Input() forceSelection = true;
    @Input() dropdown = true;
    @Input() showClear = true;
    @Input() fetchOnDropdown = true;
    @Input() readonly = false;
    @Input() autocomplete = 'off';
    @Input() emptyMessage = 'Nenhum resultado encontrado';
    @Input() appendTo: 'body' | string = 'body';
    @Input() styleClass?: string;
    @Input() inputStyleClass?: string;
    @Input() inputStyle?: Record<string, string | number>;

    @Output() optionsLoaded = new EventEmitter<UiLookupOptionsResponse>();

    selectedOption: UiLookupOption | null = null;
    suggestions: UiLookupOption[] = [];
    disabled = false;
    loading = false;

    private readonly destroy$ = new Subject<void>();
    private readonly search$ = new Subject<UiAutocompleteSearchRequest>();
    private forceRequestSeq = 0;
    private resolveRequestSeq = 0;

    private onChange: (value: unknown) => void = () => {};
    private onTouched: () => void = () => {};

    public ngControl = inject(NgControl, { optional: true, self: true });

    constructor() {
        if (this.ngControl) {
            this.ngControl.valueAccessor = this;
        }

        this.search$
            .pipe(
                distinctUntilChanged(
                    (previous, current) =>
                        previous.query.q === current.query.q &&
                        previous.query.pk === current.query.pk &&
                        previous.query.first === current.query.first &&
                        previous.query.rows === current.query.rows &&
                        previous.debounceMs === current.debounceMs &&
                        previous.triggerId === current.triggerId
                ),
                switchMap((request) => (request.debounceMs > 0 ? timer(request.debounceMs) : of(0)).pipe(map(() => request.query))),
                switchMap((query) => this.fetchOptions(query)),
                takeUntil(this.destroy$)
            )
            .subscribe((response) => {
                this.suggestions = response.data;
                this.optionsLoaded.emit(response);
                queueMicrotask(() => this.cdRef.detectChanges());
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    writeValue(value: unknown): void {
        if (value === null || value === undefined || value === '') {
            this.selectedOption = null;
            queueMicrotask(() => this.cdRef.detectChanges());

            return;
        }

        if (typeof value === 'object' && value !== null && this.optionValue in (value as Record<string, unknown>)) {
            this.selectedOption = value as UiLookupOption;
            queueMicrotask(() => this.cdRef.detectChanges());

            return;
        }

        const primitiveValue = value as string | number;
        const existing = this.findOptionByValue(primitiveValue);

        if (existing) {
            this.selectedOption = existing;
            queueMicrotask(() => this.cdRef.detectChanges());

            return;
        }

        if (!this.optionsProvider) {
            this.selectedOption = null;
            queueMicrotask(() => this.cdRef.detectChanges());

            return;
        }

        const requestId = ++this.resolveRequestSeq;

        this.optionsProvider({ pk: primitiveValue, first: 0, rows: 1 })
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => of(this.buildEmptyResponse(0, 1)))
            )
            .subscribe((response) => {
                if (requestId !== this.resolveRequestSeq) {
                    return;
                }

                this.selectedOption = response.data.find((option) => this.compareValues(this.resolveOptionValue(option), primitiveValue)) ?? response.data[0] ?? null;
                queueMicrotask(() => this.cdRef.detectChanges());
            });
    }

    registerOnChange(fn: (value: unknown) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    handleComplete(event: UiAutocompleteCompleteEvent) {
        const query = (event.query ?? '').trim();

        if (query.length < this.minLength) {
            this.suggestions = [];

            return;
        }

        this.enqueueSearch({ q: query, first: 0, rows: this.rows }, this.debounceMs);
    }

    handleDropdownClick(event: UiAutocompleteDropdownClickEvent) {
        if (!this.fetchOnDropdown) {
            return;
        }

        const selectedValue = this.selectedOption ? this.resolveOptionValue(this.selectedOption) : null;

        if (selectedValue !== null) {
            this.enqueueSearch({ pk: selectedValue, first: 0, rows: 1 }, 0, true);

            return;
        }

        const query = (event.query ?? '').trim();

        this.enqueueSearch({ q: query, first: 0, rows: this.rows }, 0, true);
    }

    handleModelChange(value: UiLookupOption | string | number | null) {
        if (value === null || value === undefined || value === '') {
            this.selectedOption = null;
            this.onChange(null);

            return;
        }

        if (typeof value === 'object') {
            const option = value as UiLookupOption;

            this.selectedOption = option;
            this.onChange(this.resolveOptionValue(option));

            return;
        }

        this.onChange(value);
    }

    markTouched() {
        this.onTouched();
    }

    private normalizeQuery(query: UiLookupQuery): UiAutocompleteNormalizedQuery {
        const q = (query.q ?? '').trim();
        const first = Number.isInteger(query.first) ? Number(query.first) : 0;
        const rows = Number.isInteger(query.rows) ? Number(query.rows) : this.rows;

        return {
            q,
            first: first < 0 ? 0 : first,
            rows: rows < 1 ? this.rows : rows,
            ...(query.pk !== undefined && query.pk !== null && query.pk !== '' ? { pk: query.pk } : {})
        };
    }

    private enqueueSearch(query: UiLookupQuery, debounceMs: number, force = false) {
        this.search$.next({
            query: this.normalizeQuery(query),
            debounceMs,
            triggerId: force ? ++this.forceRequestSeq : 0
        });
    }

    private fetchOptions(query: UiAutocompleteNormalizedQuery): Observable<UiLookupOptionsResponse> {
        if (!this.optionsProvider) {
            return of(this.buildEmptyResponse(query.first, query.rows));
        }

        this.loading = true;

        return this.optionsProvider(query).pipe(
            catchError(() => of(this.buildEmptyResponse(query.first, query.rows))),
            finalize(() => {
                this.loading = false;
                queueMicrotask(() => this.cdRef.detectChanges());
            })
        );
    }

    private buildEmptyResponse(first: number, rows: number): UiLookupOptionsResponse {
        return {
            data: [],
            totalRecords: 0,
            first,
            rows,
            hasNext: false
        };
    }

    private findOptionByValue(value: string | number): UiLookupOption | null {
        return this.suggestions.find((option) => this.resolveOptionValue(option) === value) ?? null;
    }

    private resolveOptionValue(option: UiLookupOption): string | number | null {
        const optionRecord = option as Record<string, unknown>;
        const extracted = optionRecord[this.optionValue];

        if (typeof extracted === 'string' || typeof extracted === 'number') {
            return extracted;
        }

        return null;
    }

    private compareValues(a: string | number | null, b: string | number) {
        if (a === null || a === undefined) {
            return false;
        }

        return String(a) === String(b);
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
