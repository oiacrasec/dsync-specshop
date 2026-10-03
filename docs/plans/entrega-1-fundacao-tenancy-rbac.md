# Entrega 1 — Fundação, multi-tenancy e RBAC

Plano de implementação da 1ª entrega (ADR 0006 §6). Cada etapa é pequena, fecha com a
skill `validar-etapa` (verificações automáticas, segurança, performance, docs e commit)
e só começa após aprovação do usuário.

**Legenda:** ⬜ pendente · 🔄 em andamento · ✅ concluída

## Decisões de planejamento

| # | Decisão |
|---|---|
| 1 | `Contract` é a **raiz do tenant** e herda direto do `BaseModel` (ADR 0012) |
| 2 | Vínculo usuário → contrato por **campo `contract` no `User`** (vazio para superadmin) |
| 3 | Comandos de expurgo e eliminação (ADR 0007 §4) ficam para uma entrega própria; o soft delete entra na etapa 1.1 |
| 4 | A porta de origem do registro de acesso depende do proxy reverso: decidir na etapa 4.1 |
| 5 | Por aprovação do usuário, executar **1.1 antes de 0.3**, para que o JWT use o `public_id` do usuário sem expor o ID interno (ADR 0007). Ordem: 0.1 → 0.2 → 1.1 → 0.3 → 1.2 → demais etapas |
| 6 | Login: usuário aprovou contar somente falhas por conta, limite inicial 5/min e bloqueio temporário; cache compartilhado/atômico, controles de borda, recuperação e MFA administrativa devem ser tratados antes de produção |

## Bloco 0 — Fundação

| # | Etapa | ADR | Status |
|---|---|---|---|
| 0.1 | Remover Django Admin, `sessions` e `messages`; ajustar `backend/AGENTS.md` e `README` | 0008 | ✅ |
| 0.2 | Prefixo `/api/v1/` (`config/api/v1.py`) + handler global de erros RFC 9457 + `request_id` | 0004, skill `erros-api-rfc9457` | ✅ |
| 0.3 | JWT: login, refresh e logout, com rotação e blacklist | 0004 | ✅ |

## Bloco 1 — Persistência

| # | Etapa | ADR | Status |
|---|---|---|---|
| 1.1 | `BaseModel` (`public_id` v7, datas, autoria, `is_active`, soft delete) + tabelas `dsc_` automáticas + `User` adaptado (migration regenerada) | 0007 | ✅ |
| 1.2 | Os 4 tipos de escopo + system check "escopo declarado" (com as exceções do ADR 0012) | 0006 §1.1 | ⬜ |

## Bloco 2 — Contratos e contexto

| # | Etapa | ADR | Status |
|---|---|---|---|
| 2.1 | `Plan`, `Contract` (vigência, licenças, retenção pós-contrato) e `Organization` | 0006, 0007 | ⬜ |
| 2.2 | Campo `contract` no `User` + regras (licenças, superadmin sem contrato) | 0006 §2 | ⬜ |
| 2.3 | Resolução do contexto (`X-Organization-Id`): 400/403, contrato ativo, superadmin opcional | 0006 §3 | ⬜ |
| 2.4 | Proteção em camadas B a E: manager fail closed, `contextvar`, mixin de view, FKs do serializer | 0006 §1.3 | ⬜ |
| 2.5 | Testes de isolamento genéricos (camada F) | 0006 §1.3 | ⬜ |

## Bloco 3 — RBAC

| # | Etapa | ADR | Status |
|---|---|---|---|
| 3.1 | Registry de permissões (Python puro): escopos permitidos e reservadas | 0009 §1, §3.1 | ⬜ |
| 3.2 | `Profile`, permissões do perfil e atribuições (com exceções de organização) | 0009 §2, §3 | ⬜ |
| 3.3 | Cálculo da permissão efetiva + permissão do DRF que **nega por padrão** | 0009 §4 | ⬜ |
| 3.4 | Perfil essencial "Administrador do contrato" (fixture, acesso total dinâmico) | 0009 §5 | ⬜ |
| 3.5 | Lista de organizações acessíveis + busca contrato → organização do superadmin | 0009 §6 | ⬜ |
| 3.6 | Auditoria das mudanças de permissão e das entradas do superadmin em organização | 0009 §7 | ⬜ |

## Bloco 4 — Registro de acesso

| # | Etapa | ADR | Status |
|---|---|---|---|
| 4.1 | `AccessLog` + middleware (IP, porta, data UTC, usuário, contrato, organização) + retenção mínima de 6 meses | 0006 §6, skill `marco-civil` | ⬜ |

## Bloco 5 — Endpoints

| # | Etapa | ADR | Status |
|---|---|---|---|
| 5.1 | Mixin `options` | 0011 | ⬜ |
| 5.2 | Admin: planos e contratos (`/api/v1/admin/…`) | 0008 | ⬜ |
| 5.3 | Admin: usuários, superadmins e admins de contrato | 0010 | ⬜ |
| 5.4 | Área comum (admin do contrato): organizações, usuários, perfis e atribuições | 0009 §3.1 | ⬜ |
| 5.5 | OpenAPI (`drf-spectacular`), navegável só para autenticados | 0004 | ⬜ |
