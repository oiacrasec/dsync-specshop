import { timeZoneOffset } from './time-zone';

describe('timeZoneOffset', () => {
    it('calcula o deslocamento do fuso para cada instante, com horário de verão', () => {
        expect(timeZoneOffset(new Date('2026-07-01T12:00:00Z'), 'America/Sao_Paulo')).toBe('-0300');
        expect(timeZoneOffset(new Date('2026-07-01T12:00:00Z'), 'Europe/Lisbon')).toBe('+0100');
        expect(timeZoneOffset(new Date('2026-01-15T12:00:00Z'), 'Europe/Lisbon')).toBe('+0000');
        expect(timeZoneOffset(new Date('2026-07-01T12:00:00Z'), 'Asia/Kolkata')).toBe('+0530');
    });
});
