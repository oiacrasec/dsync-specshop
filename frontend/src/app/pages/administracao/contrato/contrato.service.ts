import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { UiLookupOptionsProvider } from '@/app/shared/ui/autocomplete/autocomplete';
import { UiTableListResponse } from '@/app/shared/ui/table/table';
import { Contract, ContractAdmin, ContractAdminPasswordReset, ContractProvision, ContractProvisionResult, ContractWrite } from '@/app/types/contrato';
import { PageResponse } from '@/app/types/table-schema';

const CONTRACTS = 'admin/contracts';
const PLANS = 'admin/plans';

@Injectable({ providedIn: 'root' })
export class ContratoService extends BaseCrudService {
    readonly planOptions: UiLookupOptionsProvider = (query) => this.lookupOptions(PLANS, query);

    list(query: Record<string, unknown> = {}): Observable<UiTableListResponse<Contract>> {
        return this.listTable<Contract>(CONTRACTS, query);
    }

    get(publicId: string) {
        return this.http.get<Contract>(this.contractUrl(publicId));
    }

    create(payload: ContractWrite) {
        return this.http.post<Contract>(`${this.baseUrl}/${CONTRACTS}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(publicId: string, payload: ContractWrite) {
        return this.http.patch<Contract>(this.contractUrl(publicId), payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(publicId: string) {
        return this.http.delete<void>(this.contractUrl(publicId)).pipe(tap(() => this.invalidateTableCache()));
    }

    provision(publicId: string, payload: ContractProvision) {
        return this.http.post<ContractProvisionResult>(`${this.contractUrl(publicId)}provision/`, payload);
    }

    admins(publicId: string) {
        // Um contrato tem poucos admins: uma página com o máximo da API (100).
        const params = this.buildParams({ first: 0, rows: 100 });

        return this.http.get<PageResponse<ContractAdmin>>(`${this.contractUrl(publicId)}admins/`, { params });
    }

    resetAdminPassword(publicId: string, userPublicId: string) {
        return this.http.post<ContractAdminPasswordReset>(`${this.contractUrl(publicId)}admins/${encodeURIComponent(userPublicId)}/reset-password/`, {});
    }

    // Identificadores entram no caminho codificados: um valor forjado não muda o endpoint (CSPT).
    private contractUrl(publicId: string) {
        return `${this.baseUrl}/${CONTRACTS}/${encodeURIComponent(publicId)}/`;
    }
}
