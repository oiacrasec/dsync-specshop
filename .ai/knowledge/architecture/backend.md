# Backend — conhecimento compilado

## Estado atual (2026-10-04, após a etapa 2.5 e a reorganização dos módulos)

Fonte de verdade das convenções: `backend/AGENTS.md` e
`backend/docs/standards/django-style.md`. Resumo:

| Tema | Regra atual |
|---|---|
| Isolamento | managers `objects`/`all_objects` filtram pelo contexto (`core/tenancy.py`) e falham sem ele; global só `unscoped()`/`system_context()`/`@system_scope`; `_base_objects` só para o Django |
| Contexto | middleware zera; permissões do DRF gravam o contrato; header `X-Organization-Id` grava a organização |
| Views/serializers | `TenantScopedViewMixin` (`model`, nunca `queryset` de classe) e `ScopedModelSerializer` (FKs por `public_id`) |
| Testes | `system_context()` automático no `conftest`; fábrica obrigatória em `test_isolation.py` para todo model |
| Módulos | `models`, `managers`, `middleware`, `utils`, `constants` (só literais), `exceptions` (só classes), módulos temáticos (`core/problems.py`) |
| SQL à mão | `queries/<nome>.py`; `-- NOME` em PT-BR na 1ª linha; CTE/temporária `parametros` (`contract`/`organization`, id interno); um `execute`; selector com `@tenant_params` + `fetch_all` |
| Auditoria | `apps/audit` append-only (ADR 0017); services de RBAC e contas de superadmin auditam |
| Idioma | código em inglês; rótulos/mensagens em português |

Os itens abaixo são o histórico por etapa (podem citar estados já superados; vale a tabela acima).

## Histórico

Fontes: `backend/config/settings/base.py`, `backend/config/settings/production.py`,
`backend/config/urls.py`, `backend/config/api/v1.py`, `backend/apps/core/{exceptions,problems}.py`,
`backend/apps/core/middleware.py`, `backend/apps/core/{models,managers,utils,views}.py`,
`backend/apps/users/{models,managers,authentication,serializers,services,views,urls,throttles}.py`,
`backend/AGENTS.md`, ADRs 0004/0007/0008
e plano da Entrega 1.

- Django Admin, sessões e messages removidos, incluindo seus middlewares,
  context processors, cookies de sessão configurados e `apps/users/admin.py`.
- `django.contrib.auth` e `contenttypes` mantidos: usuário, senhas e management
  command `createsuperuser` continuam disponíveis.
- Estrutura de rotas em `/api/v1/`, sem endpoints de negócio publicados; `/admin/`
  e `/admin/login/` retornam 404. Fallback para `/api/` retorna Problem Details.
- DRF usa JWTAuthentication e IsAuthenticated globais. Login/refresh/logout
  públicos em /api/v1/auth/, com serializers de entrada, views finas e services
  transacionais. Não adicionar autenticação por sessão.
- Tokens usam claim public_id (UUID), access 15 min e refresh 1 dia, rotação e
  blacklist instalada. Lock de OutstandingToken impede rotação concorrente;
  usuários inativos/excluídos não autenticam nem renovam. Logout revoga refresh,
  mantendo access válido até expiração, conforme ADR 0004.
- Chave JWT independente (mínimo 32 bytes), somente no ambiente. Respostas
  de autenticação têm no-store; nenhuma credencial ou token aparece nos logs.
- `BaseModel` substituiu `TimeStampedModel`: BIGINT interno, UUID v7 único externo,
  datas, autoria explícita por `actor`, `is_active` e soft delete.
- Metaclasse gera nomes `dsc_` em snake_case antes da criação das relações N:N.
  `User(AbstractUser, BaseModel)` preserva o `is_active` e a criação de usuários e
  superusuários do Django. A migration inicial foi regenerada após verificar banco
  vazio. Migrations do usuário e da blacklist aplicadas ao banco local com
  autorização na etapa 0.3; nenhuma migration pendente e nenhum usuário criado.
- `objects` oculta excluídos, não inativos; `all_objects` inclui excluídos.
  Exclusão de instância e queryset preserva registros, é idempotente e não faz
  cascata. Exclusão em lote usa uma query; autoria pode ser nula no bootstrap.
  Operações bulk/update exigem auditoria explícita do chamador. Expurgo e
  eliminação legal continuam pendentes na entrega própria.
- Handler global converte exceções DRF, Django e de domínio em RFC 9457, inclusive
  erros 500, sem detalhes internos no corpo. Validação retorna 422; sintaxe, 400;
  conflitos de domínio, 409. Catálogo: `docs/api/errors.md` e `docs/api/errors/`.
- `RequestIdMiddleware` é o primeiro middleware, inclusive em produção, antes de
  SecurityMiddleware e WhiteNoise. Gera UUID v7, ignora IDs enviados pelo cliente,
  devolve `X-Request-Id` e restaura o contextvar após a requisição.
- Logs usam o mesmo ID, inclusive logs do Django com request fora do contexto ativo.
  O filtro de logging e seu contextvar ficam em `apps/core/log_filters.py`, nome
  escolhido pelo usuário para distinguir dos futuros filtros da API.
  O middleware registra só erros: 4xx em WARNING e 5xx em ERROR; não registra
  conclusão de respostas 2xx/3xx. Observabilidade mais ampla fica para depois,
  conforme decisão do usuário.
  Logs fora de requisição usam `-`; 500 registra classe/frames, sem mensagem da
  exceção, conteúdo de requisição ou variáveis locais.
