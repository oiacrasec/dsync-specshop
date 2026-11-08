// Pesquisa de preços do SPECSHOP (docs/api/searches.md): snake_case e public_id.
export type SearchItemStatus = 'pending' | 'running' | 'done' | 'no_results' | 'unavailable' | 'error';

export interface PriceSearchItem {
    public_id: string;
    product: string;
    product_name: string;
    product_model: string;
    source: string;
    source_label: string;
    status: SearchItemStatus;
    detail: string;
    started_at: string | null;
    finished_at: string | null;
    offer_count: number | null;
    min_price: string | null;
    median_price: string | null;
    avg_price: string | null;
    max_price: string | null;
}

export interface PriceSearch {
    public_id: string;
    sources: string[];
    seller_states: string[];
    destination_zip: string;
    items: PriceSearchItem[];
    created_at: string;
}

export interface PriceSearchWrite {
    products: string[];
    sources: string[];
    seller_states: string[];
    destination_zip: string;
}

export interface PriceSearchListRow extends PriceSearch {
    product_count: number;
    seller_states_label: string;
}
