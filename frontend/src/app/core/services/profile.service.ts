import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { apiEndpoint } from '@/app/core/utils/api-url';
import { mediaUrl } from '@/app/core/utils/media-url';
import { MyProfile, MyProfileWrite, SYSTEM_TIME_ZONE } from '@/app/types/profile';

// Perfil do usuário logado (GET/PUT /api/v1/me/profile/): carregado uma vez ao entrar e usado
// pelo topo (foto) e pelas datas (fuso). Um envio só, em multipart; a senha fica fora.
@Injectable({ providedIn: 'root' })
export class ProfileService {
    private http = inject(HttpClient);
    private baseUrl = inject(API_BASE_URL);

    readonly profile = signal<MyProfile | null>(null);
    readonly timeZone = computed(() => this.profile()?.time_zone || SYSTEM_TIME_ZONE);
    readonly avatarSrc = computed(() => mediaUrl(this.profile()?.avatar_url, this.baseUrl));

    load(): Observable<MyProfile> {
        return this.http.get<MyProfile>(this.url()).pipe(tap((profile) => this.profile.set(profile)));
    }

    save(changes: MyProfileWrite): Observable<MyProfile> {
        const body = new FormData();

        body.append('name', changes.name);
        body.append('time_zone', changes.time_zone);

        if (changes.avatar) {
            body.append('avatar', changes.avatar);
        } else if (changes.remove_avatar) {
            body.append('remove_avatar', 'true');
        }

        return this.http.put<MyProfile>(this.url(), body).pipe(tap((profile) => this.profile.set(profile)));
    }

    clear() {
        this.profile.set(null);
    }

    private url() {
        return apiEndpoint(this.baseUrl, '/me/profile/');
    }
}
