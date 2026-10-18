# Erros da API — RFC 9457

Contrato oficial: ADR 0004 e `.ai/skills/erros-api-rfc9457/SKILL.md`.
Implementação: `backend/apps/core/exceptions.py` (classes), `problems.py` (respostas e
handler do DRF) e `middleware.py`.
Filtro de correlação dos logs: `backend/apps/core/log_filters.py`.

Todo erro da API usa `Content-Type: application/problem+json`, inclusive em
desenvolvimento (`DEBUG=True`) e ao solicitar HTML. Não monte respostas de erro
nas views: levante exceções; use `serializer.is_valid(raise_exception=True)`.

```json
{
  "type": "urn:datasync:problem:validation-error",
  "status": 422,
  "title": "Dados inválidos",
  "detail": "Corrija os campos indicados em errors.",
  "instance": "/api/v1/products/",
  "request_id": "01a10393-161d-7432-94b7-43923f620168",
  "errors": {"name": ["Este campo é obrigatório."]}
}
```

- `status` coincide com o HTTP. `title` é estável por tipo, pronto para tradução.
- `instance` contém o caminho completo, sem query string. O exemplo acima é
  ilustrativo; nenhum endpoint de produtos foi implementado nesta etapa.
- `request_id` é UUID v7 gerado no servidor a cada requisição e enviado também em
  `X-Request-Id`. O header de entrada é ignorado. O mesmo ID acompanha os logs.
- O contexto do ID é restaurado ao terminar a requisição, inclusive quando há erro.
  Logs fora de requisições usam `request_id=-`.
- O middleware registra apenas respostas com erro: 4xx em WARNING e 5xx em ERROR.
  Respostas 2xx/3xx não geram log de conclusão, mas continuam recebendo `X-Request-Id`.
  Observabilidade mais ampla fica para uma evolução futura.
- `errors` existe só em 422: objeto campo → lista de mensagens. Campos aninhados
  usam pontos e índices (`items.0.quantity`); erros gerais usam `non_field_errors`.
- 400 indica sintaxe inválida; 422 indica falha de validação; 409 indica conflito de estado.
- Headers de protocolo, como `WWW-Authenticate` e `Retry-After`, são preservados.
- Problemas genéricos (405, 406, 415, 429) usam `about:blank` e a frase padrão do HTTP
  como título, pronta para tradução.
- 500 usa `about:blank`, título e detalhe genéricos. O log registra classe da
  exceção e localização dos frames da pilha, sem mensagem da exceção, variáveis
  locais, query string, credenciais ou payload. Falhas tratadas fazem rollback
  das transações de requisição (`ATOMIC_REQUESTS`).

Clientes decidem pelo `type`, nunca pelo texto de `detail`, e ignoram campos extras
desconhecidos. O namespace URN `datasync` é informal (ADR 0004).

## Catálogo

| Tipo | HTTP |
|---|---|
| [context-invalid-request](errors/context-invalid-request.md) | 400 |
| [context-forbidden](errors/context-forbidden.md) | 403 |
| [contract-inactive](errors/contract-inactive.md) | 403 |
| [password-change-required](errors/password-change-required.md) | 403 |
| [permission-denied](errors/permission-denied.md) | 403 |
| [malformed-request](errors/malformed-request.md) | 400 |
| [validation-error](errors/validation-error.md) | 422 |
| [license-limit-reached](errors/license-limit-reached.md) | 409 |
| [contract-not-provisionable](errors/contract-not-provisionable.md) | 409 |
| [profile-in-use](errors/profile-in-use.md) | 409 |
| [last-contract-admin](errors/last-contract-admin.md) | 409 |
| [not-found](errors/not-found.md) | 404 |
| [authentication-required](errors/authentication-required.md) | 401 |

Tipos de domínio estão declarados, testados e disparados pelas regras de contexto (3.3),
vigência (2.3), licenças (2.2), perfis (3.2), último administrador (3.4) e provisionamento (6.6).
O registro técnico de correlação não substitui o `AccessLog` da etapa 4.1.

Actions customizadas que capturam exceções usam
`build_exception_response(exception=exc, request=request)` de core/responses.py.
O helper delega ao mesmo handler global: status, formato RFC 9457, headers,
request_id, mensagens seguras e rollback permanecem iguais (ADR 0031).
Sucessos usam build_result_response(result, status_code=...), sem envelope novo.

Fontes técnicas consultadas: [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457),
[exceções do DRF](https://www.django-rest-framework.org/api-guide/exceptions/) e
[middleware do Django](https://docs.djangoproject.com/en/5.2/topics/http/middleware/).
