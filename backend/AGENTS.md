# AGENTS.md — backend

Regras específicas do backend Django. Complementam o `AGENTS.md` da raiz e
prevalecem dentro de `backend/`.

## Stack

Python 3.14 · Django 5.2 LTS · Django REST Framework · PostgreSQL. Versões sempre
na última LTS, com `~=` nos requirements (patches automáticos).

## Organização

- `config/` contém **apenas** configuração global (settings, URLs raiz, ASGI/WSGI). Nada de regra de negócio.
- Cada domínio é um Django App em `apps/<dominio>/`, criado com `django-admin startapp` e com `name = 'apps.<dominio>'` no `apps.py`.
- `apps/core/` guarda só o que é compartilhado por vários domínios. Não vira depósito genérico.
- Fixtures ficam dentro do app dono do dado (`apps/<dominio>/fixtures/`).

## Camadas de um app

| Arquivo | Responsabilidade |
|---|---|
| `models.py` | persistência e comportamento da entidade |
| `serializers.py` | validação, entrada/saída da API e CRUD auditado pelo DRF |
| `selectors.py` | **leituras** |
| `services.py` | operações próprias de domínio, além do CRUD dos serializers |
| `views.py` | camada HTTP, sempre fina |
| `urls.py` | rotas do app |
| `permissions.py` | autorização |
| `filters.py` | FilterSets django-filter com filtros/busca/ordenação declarados |
| `tests/` | testes do app (`test_*.py`) |

Leitura: `View → Queryset → Model` para consultas simples; lógica de leitura própria
fica em selectors. CRUD auditado: `View → Serializer → Model` (ADR 0030).
Herdar `BaseModelSerializer`, ou `BaseAdminModelSerializer` na administração global;
declarar `audit_fields` e `audit_events`. A base usa super().create/update do DRF,
autoria explícita, auditoria e hooks create_extra/update_extra antes da persistência.
Campos são validados pelo DRF; regras entre campos ficam no validate() do recurso.
Não adicionar full_clean genérico nem model_validation_fields/exclude à base.
Validar e salvar na MESMA transaction.atomic; na API, ATOMIC_REQUESTS cobre ambos.
BaseModelViewSet bloqueia update/delete antes da validação; fora da view, a base
recarrega a instância com lock. Exclusão por SerializerDeleteMixin e serializer.delete().
Services continuam nas operações próprias de users/RBAC e fluxos além do CRUD.
Nas listagens, o selector fornece o queryset com escopo; FilterSet aplica filtros
antes da paginação. Filtros continuam lazy, sem queries/escritas próprias por item.
Busca única: declarar general_search_fields no FilterSet (padrão vazio), combinados
com OR; filtros individuais combinam com AND. Padrão icontains; alterar lookups por
general_search_lookups explicitamente, sem herdar lookup de filtro individual.
Somente texto e relações singulares diretas; UUID/datas/números usam filtros próprios.
Schema retorna general_search separado de filters; null desabilita o campo único.
options_search_fields continua sendo configuração exclusiva de options (ADR 0029).
Crie cada arquivo só quando ele for necessário.

## Estilo dos models

Seguir [docs/standards/django-style.md](docs/standards/django-style.md) e o
[exemplo de model](docs/examples/model.md): campos compactos, argumentos agrupados
e continuação alinhada. A preferência do usuário vale para todos os models.
Ao declarar rótulos de campos, usar sempre `verbose_name=_('...')` explicitamente,
mesmo quando Django aceita o rótulo como argumento posicional.
`models.py` tem formatação manual preservada, com limite obrigatório de **120
caracteres** (`E501` ativo); demais regras de lint continuam ativas.

## Regras

- Settings por ambiente em `config/settings/`. Segredos e valores de ambiente **só** por variável de ambiente (`.env.example` documenta todas).
- `AUTH_USER_MODEL = 'users.User'`: sempre use `get_user_model()` ou `settings.AUTH_USER_MODEL`.
- API segura por padrão: `IsAuthenticated` global; libere rotas públicas explicitamente na view.
- Rotas da API em `config/api/v1.py`, sob `/api/v1/`. Erros via exceções e handler
  global RFC 9457 (classes em `apps.core.exceptions`, respostas e handler em
  `apps.core.problems`), nunca corpo de erro manual na view.
