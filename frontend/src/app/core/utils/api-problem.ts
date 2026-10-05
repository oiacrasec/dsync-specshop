import { HttpErrorResponse } from '@angular/common/http';
import { ApiProblem } from '@/app/types/problem';

export function apiProblem(error: unknown): ApiProblem | null {
    if (!(error instanceof HttpErrorResponse)) {
        return null;
    }

    const value = error.error;

    if (!value || typeof value !== 'object' || typeof value.type !== 'string' || value.status !== error.status) {
        return null;
    }

    return value as ApiProblem;
}

export function problemMessage(error: unknown, fallback: string): string {
    const problem = apiProblem(error);

    if (!problem) {
        return fallback;
    }

    if (problem.status === 422 && problem.errors) {
        const messages = Object.values(problem.errors)
            .flat()
            .filter((value) => typeof value === 'string');

        if (messages.length) {
            return messages.join(' ');
        }
    }

    return typeof problem.detail === 'string' ? problem.detail : fallback;
}
