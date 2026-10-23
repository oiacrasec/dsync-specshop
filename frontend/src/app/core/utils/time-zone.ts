// O DatePipe do Angular aceita só deslocamento ('-0300'), não nome IANA ('America/Sao_Paulo').
// O deslocamento é calculado para cada instante, então o horário de verão de outros fusos vale.
export function timeZoneOffset(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    const wallClock = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
    const minutes = Math.round((wallClock - Math.floor(date.getTime() / 1000) * 1000) / 60000);
    const absolute = Math.abs(minutes);

    return `${minutes < 0 ? '-' : '+'}${String(Math.floor(absolute / 60)).padStart(2, '0')}${String(absolute % 60).padStart(2, '0')}`;
}

export function supportedTimeZones(): string[] {
    return typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
}
