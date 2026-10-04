# Histórico do conhecimento

## 2026-10-04 — Etapa 3.6: trilha de auditoria

- ADR 0017; `apps/audit` (startapp) com `AuditEvent` Hybrid, append-only (save/delete/lote
  levantam erro). Campo `context_organization` (o nome `organization` é reservado ao escopo).
- Services de RBAC gravam evento com snapshot before/after na mesma transação (+2 queries).
- `save_user`/`delete_user` auditam contas de superadmin; `createsuperuser` → autor nulo.
- Entrada do superadmin: `resolve_organization` marca, middleware grava após a resposta
  (fora do ATOMIC_REQUESTS), única por superadmin + organização + jti.
- Migration audit.0001 criada; aplicação no banco local depende do usuário.
- 304 testes. Docs: ADR 0017, domain/audit.md, rbac, README, AGENTS, overview, plano, handoff.

## 2026-10-04 — Etapa 2.3: contrato a cada requisição e contexto do superadmin

- `Contract.is_available()`; `ensure_contract_available` no login (após senha), refresh e
  na autenticação JWT (`get_user` com `select_related('contract')`, 1 query).
- Superadmin: organização ativa de qualquer contrato não excluído; sem header em endpoint
  de negócio → 400. Contrato excluído → 403 (confirmar com o usuário).
- Corrigido `@transaction.atomic` deslocado para fora do `login` durante a edição.
- 295 testes. Docs: api/authentication, errors/contract-inactive, api/organizations,
  domain/contracts e rbac, overview, plano (decisões 16–17), README, AGENTS, handoff.

## 2026-10-03 — Etapa 3.5: organizações acessíveis

- `accessible_organizations` filtra no banco (CONTRACT menos interseção das exceções, + diretas);
  `GET /api/v1/me/organizations/` (AllowAuthenticated, never_cache, superadmin → []).
- Busca do superadmin em `apps/contracts/selectors.py`; endpoint na área admin (5.2).
- 11 testes novos; 283 passaram. Docs: api/organizations.md, api/overview, domain/rbac,
  overview, plano, README, handoff.

## 2026-10-03 — Etapa 3.4: perfil essencial e último administrador

- Migration de dados rbac.0002 (idempotente) cria/restaura o perfil `contract_admin`;
  aplicada ao banco local.
- `ensure_contract_keeps_admin` (lock do contrato) protege atribuições, desativação
  em `save_user` e o novo `delete_user`; vale para o superadmin (`LastContractAdmin` 409).
- `User.delete()` e `UserQuerySet.delete()` (objects e all_objects) delegam a `delete_user`,
  um a um e atômico; teste genérico de lote em 1 query passou a usar `Plan`.
- `User.save()` delega a `save_user` (licenças, papel, contrato, último admin); `update_fields`
  sem `RULE_FIELDS` grava direto. Só `update()`/`bulk_*` ficam fora (a constraint do banco segura o papel).
- Teste de concorrência com threads; 263 testes e validador completo passaram.
- Arquivos: apps/rbac (migration, selectors, services, testes), apps/users/services,
  conftest, backend/AGENTS.md, README, docs/domain/rbac.md, overview, plano, handoff.

## 2026-10-03 — Etapa 3.2: perfis e atribuições RBAC

- Usuário aprovou apps/rbac (ADR 0016), separado de users/core. App gerado por
  startapp; quatro models com escopos, UUIDs, autoria, soft delete e constraints.
- Selectors para nomes, aviso lazy de contratos e perfil em uso; services atomic
  exigem superadmin ativo, serializam configuração via advisory lock e validam
  contrato/organização, registry, reservas e escopos. Sem autorização de cliente
  ou endpoints; cálculo efetivo fica em 3.3.
- Perfil essencial protegido de edição/exclusão, sem fixture agora. Edição e
  remoção de suas atribuições negadas até as proteções específicas de 3.4.
  Revisão fechou bypass por substituição de perfil, usuário ou desativação.
- save_user bloqueia troca de contrato enquanto existirem atribuições. Exclusões
  lógicas tratam permissões/exceções em lote e bloqueiam perfil ainda atribuído.
- 39 testes novos; 227 passaram no validador completo, junto de lint, formatação,
  ausência de mudanças de migrations e checks desenvolvimento/produção. Teste
  PostgreSQL de concorrência de nomes e 22 queries constantes com 1/30 permissões.
