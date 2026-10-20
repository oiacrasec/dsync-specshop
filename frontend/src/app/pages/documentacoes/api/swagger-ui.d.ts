declare module 'swagger-ui-dist/swagger-ui-es-bundle.js' {
    interface SwaggerRequest {
        url: string;
        headers: Record<string, string>;
    }

    interface SwaggerOptions {
        domNode: HTMLElement;
        spec: object;
        deepLinking?: boolean;
        tryItOutEnabled?: boolean;
        persistAuthorization?: boolean;
        requestInterceptor?: (request: SwaggerRequest) => SwaggerRequest | Promise<SwaggerRequest>;
    }

    const SwaggerUIBundle: (options: SwaggerOptions) => unknown;
    export default SwaggerUIBundle;
}
