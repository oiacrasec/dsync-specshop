import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { apiEndpoint } from '@/app/core/utils/api-url';
import { ThemeService } from '@/app/layout/service/theme.service';
import { DEFAULT_PREFERENCES, UserPreferences } from '@/app/types/preferences';

// Preferências de aparência guardadas no usuário (GET/PUT /api/v1/me/preferences/).
@Injectable({ providedIn: 'root' })
export class PreferencesService {
    private http = inject(HttpClient);
    private baseUrl = inject(API_BASE_URL);
    private theme = inject(ThemeService);

    load(): Observable<UserPreferences> {
        return this.http.get<UserPreferences>(this.url()).pipe(switchMap((preferences) => from(this.theme.apply(preferences).then(() => preferences))));
    }

    save(preferences: UserPreferences): Observable<UserPreferences> {
        return this.http.put<UserPreferences>(this.url(), preferences).pipe(switchMap((saved) => from(this.theme.apply(saved).then(() => saved))));
    }

    resetToDefault() {
        return this.theme.apply(DEFAULT_PREFERENCES);
    }

    private url() {
        return apiEndpoint(this.baseUrl, '/me/preferences/');
    }
}
