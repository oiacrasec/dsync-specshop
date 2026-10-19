import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { UiTableListResponse } from '@/app/shared/ui/table/table';
import { Organization, OrganizationWrite } from '@/app/types/organizacao';

const ORGANIZATIONS = 'organizations';

@Injectable({ providedIn: 'root' })
export class OrganizacaoService extends BaseCrudService {
    list(query: Record<string, unknown> = {}): Observable<UiTableListResponse<Organization>> {
        return this.listTable<Organization>(ORGANIZATIONS, query);
    }

    get(publicId: string) {
        return this.http.get<Organization>(this.organizationUrl(publicId));
    }

    create(payload: OrganizationWrite) {
        return this.http.post<Organization>(`${this.baseUrl}/${ORGANIZATIONS}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(publicId: string, payload: OrganizationWrite) {
        return this.http.patch<Organization>(this.organizationUrl(publicId), payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(publicId: string) {
        return this.http.delete<void>(this.organizationUrl(publicId)).pipe(tap(() => this.invalidateTableCache()));
    }

    private organizationUrl(publicId: string) {
        return `${this.baseUrl}/${ORGANIZATIONS}/${encodeURIComponent(publicId)}/`;
    }
}