- Exceções tratadas preservam rollback de `ATOMIC_REQUESTS` e headers de protocolo.
- Por confirmação do usuário, limite conta somente falhas de login por conta:
  5/min, janela fixa, bloqueio temporário de 60 s após atingir o limite. Login
  bem-sucedido e 400/422 não consomem limite; nomes equivalentes são normalizados
  e HMAC protege a chave do cache. Contadores atômicos no cache local, testados
  com falhas concorrentes. Cache compartilhado/controles de produção e limpeza
  diária dos tokens expirados dependem da infraestrutura.
- Etapa 1.2: SharedModel, HybridScopedModel, ContractScopedModel e
  OrganizationScopedModel abstratos, com exemplos práticos nas docstrings.
  FKs de contexto PROTECT para contracts.Contract/Organization; índice composto
  contract/organization neste último tipo. Meta deve herdar a do tipo escolhido.
  Check core.E001/E002/E003 registrado em CoreConfig.ready: exige exatamente
  um tipo e campos compatíveis nos apps próprios, inclui proxies/unmanaged,
  ignora terceiros e N:N automáticas. Exceções fechadas users.User/contracts.Contract.
  Check sem SQL; tipos ainda não filtram queries. ADR 0013 registra decisão do
  usuário: Plan/Contract/Organization em apps/contracts.
- Etapa 2.1: apps/contracts instalado, gerado por startapp sem Admin. Plan herda
  SharedModel; Contract é raiz BaseModel; Organization herda ContractScopedModel.
  Tabelas dsc_plan/contract/organization e migration inicial aplicada localmente.
  Plan tem name e quatro quotas opcionais: max_organizations, max_storage_bytes,
  max_integrations, max_operations_per_month. Null = não definido; zero = zero;
  campos não negativos, sem contadores/enforcement por pedido do usuário.
  ADR 0014: modalidade pertence à implantação, não a Plan/Contract.
  Contract tem nome, FK Plan PROTECT, start_date, end_date opcional, licenses >= 1,
  post_termination_retention_days padrão 90/faixa 0–365. Constraints protegem
  datas/licenças/retenção no banco. Organization tem name e FK Contract PROTECT.
  Sem seeds/endpoints novos, quota enforcement/expurgo/contexto ainda pendentes.
  Docstrings com exemplos práticos; __str__ só usa campo local, sem queries.
- Etapa 2.2: User.contract PROTECT, nullable só para superadmin por constraint
  dsc_user_contract_by_role. Service save_user interno transacional, locks no
  usuário existente e contrato de destino, verifica contrato ativo/vigência.
  Usuário escolheu contar também inativos: todos os não excluídos consomem vaga;
  soft delete libera, cadastro/transferência/restauração exigem vaga no destino.
  Reativar/editar usuário já contado não consome outra vaga. ADR 0015 registra.
  UserManager delega create_user/create_superuser e versões async ao serviço,
  preservando hash e normalização Django. Escritas que consomem/restauram vagas
  não podem usar save/update/bulk direto; constraint só garante papel/vínculo.
  Migration users.0002 aplicada localmente após verificar 0 usuários existentes.
  Sem endpoint/autorização novo; login/refresh/contexto por contrato ainda
  serão conectados na etapa 2.3. Testes anteriores usam contratos explícitos ou
  superadmins quando testam só BaseModel, sem defaults artificiais no runtime.
- Usuário decidiu antecipar o RBAC antes de 2.3, porque o contexto depende das
  atribuições ainda não criadas. Etapa 3.1 concluída: permission_registry.py em
  core, Python puro sem Django/banco, PermissionScope CONTRACT/ORGANIZATION,
  definições imutáveis e mapa protegido. Código desconhecido, escopo inválido e
  reservada fora do perfil essencial são rejeitados. Manage não expande ações.
  Catálogo inicial de 11 operações de gestão reservadas em CONTRACT; novos
  códigos entram com o domínio. Essential_profile somente interno após validar
  perfil essencial, nunca payload. Nenhum acesso/endpoint/autorização novo.
- Etapa 3.2 concluída: apps/rbac, aprovado pelo usuário (ADR 0016), tem Profile e
  ProfilePermission HybridScopedModel, Assignment e AssignmentExclusion
  ContractScopedModel. scope_organization/excluded_organization são alvos das
  concessões, não contexto de persistência ORGANIZATION. Constraints de nomes,
  chave essencial, concessão XOR, escopo e unicidade com NULLS NOT DISTINCT.
  Services atomic exigem superadmin ativo consultado no banco, advisory lock
  global para configuração RBAC, lock no usuário ao atribuir, contexto coerente,
  registry/escopos/reservadas válidos. Perfil essencial só por fixture/migration;
  edição/remoção de suas atribuições bloqueada até 3.4. Perfil em uso gera 409;
  soft delete trata permissões/exceções em lote. save_user bloqueia transferência
  enquanto houver atribuições. ORM direto/bulk não substitui essas regras.
  Aviso de nomes de clientes retorna UUIDs em QuerySet lazy para futura paginação.
  Migration rbac.0001 aplicada localmente, sem seeds. 39 testes novos; validação
  completa com 227 testes. Concorrência de nomes testada no PostgreSQL; criação
  de atribuição com perfil usa 22 queries constantes com 1/30 permissões.
  Sem endpoints, autorização efetiva ou auditoria de eventos (3.6) nesta etapa.
- Próxima etapa: 3.3, cálculo puro de acesso e proteção DRF; concluir RBAC antes de retomar 2.3.
  A etapa 1.1 foi antecipada com aprovação do usuário para usar UUID nos tokens.
- Estilo compacto dos models definido pelo usuário: documentação canônica em
  `backend/docs/standards/django-style.md`, com exemplo em
  `backend/docs/examples/model.md`. AGENTS e README apontam para essas fontes.
  `models.py` mantém formatação manual, mas respeita o limite de 120 caracteres
  confirmado pelo usuário, com E501 e demais regras de lint ativas.