- Migration rbac.0001_initial aplicada ao banco local autorizado, somente schema,
  sem seeds ou backfill. Documentação de domínio/registry/erro, ADR/índice,
  AGENTS/README, overview, plano, memória e handoff sincronizados.

## 2026-10-03 — Etapa 3.1: registry RBAC antecipado

- Ao iniciar 2.3, verificada dependência das atribuições de 3.2. Usuário decidiu
  antecipar RBAC antes do contexto; nova ordem registrada no plano.
- Registry em apps/core/permission_registry.py: Python puro, códigos/escopos/
  reservadas, definições imutáveis, catálogo inicial de gestão previsto no ADR
  0009 e mapa protegido. Unknown/duplicados/escopos inválidos são rejeitados;
  reserved só validável para perfil essencial verificado. Manage não expande.
- 28 testes novos sem banco, incluindo reservas, desconhecidos, flags inválidos,
  escopos, imutabilidade e ausência de imports do framework/runtime.
- Validador completo passou: 188 testes, lint, formatação, migrations e checks
  de desenvolvimento/produção. Sem migrations novas ou queries neste módulo.
- Atualizados documentação do registry, AGENTS/README, overview, plano e memória.
  Sem endpoints, models, migrations, concessões ou mudanças nos fluxos JWT.

## 2026-10-03 — Etapa 2.2: vínculo de usuário e licenças

- User.contract PROTECT e constraint papel/vínculo: comum com contrato,
  superadmin sem contrato. Migration users.0002 aplicada após verificar banco
  local sem usuários, sem backfill nem mudanças em registros existentes.
- Usuário escolheu contar inativos nas licenças; todos os não excluídos contam.
  Soft delete libera, restauração/transferência/cadastro exigem vaga; edição
  ou reativação de já contado não consome vaga nova. Decisão no ADR 0015.
- Service save_user transacional com locks no usuário/contrato, validação de
  contrato ativo/vigência, contagem no banco e exceção 409 existente. Manager
  de criação delega ao serviço, inclusive async, preservando Django.
- 14 testes novos, incluindo concorrência PostgreSQL e 5 queries constantes
  para criar com 1/30 usuários. Fixtures anteriores ajustadas ao vínculo explícito;
  validador completo passou com 160 testes, lint, formatação, migrations e checks.
- Atualizados models/managers/services/migration/testes de users, conftest,
  testes core/contracts, docs domínio/erros/ADR/índice/plano/overview,
  AGENTS/README e memória/handoff. Sem novos endpoints; próximo contexto 2.3.

## 2026-10-03 — Etapa 2.1: planos, contratos e organizações

- App apps/contracts gerado por startapp e instalado, sem Admin/rotas vazias.
  Plan(SharedModel), Contract(BaseModel), Organization(ContractScopedModel),
  com exemplos nas docstrings, estilo compacto e tabelas dsc_ automáticas.
- Usuário esclareceu que modalidade pertence à implantação, sem campo no model
  (ADR 0014). Aprovou somente preparar a tabela para quotas: organizações,
  armazenamento em bytes, integrações e operações por mês; campos opcionais
  não negativos, sem valores padrão, contadores ou enforcement.
- Contract guarda plano PROTECT, vigência, licenças >= 1 e retenção 90/faixa 0–365;
  constraints protegem datas/licenças/teto de retenção. Organization guarda nome
  e contrato obrigatório PROTECT. Sem novos dados de perfil ou endpoints.
- Migration contracts.0001_initial aplicada localmente com autorização persistente.
  Validador completo: 146 testes, lint, formatação, migrations e checks passaram.
  23 testes novos cobrem persistência, limites, constraints, soft delete, PROTECT,
  escopos e queries constantes 1/30 organizações. Sem registros iniciais cadastrados.
- Atualizados config/settings/base.py, models/apps/migration/testes do novo app,
  docs/domain/contracts.md, ADR/índice/plano/overview, backend AGENTS/README,
  docs de escopos e memória/handoff. Próxima etapa 2.2 depende de confirmação.

## 2026-10-03 — Etapa 1.2: escopos de persistência

- Criados quatro tipos abstratos derivados de BaseModel, com exemplos práticos
  nas docstrings por pedido do usuário: Shared, Hybrid, Contract e Organization.
