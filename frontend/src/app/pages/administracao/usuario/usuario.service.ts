import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { UiTableListResponse } from '@/app/shared/ui/table/table';
import { ContractUser, ContractUserCreated, ContractUserPasswordReset, ContractUserWrite, UserAccess, UserAccessWrite } from '@/app/types/usuario';

const USERS = 'users';

@Injectable({ providedIn: 'root' })
export class UsuarioService extends BaseCrudService {
    list(query: Record<string, unknown> = {}): Observable<UiTableListResponse<ContractUser>> {
        return this.listTable<ContractUser>(USERS, query);
    }

    get(publicId: string) {
        return this.http.get<ContractUser>(this.userUrl(publicId));
    }

    create(payload: ContractUserWrite) {
        return this.http.post<ContractUserCreated>(`${this.baseUrl}/${USERS}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(publicId: string, payload: ContractUserWrite) {
        return this.http.patch<ContractUser>(this.userUrl(publicId), payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(publicId: string) {
        return this.http.delete<void>(this.userUrl(publicId)).pipe(tap(() => this.invalidateTableCache()));
    }

    resetPassword(publicId: string) {
        return this.http.post<ContractUserPasswordReset>(`${this.userUrl(publicId)}reset-password/`, {}).pipe(tap(() => this.invalidateTableCache()));
    }

    getAccess(publicId: string) {
        return this.http.get<UserAccess>(`${this.userUrl(publicId)}access/`);
    }

    replaceAccess(publicId: string, payload: UserAccessWrite) {
        return this.http.put<UserAccess>(`${this.userUrl(publicId)}access/`, payload);
    }

    private userUrl(publicId: string) {
        return `${this.baseUrl}/${USERS}/${encodeURIComponent(publicId)}/`;
    }
}
