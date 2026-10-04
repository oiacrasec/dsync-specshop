export interface PaginatedResponse<T> {
    totalRecords: number;
    next: string | null;
    previous: string | null;
    first: number;
    last: string | null;
    page: number;
    rows: number;
    hasNext: boolean;
    hasPrevious: boolean;
    total_pages: number;
    pages: number[];
    data: T[];
}
