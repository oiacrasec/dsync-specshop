import { toTableResponse } from './table-schema';

describe('toTableResponse', () => {
    it('mapeia tipos do schema para as células do ui-table', () => {
        const response = toTableResponse(
            {
                columns: [
                    { field: 'name', label: 'Nome', type: 'text' },
                    { field: 'is_active', label: 'Ativo', type: 'boolean' },
                    { field: 'is_system', label: 'Sistema', type: 'boolean' },
                    { field: 'start_date', label: 'Início', type: 'date' }
                ],
                filters: [],
                general_search: null,
                ordering_fields: ['name']
            },
            { data: [], total_records: 0 },
            '/api/v1'
        );

        expect(response.columns).toEqual([
            { field: 'name', header: 'Nome', sortable: true },
            {
                field: 'is_active',
                header: 'Situação',
                sortable: false,
                type: 'boolean-tag',
                booleanTag: { trueLabel: 'Ativo', trueSeverity: 'success', falseLabel: 'Inativo', falseSeverity: 'secondary' }
            },
            {
                field: 'is_system',
                header: 'Sistema',
                sortable: false,
                type: 'boolean-tag',
                booleanTag: { trueLabel: 'Sim', trueSeverity: 'success', falseLabel: 'Não', falseSeverity: 'secondary' }
            },
            { field: 'start_date', header: 'Início', sortable: false, type: 'date' }
        ]);
    });

    it('usa no filtro o mesmo nome e valores da coluna', () => {
        const response = toTableResponse(
            {
                columns: [],
                filters: [
                    { field: 'is_active', label: 'Ativo', type: 'boolean' },
                    { field: 'is_system', label: 'Sistema', type: 'boolean' }
                ],
                general_search: null,
                ordering_fields: []
            },
            { data: [], total_records: 0 },
            '/api/v1'
        );

        expect(response.filters?.map(({ header, choices }) => ({ header, choices: choices?.map((choice) => choice.label) }))).toEqual([
            { header: 'Situação', choices: ['Todos', 'Ativo', 'Inativo'] },
            { header: 'Sistema', choices: ['Todos', 'Sim', 'Não'] }
        ]);
    });
});
