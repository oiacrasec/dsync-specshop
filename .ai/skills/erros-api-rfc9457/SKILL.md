---
name: erros-api-rfc9457
description: Padrão obrigatório de respostas de erro da API, baseado na RFC 9457 (Problem Details for HTTP APIs). Use SEMPRE ao criar ou alterar endpoints, exceções, validações, handlers de erro, ou ao documentar erros em docs/api/, e ao consumir erros da API no frontend.
---

# Erros da API — RFC 9457 (Problem Details)

Fonte oficial: https://www.rfc-editor.org/rfc/rfc9457 (substitui a RFC 7807).

> **Regra de ouro:** **todo** erro da API sai no mesmo formato, com
> `Content-Type: application/problem+json`, gerado por um **handler global** do DRF.
> Nenhuma view monta corpo de erro à mão. Integradores terceiros dependem disso.

## 1. Formato

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json

{
  "type": "urn:datasync:problem:context-forbidden",
  "status": 403,
  "title": "Sem acesso à organização",
  "detail": "Você não tem acesso à organização selecionada.",
  "instance": "/api/v1/products/",
  "request_id": "01a1f3c2-7c1e-7b55-9a40-3f8d2c6e1a90"
}
```

## 2. Campos da RFC

| Campo | Regra (RFC 9457) | No projeto |
|---|---|---|
| `type` | URI que **identifica o tipo** de problema. Consumidores **devem** usá-lo para decidir. Ausente = `about:blank` | **URN informal** `urn:datasync:problem:<slug-em-inglês>`; cada slug documentado em `docs/api/errors/<slug>.md` |
| `status` | número igual ao código HTTP; **deve** ser o mesmo da resposta | sempre presente e igual ao HTTP |
| `title` | resumo curto do **tipo**; **não muda** entre ocorrências (só por tradução) | português, via `gettext_lazy` |
| `detail` | explicação **desta ocorrência**, para ajudar o cliente a **corrigir**; não é informação de debug. Consumidores **não devem** extrair dados dele | português, via `gettext_lazy` |
| `instance` | URI da ocorrência; se relativa, com o **caminho completo** | caminho da requisição (ex.: `/api/v1/products/`) |

## 3. Campos extras (extension members)

A RFC permite campos extras, e o cliente **deve ignorar** os que não conhece. Os nossos:

| Campo | Quando | Formato |
|---|---|---|
| `request_id` | **sempre** | o mesmo ID gravado no log da requisição |
| `errors` | só em erro de validação | objeto `campo → [mensagens]` |

Dado útil para o cliente vai num **campo extra**, nunca embutido no texto do `detail`.

## 4. Catálogo de tipos

Cada `type` novo é cadastrado aqui **e** documentado em `docs/api/errors/<slug>.md`.

| Slug | HTTP | Quando | Origem |
|---|---|---|---|
| `context-invalid-request` | 400 | `X-Organization-Id` ausente ou malformado | ADR 0006 §3 |
| `context-forbidden` | 403 | organização fora do contrato ou sem acesso | ADR 0006 §3 |
| `contract-inactive` | 403 | contrato vencido ou desativado (o frontend desloga) | ADR 0006 §2.1 |
| `password-change-required` | 403 | usuário comum precisa trocar senha; cliente mantém sessão e abre a troca | ADR 0034 |
| `permission-denied` | 403 | sem a permissão exigida pelo endpoint | ADR 0009 |
| `malformed-request` | 400 | sintaxe malformada (ex.: JSON quebrado) | RFC 9110 §15.5.1 |
| `validation-error` | **422** | JSON válido, mas dados inválidos (campo obrigatório, formato, regra); traz `errors` | RFC 9110 §15.5.21 |
| `license-limit-reached` | **409** | cadastro de usuário além das licenças do contrato | ADR 0006 §2.1 |
| `profile-in-use` | **409** | exclusão de perfil ainda atribuído | ADR 0009 §2 |
| `last-contract-admin` | **409** | remoção do último admin do contrato | ADR 0009 §5 |
| `not-found` | 404 | registro inexistente **ou fora do contexto** (nunca revela qual) | ADR 0006 §4 |
| `authentication-required` | 401 | token ausente, inválido ou expirado | ADR 0006 §3 |

Problemas genéricos, que o próprio código HTTP já explica, podem usar
`type: about:blank` com o `title` igual à frase padrão do status (ex.: "Not Found",
traduzível).

## 5. Segurança (RFC 9457 §5 + skill `owasp-top-10`)

- ❌ Nunca expor stack trace, SQL, caminhos internos, nomes de tabela ou versões.
- ❌ Nunca revelar se um registro existe fora do contexto: sempre `not-found` (404).
- ❌ `detail` sem dado pessoal de terceiros (skill `lgpd`).
- ✅ Erro 500: `title` e `detail` genéricos; os detalhes vão **só para o log**, ligados pelo `request_id`.

## 6. Implementação

- Handler global em `REST_FRAMEWORK['EXCEPTION_HANDLER']` convertendo **todas** as
  exceções (DRF, Django e as nossas) para Problem Details.
- Exceções do domínio herdam de uma base comum com `type`, `status` e `title` declarados.
- O `type` é sempre `urn:datasync:problem:<slug>`. É um URN **informal**: o namespace
  `datasync` não é registrado na IANA (RFC 8141); aceito conscientemente, sem impacto
  no funcionamento. Por não ser uma URL, a documentação de cada tipo fica em
  `docs/api/errors/<slug>.md`.
- Resposta com `Content-Type: application/problem+json`.
- Testes: cada tipo do catálogo tem teste verificando `status`, `type` e ausência de
  detalhes internos.

## 7. Frontend e integradores

- Decidir **sempre pelo `type`**, nunca pelo texto de `title` ou `detail`.
- Ignorar campos extras desconhecidos (exigência da RFC).
- `context-invalid-request` / `context-forbidden` → limpar o contexto e voltar à seleção.
- `contract-inactive` / `authentication-required` → deslogar.

### Critério dos códigos (RFC 9110)

| Código | Uso |
|---|---|
| 400 | **sintaxe** malformada: JSON quebrado, header malformado |
| 422 | sintaxe correta, conteúdo **semanticamente** inválido (validação) |
| 409 | conflito com o **estado atual** do recurso, resolvível pelo usuário |

O DRF devolve 400 para validação por padrão: o handler global converte para **422**.