- OpenAPI (ADR 0004, `drf-spectacular`): `APIView` e actions customizadas declaram
  `@extend_schema` (request/responses reais; helpers em `apps/core/openapi.py`). Toda mudança
  de API regenera `docs/api/openapi-v1.yaml` com
  `manage.py spectacular --validate --fail-on-warn --file ../docs/api/openapi-v1.yaml`;
  o teste `test_versioned_schema_file_matches_the_code` acusa divergência. Views que exigem
  a organização ativa sem `RequiredPermission` declaram `organization_header = True`.
- Views e serializers só pelas bases (ADR 0021): `BaseAPIView` (no-store por padrão; `UPLOAD_PARSERS`
  para multipart), `BaseSerializer`, `BaseModelSerializer`, `BaseModelViewSet`. Nunca `APIView`
  ou `serializers.Serializer` direto (teste-trava em `test_base_classes.py`); sem `never_cache` à mão.
- Mídia só pela fachada `apps.core.media` (ADR 0039 §6): models com `MediaFileField`/
  `MediaImageField`; fora de models `media.save/url/open_file/delete`. Nunca `models.FileField`,
  `models.ImageField`, `default_storage` ou `storages` direto (teste-trava em `test_media_facade.py`).
  Soft delete/`update` não limpam arquivos: o service chama `media.delete_on_commit`.
  Nomes sempre `<public_id do contrato | system>/<pasta>/…`; `media.save` exige `contract=` (None = system).
- Usar `serializer.is_valid(raise_exception=True)`; validação retorna 422. Mensagens
  de validação não devem incluir dados pessoais ou detalhes internos.
- Actions customizadas usam try/except e helpers de core/responses.py:
  build_result_response(result, status_code=...) e
  build_exception_response(exception=exc, request=request). O segundo delega ao
  handler RFC 9457, com rollback, headers e logging seguro (ADR 0031).
- `RequestIdMiddleware` vem antes dos demais middlewares; `X-Request-Id` é gerado
  pelo servidor e correlaciona logs e erros (contrato em `docs/api/errors.md`).
- Não usar Django Admin, sessões ou messages (ADR 0008). Não registrar `admin.py`,
  `SessionAuthentication` nem middlewares de sessão/autenticação do Django.
- Administração própria pela API e pelo frontend; manutenção por management commands
  (`createsuperuser` continua disponível). JWT e `IsAuthenticated` são globais;
  login/refresh/logout em `/api/v1/auth/` são públicos e usam JSON. Contrato em
  `../docs/api/authentication.md`; tokens identificam pelo `public_id` do usuário.
- Escritas de autenticação ficam em `apps/users/services.py`. Refresh/logout
  mantêm a transação e o lock da blacklist, incluindo nova verificação após o lock.
- Primeiro acesso (ADR 0034): JWTAuthentication bloqueia usuário comum com
  must_change_password antes das permissões/contexto; superadmin isento.
  Só PasswordChangeView declara allow_password_change_required=True; refresh/logout
  seguem públicos. Troca autenticada atua somente em request.user, sem organização;
  revalida conta/senha sob lock próprio, validadores Django, Argon2 e auditoria atômica
  sem senha/hash. Login e troca retornam UserSummarySerializer (whitelist explícita).
  Não adicionar consulta/escrita/hash/lock na navegação para conferir a flag.
- Provisionamento (6.6, decisão 42): `apps.administration.services.provision_contract`,
  action `provision` do ContractViewSet. Locks: `rbac.services.begin_write` antes do
  contrato. Só contrato disponível sem usuários/organizações; senha temporária de
  `users.utils.generate_temporary_password`, devolvida uma vez, nunca em log/auditoria.
- Admins do contrato (6.7, decisão 43): `rbac.selectors.contract_admin_users` (unscoped,
  só administração) e `users.services.reset_password` (flag + revoga refresh + auditoria).
  Locks de conta e refresh sempre usuário → OutstandingToken → UserSession (refresh, reset,
  encerrar sessões); não inverter.
