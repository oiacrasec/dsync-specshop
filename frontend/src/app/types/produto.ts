// Produto acompanhado do SPECSHOP (docs/api/products.md): snake_case e public_id.
export interface TrackedProduct {
    public_id: string;
    name: string;
    model: string;
    brand: string;
    ean: string;
    created_at: string;
    updated_at: string;
}

export interface TrackedProductWrite {
    name: string;
    model: string;
    brand: string;
    ean: string;
}