- Usuário confirmou apps/contracts para Plan/Contract/Organization (etapa 2.1)
  e PROTECT nas relações de contexto; decisão registrada no ADR 0013.
- FKs lazy, nulabilidade conforme ADR 0006, índice composto contract/organization.
  Check core.E001/E002/E003 registrado no CoreConfig.ready, sem SQL, exige um tipo
  e campos compatíveis. Exceções fechadas users.User/contracts.Contract (ADR 0012).
- 24 novos testes; validador completo passou com 123 testes, lint, formatação,
  migrations e checks de desenvolvimento/produção. Sem migrations novas/aplicadas.
- Atualizados core/models.py, apps.py, checks.py, testes, AGENTS/README/standard,
  docs de escopos, índice dos ADRs, overview, plano, memória e handoff.
- Isolamento de queries/contexto e testes entre tenants seguem nas próximas etapas;
  não houve novos endpoints nem coleta de dados. Revisões registradas no handoff.

## 2026-10-03 — Etapa 0.3: autenticação JWT

- Adicionados SimpleJWT 5.5.1 e PyJWT transitivo 2.15.1 (MIT); metadados do PyPI
  sem advisories nas versões instaladas e pip check sem conflitos.
- Configurados JWT global, public_id UUID como claim, access 15 min, refresh
  1 dia, rotação e blacklist. Chave independente gerada apenas no .env local.
- Criados authentication/serializers/services/views/urls/throttles em users:
  login, refresh e logout públicos em /api/v1/auth/, respostas JSON/no-store,
  RFC 9457 e services transacionais. Locks e nova checagem da blacklist impedem
  duas renovações simultâneas; usuário indisponível retorna 401.
- Usuário confirmou 5 tentativas e depois aprovou a boa prática: contar apenas
  falhas por conta, com janela de 60 s e bloqueio temporário de 60 s. Contadores
  atômicos no cache local, chave HMAC, identidade normalizada; sucesso não conta.
- Migrations de auth/contenttypes/users/blacklist aplicadas ao banco local com
  autorização; dsc_user sem usuários criados, nenhuma migration pendente.
- Testes cobrem autenticação, revogação, concorrência, rollback, ausência de
  segredos nos logs, limite de falhas e queries constantes (login 6, refresh 19,
  logout 13; access autenticado 1 query na rota de teste sem transação de request).
- Contrato em docs/api/authentication.md; AGENTS, README, overview, plano,
  inventário das dependências, memória e handoff sincronizados. Cache compartilhado,
  controles de borda, MFA/recuperação e limpeza diária ficam pendentes para produção.
- Validador completo passou: 99 testes, lint, formatação, migrations e checks de
  desenvolvimento/produção; revisão de segurança/performance registrada no handoff.

## 2026-10-03 — Limite de linha alterado para 120

- Por pedido do usuário, Ruff e padrão do backend passaram de 100 para 120
  caracteres, mantendo E501 ativo e formatação manual nos models.
- Models e exemplo sincronizados com o formato compacto dentro do novo limite;
  AGENTS, standard Django, overview, conhecimento e handoff atualizados.
- Ruff ajustou quatro arquivos ao novo limite; validador completo passou com
  58 testes, lint, formatação, migrations e checks de desenvolvimento/produção.

## 2026-10-03 — Padrão de models documentado no backend

- Revisados os models de core/users; agrupados os itens restantes de
  `update_fields` em BaseModel, sem alteração de comportamento.
- Após o usuário apontar linhas longas, confirmou o limite de **100 caracteres**.
  FKs foram quebradas mantendo argumentos agrupados e alinhamento vertical;
  removida a exceção E501 dos models, preservando a exclusão do formatter.
- Criados `backend/docs/standards/django-style.md` e `backend/docs/examples/model.md`
  nos locais previstos pelo baseline. AGENTS/README passaram a referenciar essas
  fontes; memória e handoff sincronizados.

## 2026-10-03 — Preferência de formatação dos models

- Usuário definiu campos compactos, argumentos agrupados e continuação alinhada,
  sem um argumento por linha. Preferência registrada em `backend/AGENTS.md`.
- Preservado o exemplo editado pelo usuário em `BaseModel`; os demais campos
  de autoria foram ajustados ao mesmo formato, sem mudança de comportamento.
