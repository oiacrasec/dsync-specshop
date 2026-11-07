import { UiMultiSelectOption } from '@/app/shared/ui/multi-select/multi-select';

// Limite de produtos por pesquisa (D-25, RF-29); o backend aplica o mesmo limite.
export const MAX_PRODUCTS_PER_SEARCH = 10;

// Fontes aceitas pela API de pesquisa (backend `apps/pricing/constants.py`).
export const SOURCE_OPTIONS: UiMultiSelectOption[] = [{ label: 'Mercado Livre', value: 'mercado_livre' }];

// UFs para o filtro de origem do vendedor (D-22, RF-24).
export const BRAZIL_STATE_OPTIONS: UiMultiSelectOption[] = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'].map((state) => ({
    label: state,
    value: state
}));