- MFA opcional (ADR 0041): exigir segundo passo apenas quando UserMfa.confirmed.
  Segredo Fernet com DJANGO_MFA_ENCRYPTION_KEY própria; reservas somente HMAC.
  Views de confirmação são non_atomic_requests, com atomic explícito no service:
  persistir falhas antes de levantar erro. Lock usuário → fator → token → sessão;
  reset administrativo começa pelo lock RBAC e ordena contas por pk. Mudanças
  revogam todos os refresh/sessões/provas; access já emitido até 15 min (decisão 83).
  Reset de admin, inclusive inativo, só pelo superadmin; comuns pelo admin do contrato.
  Sem consultas novas de MFA na navegação. Contratos em ../docs/api/mfa.md.
- Chave JWT independente via `DJANGO_JWT_SIGNING_KEY`; nunca versionar seu valor,
  logar tokens ou retornar respostas de autenticação cacheáveis.
- Limite de login conta apenas falhas por conta: `DJANGO_AUTH_LOGIN_RATE=5/min`,
  com bloqueio temporário de 60 s. Sucesso e validação não consomem o contador.
  Preservar normalização do username, HMAC da chave e operações atômicas de cache;
  cache compartilhado e proteção da borda são requisitos antes de produção.
- Models próprios herdam exatamente um dos quatro tipos de escopo de
  `apps.core.models`; somente `users.User` e `contracts.Contract` herdam diretamente
  `BaseModel` (ADR 0012). Check `core.E001/E002/E003` exige declaração e campos
  compatíveis, inclusive em proxies/unmanaged. Ver
  [escopos de persistência](docs/architecture/model-scopes.md).
- `Plan`, `Contract` e `Organization` ficam em `apps/contracts` (etapa 2.1 concluída).
  apps/administration contém somente API do superadmin, sem models próprios;
  views/serializers/filters/URLs de planos e contratos ficam nele (ADR 0033).
  Plan guarda nome e quatro quotas opcionais, sem enforcement; modalidade pertence
  à implantação, sem campo no model (ADR 0014). Licenças e retenção ficam no Contract.
  Contrato tem constraints de vigência, licenças positivas e retenção máxima 365.
  Ver [domínio de contratos](../docs/domain/contracts.md).
  FKs de contexto e plano usam `PROTECT` (ADR 0013). Contract.plan é opcional
  (null/blank), sem quotas de plano quando ausente; licenças continuam no contrato.
- Ao personalizar `Meta`, herdar a do tipo escolhido e preservar índices herdados.
- Os tipos de escopo herdam `apps.core.models.BaseModel`: UUID v7 externo,
  datas, autoria e soft delete (ADR 0007). Tabelas `dsc_` são geradas automaticamente.
- `objects` oculta excluídos, mas mantém inativos; `all_objects` inclui excluídos. **Os dois
  filtram pelo contexto de tenant** (`apps/core/tenancy.py`) e levantam `TenantContextMissing`
  sem contexto. Acesso global só por `Model.objects.unscoped()` ou `system_context()`/`@system_scope`
  (services de integridade, comandos, autenticação). `_base_objects` é só do Django (FKs).
  Em recursos de tenant, não declarar queryset com manager dependente de contexto
  no nível da classe: use `TenantScopedViewMixin`
  com `model` e `ScopedModelSerializer` (FKs por `public_id`, sem `id`/`contract`/`organization`).
  No `User`, `is_active` mantém a semântica de autenticação do Django.
- Código em inglês (models, campos, funções, parâmetros, queries e constantes); rótulos,
  mensagens ao usuário e o comentário de nome do SQL (`-- RELATORIO X`) em português; respostas ao usuário em PT-BR.
- Módulos: `middleware.py` só com classes de middleware; auxiliares em `utils.py` do app;
  constantes literais em `constants.py` do app; querysets/managers em `managers.py`;
  SQL à mão (só se o ORM não resolver) em `queries/<nome>.py`: 1ª linha `-- NOME` em PT-BR, parâmetros
  `contract`/`organization` (id interno) no CTE ou tabela temporária `parametros`, um único `execute`,
  executado só pelo selector com `@tenant_params` + `fetch_all`, com teste de isolamento próprio ([formato](docs/standards/django-style.md));
  regras de CRUD no validate do serializer; operações próprias em services/selectors
  ([estilo](docs/standards/django-style.md), ADR 0030).
