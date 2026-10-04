# Auditoria (etapa 3.6)

Trilha append-only do [ADR 0017](../adr/0017-trilha-de-auditoria.md), em `apps/audit`
(tabela `dsc_audit_event`).

## Eventos

| Grupo | Eventos | Onde nasce |
|---|---|---|
| Perfil | `profile.created`, `profile.updated`, `profile.deleted` (com `removed_permissions`) | `apps.rbac.services` |
| Permissão do perfil | `profile_permission.added`, `.updated`, `.removed` | `apps.rbac.services` |
| Atribuição | `assignment.created`, `.updated`, `.deleted` (com `removed_exclusions`) | `apps.rbac.services` |
| Exceção | `exclusion.added`, `.updated`, `.removed` | `apps.rbac.services` |
| Conta de superadmin | `superadmin.created`, `.promoted`, `.demoted`, `.deactivated`, `.reactivated`, `.deleted`, `.restored` | `save_user` / `delete_user` |
| Entrada em organização | `superadmin.entered_organization` | `SuperadminEntryAuditMiddleware` |

## Campos

| Campo | Conteúdo |
|---|---|
| `created_by` / `created_at` | quem e quando (nulo = sistema, ex.: `createsuperuser`) |
| `contract` | contrato do alvo; nulo em eventos do sistema |
| `context_organization` | organização em que o superadmin entrou |
| `target_type` / `target_public_id` | alvo, ex.: `rbac.assignment` + UUID |
| `access_jti` | access token da entrada do superadmin |
| `changes` | `{"before": {...}, "after": {...}}`, só campos de permissão; FKs pelo `public_id` |

## Regras

- Imutável: alterar ou excluir um evento (instância ou lote) levanta erro.
- Eventos de permissão e de superadmin entram na mesma transação da mudança.
- Entrada do superadmin: no máximo 1 por superadmin + organização + access token
  (até 1 a cada 15 minutos por organização); gravada após a resposta, fora da
  transação da view, inclusive quando a requisição falha.
- Custo: +2 queries constantes por escrita de RBAC (snapshot e evento) e +1 INSERT por
  requisição do superadmin com organização.
- Leitura pela API: bloco 5 (administração). Retenção/eliminação: entrega de expurgo (ADR 0007).

## Registro de acesso (etapa 4.1)

`AccessLog` (`dsc_access_log`), [ADR 0018](../adr/0018-registro-de-acesso.md), Marco Civil art. 15.

| Campo | Conteúdo |
|---|---|
| `occurred_at` | data e hora em UTC |
| `ip` / `port` | origem do cliente; atrás do proxy, pelos headers `DJANGO_ACCESS_LOG_IP_HEADER`/`DJANGO_ACCESS_LOG_PORT_HEADER` |
| `user` | autenticado (no login, quem entrou); vazio se anônimo |
| `contract` / `organization` | do contexto de tenant; sem contexto, o contrato do usuário |
| `request_id` | correlação com `X-Request-Id` e os logs |

- Toda requisição a `/api/`, inclusive anônima e com erro; gravada após a resposta, fora da
  transação da view (`AccessLogMiddleware`).
- Só inserção; leitura só em `system_context()`/`unscoped()` (ordem judicial, recorte por
  usuário ou IP + período, índices `(user, occurred_at)` e `(ip, occurred_at)`).
- Guarda mínima de 6 meses (`AccessLog.minimum_retention_months`). Expurgo e `LegalHold`:
  entrega do ADR 0007, obrigatórios antes de produção.
