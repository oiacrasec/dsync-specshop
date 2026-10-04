# Handoff

- **Atualizado em:** 2026-10-04
- **Agente:** Claude → GPT (troca a pedido do usuário)
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Último commit:** etapa 4.1 (`feat(audit): record API access logs for Marco Civil compliance`)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 4.1 Registro de acesso (ADR 0018) — ✅ concluída |
| Próximo passo exato | discutir com o usuário a preocupação abaixo (INSERT do `AccessLog` por requisição) **antes** do bloco 5 |
| Aguardando o usuário? | sim — decidir a estratégia de gravação do `AccessLog`; depois aprovar o bloco 5 |

## Concluído na entrega 1

0.1 · 0.2 · 1.1 · 0.3 · 1.2 · 2.1 · 2.2 · 3.1 · 3.2 · 3.3 · 3.4 · 3.5 · 2.3 · 3.6 · 2.4 · 2.5 · 4.1. Ordem atual:
bloco 5.

## Após a 2.5 (sem mudar comportamento)

Reorganização dos módulos (`managers`, `utils`, `constants`, `problems`), padrão de SQL à mão
(`queries/`, `@tenant_params`, `fetch_all`) e código em inglês. Tudo em `backend/AGENTS.md`
e `backend/docs/standards/django-style.md`; checado pelo `validar-etapa`.

## Dúvidas abertas

- **Preocupação do usuário (não discutida ainda):** o `AccessLog` faz 1 INSERT síncrono em
  **toda** requisição à API (backend REST, muitas requisições). Decisão 5 da 4.1 foi "middleware
  após a resposta; fila só se o volume exigir", mas o usuário quer rever. Levantar opções com
  prós/contras, sem decidir sozinho (skill `questionador`), por exemplo:
  - manter síncrono, medindo custo real (INSERT simples, sem índice único; ~ms);
  - buffer em memória/lote (`bulk_create` a cada N ou T s) — risco de perder registros em queda,
    o que conflita com a obrigação do Marco Civil art. 15;
  - fila (Celery/RQ/Redis Streams) ou `transaction.on_commit` + worker — infra nova;
  - particionamento mensal da tabela no PostgreSQL (facilita o expurgo de 6 meses e mantém
    INSERT barato) — complementa qualquer opção;
  - enviar para um pipeline de logs externo (stdout/JSON → coletor) — muda onde fica a guarda
    sob sigilo e a busca por ordem judicial.
  Restrições: não perder registros (obrigação legal), sigilo, recorte por usuário/IP + período.

## Avisos

- **Isolamento entre contratos:** managers filtram pelo contexto e falham sem ele (2.4);
  testes genéricos de isolamento cobrem todo model (2.5). Único endpoint publicado:
  `GET /api/v1/me/organizations/` (filtro explícito pelo usuário; superadmin → lista vazia).
- Model novo exige fábrica em `apps/core/tests/test_isolation.py`.
- Queries fora de requisição: `system_context()`/`@system_scope` ou `.unscoped()` explícito; nunca `queryset` de classe em view.
- `AuditEvent` é Hybrid: ao ler pela API (bloco 5), filtrar sempre pelo contrato (eventos do sistema = contas de superadmin).
- Toda view nega por padrão: declarar `required_permission` ou `AllowAuthenticated`.
- Contrato indisponível → 403 `contract-inactive` no login, refresh e toda rota autenticada (2.3).
- Superadmin entra em organização pelo header (qualquer contrato não excluído); a entrada é auditada (3.6).
- Banco local com todas as migrations aplicadas (inclui `audit.0003`, autorizada). Sem usuários. Não regenerar migrations iniciais já aplicadas.
- Autoria pode ser nula em operações de sistema; `bulk`/`update` exigem auditoria
  explícita. `all_objects` não dispensa autorização.
- Eventos de auditoria são imutáveis; services de RBAC e contas de superadmin auditam (ADR 0017).
- Escritas de usuário passam por `save_user`/`delete_user` (`user.save()`, `user.delete()` e lote delegam a eles; só `update`/`bulk_*` pulam as regras); de RBAC, pelos services de `apps/rbac`.
- Antes de produção: cache compartilhado e atômico para o limite de login, proteção
  de borda, MFA/recuperação e `manage.py flushexpiredtokens` agendado diariamente;
  expurgo do `AccessLog` após 6 meses + `LegalHold` (ADR 0007), headers do proxy
  (`DJANGO_ACCESS_LOG_*`), criptografia do banco/backups e NTP (ADR 0018).
- Expurgo e eliminação ficam em entrega própria (ADR 0007).
- `backend/.env` é local e nunca é versionado. Push só quando o usuário pedir.
- Validador no Windows: Git Bash com `PATH=/usr/bin:/bin:$PATH`.