- `AccessLog` registra login com sucesso/falha e refresh com sucesso (ADR 0019),
  marcado nas views e persistido após sua execução, fora de ATOMIC_REQUESTS.
  Leituras/navegação comuns não gravam AccessLog. Registro de autenticação não
  substitui AuditEvent. Só inserção, leitura em system_context()/unscoped().
- Performance é requisito global: analisar frequência, queries, escritas, locks,
  CPU, memória, tráfego e concorrência antes de entregar. Evitar trabalho por item,
  escritas incidentais em leituras e locks amplos sem justificativa. Testar queries
  e operações com volumes distintos; medir carga quando houver risco relevante.
  Custo constante não basta para afirmar que um fluxo é eficiente.
- Seleções usam `LookupOptionsMixin` junto ao mixin de escopo (ADR 0011): declarar
  `options_label_field`, `options_search_fields` e `required_permission['options']`
  com a mesma permissão `:view` do recurso. Rótulo SQL, sem `__str__`/serializer
  completo; relações somente singulares. Preservar inativos em `get_queryset()`.
  Contrato e cuidados de publicação em [options](../docs/api/options.md).
- Administração de planos/contratos em `apps/administration`, sob `/api/v1/admin/`,
  com `SuperadminPermission`, sem organização (ADR 0020). Listas limitadas e
  campos de filtro/ordenação declarados; opções usam a mesma permissão administrativa.
  Organizações não ficam na área administrativa (ADR 0037): gestão só na área do cliente
  (Bloco 7), com `organization:view/create/update/delete` não reservadas (create só CONTRACT).
  Não recriar rota de organizações sob `/admin/`; suporte do superadmin fica para depois.
  `GET /api/v1/me/permissions/` (rbac, 7.2) só reflete para a interface; não usar como autorização.
  CRUD em `/api/v1/organizations/` (contracts, 7.3) com `ContractWidePermission`: código em qualquer
  escopo vale no contrato inteiro, mas o header e o acesso à organização ativa continuam obrigatórios.
  Escritas travam a linha do contrato (nome único 422, última ativa e em uso 409).
- Usuários do contrato (8.1): `/api/v1/users/` (`UserViewSet`, `model = User`, `permission_resource =
  'user'`, reset em `user:manage`), reservados ao admin do contrato. `ContractUserSerializer` cria via
  `save_user` com senha temporária devolvida uma vez; `username` único validado em `all_objects.unscoped()`.
  Rotas de auth seguem em `/api/v1/auth/` (mesmo `users/urls.py`). FilterSet declara `default_ordering`.
  Escritas pelos serializers, atomic/lock do registro e AuditEvent; redução de licenças
  não pode ficar abaixo dos usuários não excluídos, contando inativos. Não aplicar
  quotas, cobrança, cascata ou expurgo. Ver [API administrativa](../docs/api/admin-contracts.md).
  `BaseAdminModelViewSet` compõe hooks padrão e mixins; views declaram
  `queryset = Contract.objects.unscoped().select_related('plan')`, além de schema/filtros. Manter a ordem:
  queryset, serializer_class, filterset_class e depois as demais propriedades.
  Selectors ficam para consultas com lógica própria; administração usa unscoped explícito, queryset lazy
  construído sem SQL e get_queryset padrão do DRF clona por requisição (ADR 0028).
  Managers com tenant continuam exigindo contexto; não chamar esses selectors na
  declaração da view. Exclusão é herdada via SerializerDeleteMixin e
  BaseModelSerializer.delete(); sem registro de services ou delete_service por recurso.
  BaseAdminModelSerializer revalida o ator no banco antes de escrever (ADR 0030).
  Bases compartilhadas em `core/views.py`, mixins em `core/mixins.py`, paginação
  em `core/pagination.py` e permissão administrativa em `core/permissions.py`.
  Bases usam django-filter: BaseFilterSet/backend em `core/filters.py`, FilterSets
  do domínio em `apps/<app>/filters.py` e `filterset_class` na view (ADR 0022).
  Declarar filtros explicitamente para não consultar managers na importação.
  Schemas: schema_columns/schema_filters contêm nomes de campos; labels vêm do
  verbose_name e tipos (colunas e filtros) do model, só semânticos: nunca máscara/formato de
  exibição no schema (o frontend formata pelo locale). schema_column_overrides/schema_filter_overrides
  sobrescrevem apenas os campos desejados. Ordenação vem do OrderingFilter, sem
  ordering_fields na view. Usar SchemaRouter: options de relações são resolvidos
  por model/basename registrado e reverse, sem montar URLs por convenção (ADR 0026).
