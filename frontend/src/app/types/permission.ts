import { UserAccessStatus, UserType } from '@/app/types/auth';

export interface PermissionContextResponse {
    is_superuser: boolean;
    contrato_id: number | null;
    organizacao_id: number | null;
    user_type: UserType;
    status_acesso: UserAccessStatus;
    papeis_ativos: string[];
    permissoes: string[];
}
