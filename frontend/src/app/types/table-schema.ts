// Contrato das listagens do Core (ADR 0004/0026/0029): página leve + schema separado.

export type SchemaFieldType = 'text' | 'number' | 'boolean' | 'choice' | 'date' | 'datetime' | 'relation';

export interface PageResponse<T> {
    data: T[];
    total_records: number;
}

export interface SchemaColumn {
    field: string;
    label: string;
    type: SchemaFieldType;
}

export interface SchemaFilter {
    field: string;
    label: string;
    type: SchemaFieldType;
    placement?: 'general' | 'advanced';
    options_url?: string | null;
    choices?: Array<{ value: unknown; label: string }>;
}

export interface GeneralSearchSchema {
    parameter: string;
    label: string;
    fields: Array<{ field: string; label: string; lookup: string }>;
}

export interface TableSchema {
    columns: SchemaColumn[];
    filters: SchemaFilter[];
    general_search: GeneralSearchSchema | null;
    ordering_fields: string[];
}
