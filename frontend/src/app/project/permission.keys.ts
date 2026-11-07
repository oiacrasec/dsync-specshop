// Códigos do registry do SPECSHOP (backend `apps/*/permission_catalog.py`, ADR 0044 e ADR 2003 §5).
export const SPECSHOP_PERMISSION_KEYS = {
    PRODUCT_VIEW: 'product:view',
    PRODUCT_CREATE: 'product:create',
    PRODUCT_UPDATE: 'product:update',
    PRODUCT_DELETE: 'product:delete'
} as const;
