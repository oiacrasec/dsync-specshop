export interface ApiProblem {
    type: string;
    status: number;
    title: string;
    detail: string;
    instance: string;
    request_id: string;
    errors?: Record<string, string[]>;
}
