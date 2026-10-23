import { formatDate } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

import { timeZoneOffset } from '@/app/core/utils/time-zone';

// Data e hora no fuso escolhido no Perfil; só para instantes (datetime), nunca para data pura.
@Pipe({ name: 'zonedDate', standalone: true })
export class ZonedDatePipe implements PipeTransform {
    private locale = inject(LOCALE_ID);

    transform(value: string | number | Date | null | undefined, format: string, timeZone: string): string | null {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const date = value instanceof Date ? value : new Date(value);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return formatDate(date, format, this.locale, timeZoneOffset(date, timeZone));
    }
}