- `backend/pyproject.toml` preserva formatação manual em `models.py`, excluindo
  esses arquivos do formatter e permitindo linhas longas; demais regras de lint
  mantidas. Handoff atualizado.

## 2026-10-03 — Etapa 1.1 antecipada ao JWT

- Usuário aprovou executar 1.1 antes de 0.3, para usar `public_id` nos tokens
  sem expor a PK interna. Ordem registrada no plano da Entrega 1.
- `apps/core/models.py`: BaseModel, tabelas `dsc_` automáticas, UUID v7, datas,
  autoria explícita, consultas sem excluídos e soft delete individual/em lote.
- `apps/users/{models,managers}.py`: User adaptado, preservando `is_active`,
  create_user/create_superuser e bloqueando autenticação dos excluídos.
- Migration inicial regenerada após confirmar banco vazio; não aplicada ao
  banco de desenvolvimento. Testes cobrem dados preservados, autoria, unicidade,
  autenticação e exclusão em lote com número constante de queries.
- Sincronizados AGENTS/README do backend, overview, plano, memória e handoff.
  Expurgo, eliminação e escopos continuam em suas etapas futuras.

## 2026-10-03 — Nome do módulo de filtros de log

- Por preferência do usuário, `apps/core/request_id.py` foi renomeado para
  `apps/core/log_filters.py`. O contexto de correlação permanece junto ao filtro.
- Atualizados imports em middleware/exceções/testes e caminho do filtro nos settings.
- Documentação, memória e handoff atualizados. Comportamento preservado.

## 2026-10-03 — Logs de requisição apenas para erros

- Por decisão do usuário, `RequestIdMiddleware` registra apenas respostas 4xx
  (WARNING) e 5xx (ERROR). Sucessos e redirecionamentos não geram log de conclusão.
- Mantido `X-Request-Id` em todas as respostas e correlação dos erros com logs.
- Atualizados middleware, testes, contrato em `docs/api/`, memória e handoff.
- Observabilidade mais ampla será tratada futuramente; AccessLog da etapa 4.1
  continua previsto no plano.
- Validador completo passou com 47 testes, lint, formatação, migrations e checks
  de desenvolvimento/produção. Permanece o aviso não impeditivo de cache do pytest.

## 2026-10-03 — Etapa 0.2: API versionada, erros e correlação

- Criado `backend/config/api/v1.py`, incluído sob `/api/v1/` em `config/urls.py`;
  fallback de URLs da API retorna 404 em RFC 9457, inclusive com DEBUG ligado.
- Criados `apps/core/{exceptions,middleware,request_id}.py`: handler global,
  exceções de domínio, request ID gerado no servidor e filtro de logs.
- Settings base/production integram handler, middleware e correlação de logs;
  middleware de correlação fica antes de SecurityMiddleware e WhiteNoise.
- Criados testes de erros, rollback, isolamento concorrente, headers e montagem
  de rotas; atualizados AGENTS/README do backend e overview arquitetural.
- Documentado contrato em `docs/api/{overview,errors}.md` e os 11 tipos em
  `docs/api/errors/`; memória, plano e handoff sincronizados.
- Validador completo passou: 46 testes, lint, formatação, migrations sem alterações,
  system checks e checks de produção. Aviso não impeditivo de cache do pytest.
- Nenhuma nova dependência, query de aplicação ou regra de negócio de etapas futuras.

## 2026-10-03 — Etapa 0.1: remoção do Django Admin e sessões

- Removidos Django Admin, sessions, messages e integrações associadas.
- Mantida permissão global `IsAuthenticated`, sem autenticadores até a etapa 0.3.
- Testadas rotas ausentes (404) e criação de superusuário sem o Admin.
- Atualizados `backend/config/settings/{base,production}.py`, `backend/config/urls.py`,
  `backend/apps/users/admin.py` (removido), testes de core/users, `backend/AGENTS.md`,
  `backend/README.md`, `docs/architecture/overview.md`, plano da Entrega 1 e handoff.
- Conhecimento compilado em `.ai/knowledge/architecture/backend.md`.
- Validador completo passou: 5 testes, lint, formatação, migrations sem alterações,
  system checks e checks de produção. Aviso não impeditivo de cache do pytest.
