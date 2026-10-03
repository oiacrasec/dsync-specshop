# Backend — estado após a etapa 0.3

Fontes: `backend/config/settings/base.py`, `backend/config/settings/production.py`,
`backend/config/urls.py`, `backend/config/api/v1.py`, `backend/apps/core/exceptions.py`,
`backend/apps/core/middleware.py`, `backend/apps/core/models.py`,
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
- Próxima etapa: 1.2, tipos de escopo e system check de escopo declarado.
  A etapa 1.1 foi antecipada com aprovação do usuário para usar UUID nos tokens.
- Estilo compacto dos models definido pelo usuário: documentação canônica em
  `backend/docs/standards/django-style.md`, com exemplo em
  `backend/docs/examples/model.md`. AGENTS e README apontam para essas fontes.
  `models.py` mantém formatação manual, mas respeita o limite de 120 caracteres
  confirmado pelo usuário, com E501 e demais regras de lint ativas.
