# 0004 — Contrato de API

- **Status:** Aceito
- **Data:** 2026-10-03
- **Revisões:** 2026-10-19 — OpenAPI: arquivo `docs/api/openapi-v1.yaml` com teste de divergência e
  documentação navegável no frontend (decisões 67–68, etapa 5.5); 2026-10-23 — claim `sid` (sessão) no
  refresh e no access, uma sessão por login (decisões 83–85, etapa 9.3)

## Contexto

Backend e frontend se comunicam **exclusivamente** pela API (ADR 0001). O contrato
precisa ser estável, documentado em `docs/api/` e igual para qualquer cliente
(web hoje, outros canais no futuro).

## Decisão

| Tema | Regra | Origem |
|---|---|---|
| Estilo | REST sobre HTTPS, JSON | overview |
| Nomes dos campos | **snake_case** em toda a API (entrada e saída), sem misturar padrões | este ADR |
| Autenticação | **JWT** | ADR 0006 |
| Contexto | header único `X-Organization-Id` com o `public_id` (o contrato vem do usuário) | ADR 0006 |
| Identificadores | só `public_id` (UUID v7) na API; o `id` interno nunca é exposto | ADR 0007 |
| Formato de erro | **RFC 9457** (Problem Details, `application/problem+json`), `type` como URN informal `urn:datasync:problem:<slug>`, com `request_id` e `errors`; regras na skill `erros-api-rfc9457` | este ADR |
| Erros de contexto | **400** `context-invalid-request` e **403** `context-forbidden` | ADR 0006 |
| Códigos HTTP | **400** sintaxe malformada · **422** validação · **409** conflito de estado (RFC 9110) | este ADR |
| Autorização | negada por padrão; o backend é a fonte da verdade | ADR 0002 |
| Administração | endpoints administrativos próprios, sem contexto de contrato | ADR 0008 |
| Documentação | `docs/api/` (overview, autenticação, erros, versionamento) | overview |
| Versionamento | **prefixo na URL**: `/api/v1/…`; área administrativa em `/api/v1/admin/…` | este ADR |

### Autenticação (JWT)

Biblioteca: `djangorestframework-simplejwt` (suporta Django 5.2).

| Regra | |
|---|---|
| Access token | **15 minutos** |
| Refresh token | **1 dia** |
| Rotação | cada renovação emite um refresh novo |
| Blacklist | app `rest_framework_simplejwt.token_blacklist` **instalado**: rotação e logout invalidam o refresh anterior |
| Logout | invalida o refresh token e apaga a sessão |
| Sessão | claim `sid` com o public_id da sessão (uma por login); encerrar revoga o refresh dela (corte na próxima renovação, até 15 min) |
| Contrato vencido ou inativo | barrado na próxima requisição (ADR 0006 §2.1) |
| Armazenamento no navegador | definido no ADR 0003 |

Referência: no `datasync-spatial` a blacklist está ligada na configuração, mas o app
`token_blacklist` não está instalado, o que (pelo funcionamento da biblioteca)
deixa refresh tokens antigos válidos.

### Listagens

| Regra | |
|---|---|
| Paginação | `first` (deslocamento) + `rows` (tamanho), contrato do componente `ui-table` do `datasync-gis` |
| Tamanho de página | `rows` padrão **20**, máximo **100** |
| Pedido acima do máximo | **422** `validation-error`, informando que o máximo é 100 |
| Filtros e ordenação | só por campos de uma **lista permitida** declarada em cada endpoint (skill `owasp-top-10`, A05) |
| Parâmetros padronizados | `search` (busca geral), `ordering` (ex.: `?ordering=-created_at`) e filtros pelo nome do campo |

Formato da listagem:

```text
GET /api/v1/products/?first=20&rows=20&ordering=-created_at&search=cimento

{ "data": [ ... ], "total_records": 57 }
```

- Resposta em **snake_case** (`total_records`): o serviço do frontend converte para o
  que o componente espera (`totalRecords`); a API não abre exceção.
- O **esquema** da tabela (`columns` e `filters`) vem de um **endpoint próprio**
  (ex.: `GET /api/v1/products/schema/`), buscado uma vez e guardado em cache pelo
  frontend. A listagem fica leve e limpa para integradores.

Referência: no `datasync-spatial` não há tamanho máximo de página (`?rows=1000000`
traz tudo) e a resposta mistura camelCase e snake_case.

### Especificação OpenAPI

| Regra | |
|---|---|
| Geração | `drf-spectacular` (BSD-3, suporta Django 5.2), a partir do código |
| Erros | tipos da skill `erros-api-rfc9457` documentados no schema |
| Por versão | um schema por versão (ex.: `/api/v1/schema/`) |
| Arquivo | schema gerado salvo em `docs/api/openapi-v1.yaml`; um teste acusa divergência com o código |
| Documentação navegável (Swagger UI / Redoc) | **só para autenticados**; a parte administrativa (`/api/v1/admin/…`) só para superadmins. Como a API é só JWT, a tela fica no frontend (`/documentacoes/api`), que busca `/api/v1/schema/` com a sessão (etapa 5.5) |

Referência: o `datasync-spatial` não gera OpenAPI; documenta com coleção do Postman.

### Política de versões

| Regra | |
|---|---|
| Nova versão (`v2`) | só em mudança **incompatível**: remover ou renomear campo, mudar significado ou tipo |
| Mudança compatível (ex.: campo novo) | mesma versão; clientes ignoram campos desconhecidos |
| Convivência | a versão anterior continua funcionando por **12 meses** após o lançamento da nova |
| Aviso aos clientes | respostas da versão antiga trazem os headers `Deprecation` (RFC 9745) e `Sunset` (RFC 8594, data de desligamento) |

Rotas organizadas por versão em `config/api/v1.py` (como no `datasync-spatial`).


## Consequências

- Mudança incompatível no contrato exige nova versão da API e registro em `docs/api/`.
- O frontend consome apenas o que está documentado.
