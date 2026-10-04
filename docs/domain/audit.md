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
