import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { UiTableListResponse } from '@/app/shared/ui/table/table';
import { Profile, ProfileWrite } from '@/app/types/perfil';

const PROFILES = 'profiles';

@Injectable({ providedIn: 'root' })
export class PerfilService extends BaseCrudService {
    list(query: Record<string, unknown> = {}): Observable<UiTableListResponse<Profile>> {
        return this.listTable<Profile>(PROFILES, query);
    }

    get(publicId: string) {
        return this.http.get<Profile>(this.profileUrl(publicId));
    }

    create(payload: ProfileWrite) {
        return this.http.post<Profile>(`${this.baseUrl}/${PROFILES}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(publicId: string, payload: ProfileWrite) {
        return this.http.patch<Profile>(this.profileUrl(publicId), payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(publicId: string) {
        return this.http.delete<void>(this.profileUrl(publicId)).pipe(tap(() => this.invalidateTableCache()));
    }

    private profileUrl(publicId: string) {
        return `${this.baseUrl}/${PROFILES}/${encodeURIComponent(publicId)}/`;
    }
}
