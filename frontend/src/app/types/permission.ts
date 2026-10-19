// Resposta de GET /api/v1/me/permissions/ (ADR 0037): só para a interface; o backend autoriza.
export interface PermissionSummary {
    permissions: string[];
}
