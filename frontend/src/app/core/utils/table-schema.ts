import { UiLookupOptionsResponse } from '@/app/shared/ui/autocomplete/autocomplete';
import { serverUrl } from '@/app/core/utils/api-url';
import type { UiFilterField } from '@/app/shared/ui/filter/filter';
import { UiTableColumn, UiTableListResponse } from '@/app/shared/ui/table/table';
import { OptionsResponse } from '@/app/types/options';
import { PageResponse, SchemaFieldType, SchemaFilter, TableSchema } from '@/app/types/table-schema';

// Adaptador único entre o contrato do Core (snake_case, schema separado) e os componentes
// herdados do GIS (ui-table, ui-filter, ui-autocomplete). Serviços de tela não repetem mapeamento.

// O backend informa só o tipo; o formato vem do LOCALE_ID (pt-BR: shortDate 01/10/2026, short com hora).
// Data e hora (instante) seguem o fuso do Perfil (`zoned`); data pura não muda de dia.
const COLUMN_FORMATS: Partial<Record<SchemaFieldType, Partial<UiTableColumn>>> = {
    boolean: { type: 'boolean-tag', booleanTag: { trueLabel: 'Sim', trueSeverity: 'success', falseLabel: 'Não', falseSeverity: 'secondary' } },
    date: { type: 'date' },
    datetime: { type: 'date', format: 'short', zoned: true }
};

// Situação do registro em texto + cor (nunca só cor), igual em todas as listas.
const ACTIVE_COLUMN: Partial<UiTableColumn> = {
    header: 'Situação',
    booleanTag: { trueLabel: 'Ativo', trueSeverity: 'success', falseLabel: 'Inativo', falseSeverity: 'secondary' }
};

export function toTableResponse<T>(schema: TableSchema, page: PageResponse<T>, baseUrl: string): UiTableListResponse<T> {
    return {
        data: page.data,
        totalRecords: page.total_records,
        columns: toColumns(schema),
        filters: toFilters(schema, baseUrl)
    };
}

export function toLookupResponse(page: OptionsResponse, first: number, rows: number): UiLookupOptionsResponse {
    return { data: page.data, totalRecords: page.total_records, first, rows, hasNext: page.has_next };
}

function toColumns(schema: TableSchema): UiTableColumn[] {
    return schema.columns.map((column) => ({
        field: column.field,
        header: column.label,
        sortable: schema.ordering_fields.includes(column.field),
        ...COLUMN_FORMATS[column.type],
        ...(column.field === 'is_active' && column.type === 'boolean' ? ACTIVE_COLUMN : {})
    }));
}

function toFilters(schema: TableSchema, baseUrl: string): UiFilterField[] {
    // ui-filter envia a busca geral como `search`, o parâmetro do Core.
    const general: UiFilterField[] = (schema.general_search?.fields ?? []).map((field) => ({
        field: field.field,
        header: field.label,
        type: 'text',
        placement: 'general'
    }));

    return [...general, ...schema.filters.map((filter) => toFilter(filter, baseUrl))];
}

function toFilter(filter: SchemaFilter, baseUrl: string): UiFilterField {
    const field: UiFilterField = {
        field: filter.field,
        header: filter.label,
        type: filter.type === 'datetime' ? 'date' : filter.type,
        placement: filter.placement ?? 'advanced'
    };

    if (filter.type === 'choice') {
        field.choices = filter.choices?.map((choice) => ({ label: choice.label, value: choice.value })) ?? [];
    }

    // Mesmo nome e valores da coluna da grade (ex.: Situação: Ativo/Inativo).
    if (filter.type === 'boolean') {
        const active = filter.field === 'is_active';
        const tag = (active ? ACTIVE_COLUMN : COLUMN_FORMATS.boolean)!.booleanTag!;

        field.header = active ? ACTIVE_COLUMN.header! : filter.label;
        field.choices = [
            { label: 'Todos', value: null },
            { label: tag.trueLabel, value: true },
            { label: tag.falseLabel, value: false }
        ];
    }

    if (filter.type === 'relation' && filter.options_url) {
        // options_url é caminho do servidor (reverse do backend); resolvido na origem da API, sem prefixo fixo.
        field.lookup = { endpoint: serverUrl(filter.options_url, baseUrl) };
    }

    return field;
}
