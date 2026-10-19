import { toTableResponse } from './table-schema';

describe('toTableResponse', () => {
    it('mapeia tipos do schema para as células do ui-table', () => {
        const response = toTableResponse(
            {
                columns: [
                    { field: 'name', label: 'Nome', type: 'text' },
                    { field: 'is_active', label: 'Ativo', type: 'boolean' },
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
            { field: 'is_active', header: 'Ativo', sortable: false, type: 'boolean' },
            { field: 'start_date', header: 'Início', sortable: false, type: 'date' }
        ]);
    });
});