- Model novo → fábrica em `apps/core/tests/test_isolation.py` (`FACTORIES` ou `SHARED`) no mesmo
  commit; sem ela a suíte falha (camada F).
- Autoria explícita: `save(actor=user)` e `delete(actor=user)`; operações de sistema
  sem usuário deixam autoria nula. Em `update`/operações bulk, preencher auditoria
  explicitamente. Soft delete não faz cascata; relações são tratadas no service.
- `User.contract` obrigatório para usuário comum e nulo para superadmin, por
  constraint. Escritas de usuários usam `apps.users.services.save_user`; o manager
  delega create_user/create_superuser e versões async. Licenças contam todos os
  não excluídos, inclusive inativos (ADR 0015); não usar save/bulk/update diretos
  para consumir vagas ou restaurar. Serviço valida contrato e serializa por lock;
  autorização dos futuros endpoints continua obrigatória.
- Nunca logar dados pessoais em claro.
- Registry RBAC em `apps/core/permission_registry.py`, somente Python puro:
  fonte dos códigos/escopos/reservadas, sem auth_permission ou acesso ao banco.
  `manage` não implica outras ações. Ver
  [registry](docs/architecture/permission-registry.md). Não aceitar código
  desconhecido; essential_profile é flag interno após verificar o perfil essencial,
  nunca recebido do payload.
- Novo campo pessoal → finalidade e base legal definidas (skill `lgpd`). Toda funcionalidade passa pela skill `conformidade-legal`.
- Gestão de acesso em `apps/rbac` (ADR 0016): Profile, ProfilePermission, Assignment
  e AssignmentExclusion. Escritas usam services, atomic, lock de configuração e
  validações de contexto/registry; acesso direto ao ORM não substitui essas regras.
  Atualmente somente superadmin ativo pode escrever. Perfil essencial (`contract_admin`) é
  criado pela migration rbac.0002 e não é editável. O contrato nunca fica sem administrador
  ativo (`LastContractAdmin`, 409), nem por ação do superadmin: excluir usuário só via
  `apps.users.services.delete_user`; `user.delete()` e `User.objects...delete()` delegam a ele
  (o lote de usuários exclui um a um, com N queries, de propósito). `User.save()` delega a
  `save_user` (só argumentos nomeados); `update_fields` sem campo de regra grava direto. Ver
  [domínio RBAC](../docs/domain/rbac.md). Todo service de RBAC e as mudanças de conta de
  superadmin gravam evento em `apps/audit` (append-only, ADR 0017); nunca alterar/excluir eventos. Transferir User de contrato exige remover
  suas atribuições não excluídas primeiro. Não publicar endpoints antes das proteções.
- Autorização da API nega por padrão (`IsAuthenticated` + `RequiredPermission`): toda view
  declara `required_permission` (código do registry ou dicionário por action/método) ou
  `permission_classes = [AllowAuthenticated]`. Em CRUD sobre as bases do core, declarar só
  `permission_resource = '<recurso>'` (ResourcePermissionMixin gera view/create/update/delete);
  `required_permission` (dict) sobrescreve ações citadas e declara actions customizadas, que
  nunca recebem código automático. Nunca deduzir o recurso do nome do model (ADR 0021).
  `options` usa as mesmas `permission_classes` da view; a regra do `:view` fica nas classes.
  Recurso de tenant nas bases: declarar `model = X` (queryset com escopo montado na requisição e
  lock em update/destroy pela base); nunca `queryset` de classe com manager com escopo nem os dois. Contexto pelo header `X-Organization-Id`
  (`apps/core/context.py`, preenche `request.organization`); superadmin também precisa do
  header em endpoint de negócio (400 sem ele). Contrato indisponível → 403 na autenticação. Cálculo puro em
  `apps/rbac/evaluation.py`; leitura em `selectors.user_grants`, uma vez por requisição.

## Antes de entregar

```bash
pytest
ruff check . && ruff format --check .
python manage.py makemigrations --check --dry-run
python manage.py check --deploy --settings=config.settings.production
```
