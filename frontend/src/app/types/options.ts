// Resposta de `…/options/` do Core (ADR 0011, docs/api/options.md).
export interface OptionsResponse {
    data: Array<{ value: string; label: string }>;
    total_records: number;
    has_next: boolean;
}
