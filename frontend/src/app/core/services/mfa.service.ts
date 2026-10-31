import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '../tokens/api-base-url';
import { apiEndpoint } from '../utils/api-url';

export interface MfaStatus {
    enabled: boolean;
    setup_pending: boolean;
    recovery_codes_remaining: number;
}

export interface MfaSetup {
    secret: string;
    otpauth_url: string;
}

export interface MfaRecoveryCodes {
    recovery_codes: string[];
}

@Injectable({ providedIn: 'root' })
export class MfaService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(API_BASE_URL);

    status() {
        return this.http.get<MfaStatus>(apiEndpoint(this.baseUrl, '/me/mfa/'));
    }

    setup() {
        return this.http.post<MfaSetup>(apiEndpoint(this.baseUrl, '/me/mfa/setup/'), {});
    }

    enable(code: string) {
        return this.http.post<MfaRecoveryCodes>(apiEndpoint(this.baseUrl, '/me/mfa/enable/'), { code });
    }

    disable(password: string, code: string) {
        return this.http.post<void>(apiEndpoint(this.baseUrl, '/me/mfa/disable/'), { password, code });
    }

    regenerate(code: string) {
        return this.http.post<MfaRecoveryCodes>(apiEndpoint(this.baseUrl, '/me/mfa/recovery-codes/'), { code });
    }
}
