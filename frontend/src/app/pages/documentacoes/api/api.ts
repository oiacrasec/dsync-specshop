import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { PUBLIC_AUTH_PATHS, apiEndpoint, apiPath, needsOrganizationHeader } from '@/app/core/utils/api-url';
import { problemMessage } from '@/app/core/utils/api-problem';

// CSS do Swagger: bundle global sob demanda (`swagger-ui.css` no angular.json, sem injeção).
const STYLESHEET_ID = 'swagger-ui-styles';

// Swagger UI do schema OpenAPI (GET /api/v1/schema/, etapa 5.5). Carregado só nesta tela; o
// "Try it out" leva o token e a organização ativa apenas para a origem e o prefixo da API.
@Component({
    selector: 'app-documentacao-api',
    standalone: true,
    template: `
        <div class="flex flex-col gap-6 bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden p-4 lg:p-6">
            <div class="dss-page-header border-b border-surface-200 dark:border-surface-700">
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0">API</h2>
                <p class="text-sm text-surface-700 dark:text-white/64">Rotas que você pode usar, geradas do código. "Try it out" executa de verdade, com a sua sessão.</p>
            </div>
            @if (error()) {
                <p class="text-sm text-red-600 dark:text-red-400">{{ error() }}</p>
            } @else if (loading()) {
                <p class="text-sm text-surface-700 dark:text-white/64">Carregando a documentação…</p>
            }
            <div #swagger class="swagger-host bg-white rounded-lg"></div>
        </div>
    `
})
export class DocumentacaoApiPage implements AfterViewInit, OnDestroy {
    private http = inject(HttpClient);
    private baseUrl = inject(API_BASE_URL);
    private session = inject(AuthSessionService);
    private contexts = inject(UserContextService);
    private host = viewChild.required<ElementRef<HTMLElement>>('swagger');
    private destroyed = false;

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    async ngAfterViewInit() {
        this.loadStylesheet();

        try {
            const [spec, { default: SwaggerUIBundle }] = await Promise.all([firstValueFrom(this.http.get<Record<string, unknown>>(apiEndpoint(this.baseUrl, '/schema/'))), import('swagger-ui-dist/swagger-ui-es-bundle.js')]);

            if (this.destroyed) {
                return;
            }

            SwaggerUIBundle({
                domNode: this.host().nativeElement,
                spec: { ...spec, servers: [{ url: new URL(this.baseUrl, window.location.origin).origin }] },
                deepLinking: false,
                persistAuthorization: false,
                requestInterceptor: (request) => this.withCredentials(request)
            });
        } catch (error: unknown) {
            this.error.set(problemMessage(error, 'Não foi possível carregar a documentação da API.'));
        } finally {
            this.loading.set(false);
        }
    }

    ngOnDestroy() {
        this.destroyed = true;
    }

    private async withCredentials<T extends { url: string; headers: Record<string, string> }>(request: T): Promise<T> {
        const path = apiPath(request.url, this.baseUrl);

        delete request.headers['Authorization'];
        delete request.headers['X-Organization-Id'];

        if (!path || PUBLIC_AUTH_PATHS.includes(path)) {
            return request;
        }

        const token = await firstValueFrom(this.session.ensureAccessToken());
        const organization = this.contexts.getActiveContext()?.organization_public_id;

        if (token) {
            request.headers['Authorization'] = `Bearer ${token}`;

            if (organization && needsOrganizationHeader(path, !!this.session.getUser()?.is_superuser)) {
                request.headers['X-Organization-Id'] = organization;
            }
        }

        return request;
    }

    private loadStylesheet() {
        if (document.getElementById(STYLESHEET_ID)) {
            return;
        }

        const link = document.createElement('link');

        link.id = STYLESHEET_ID;
        link.rel = 'stylesheet';
        link.href = 'swagger-ui.css';
        document.head.appendChild(link);
    }
}
