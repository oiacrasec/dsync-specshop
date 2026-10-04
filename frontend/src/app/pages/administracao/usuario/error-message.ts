import { HttpErrorResponse } from '@angular/common/http';

const PRIORITY_KEYS = ['detail', 'message', 'non_field_errors'] as const;

function isHtmlDocument(value: string): boolean {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
        return false;
    }

    return normalized.startsWith('<!doctype html') || normalized.startsWith('<html');
}

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim();

    if (!normalized || isHtmlDocument(normalized)) {
        return null;
    }

    return normalized;
}

function extractMessage(value: unknown): string | null {
    const directString = asNonEmptyString(value);

    if (directString) {
        return directString;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const nested = extractMessage(item);

            if (nested) {
                return nested;
            }
        }

        return null;
    }

    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;

        for (const key of PRIORITY_KEYS) {
            if (!(key in record)) {
                continue;
            }

            const nested = extractMessage(record[key]);

            if (nested) {
                return nested;
            }
        }

        for (const entry of Object.values(record)) {
            const nested = extractMessage(entry);

            if (nested) {
                return nested;
            }
        }
    }

    return null;
}

export function getBackendErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
        return extractMessage(error.error) ?? asNonEmptyString(error.message) ?? fallback;
    }

    return extractMessage(error) ?? fallback;
}
