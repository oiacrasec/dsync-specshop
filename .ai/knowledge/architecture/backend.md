# Backend — estado após a etapa 0.2

Fontes: `backend/config/settings/base.py`, `backend/config/settings/production.py`,
`backend/config/urls.py`, `backend/config/api/v1.py`, `backend/apps/core/exceptions.py`,
`backend/apps/core/middleware.py`, `backend/AGENTS.md`, ADRs 0004/0008 e plano da Entrega 1.

- Django Admin, sessões e messages removidos, incluindo seus middlewares,
  context processors, cookies de sessão configurados e `apps/users/admin.py`.
- `django.contrib.auth` e `contenttypes` mantidos: usuário, senhas e management
  command `createsuperuser` continuam disponíveis.
- Estrutura de rotas em `/api/v1/`, sem endpoints de negócio publicados; `/admin/`
  e `/admin/login/` retornam 404. Fallback para `/api/` retorna Problem Details.
- DRF mantém `IsAuthenticated` global; lista de autenticadores vazia até o JWT na
  etapa 0.3. Não adicionar autenticação por sessão.
- `TimeStampedModel` ainda existe; `BaseModel` e a nova migration do usuário são da
  etapa 1.1. Não executar `migrate` no banco de desenvolvimento antes dela.
- Handler global converte exceções DRF, Django e de domínio em RFC 9457, inclusive
  erros 500, sem detalhes internos no corpo. Validação retorna 422; sintaxe, 400;
  conflitos de domínio, 409. Catálogo: `docs/api/errors.md` e `docs/api/errors/`.
- `RequestIdMiddleware` é o primeiro middleware, inclusive em produção, antes de
  SecurityMiddleware e WhiteNoise. Gera UUID v7, ignora IDs enviados pelo cliente,
  devolve `X-Request-Id` e restaura o contextvar após a requisição.
- Logs usam o mesmo ID, inclusive logs do Django com request fora do contexto ativo.
  O middleware registra só erros: 4xx em WARNING e 5xx em ERROR; não registra
  conclusão de respostas 2xx/3xx. Observabilidade mais ampla fica para depois,
  conforme decisão do usuário.
  Logs fora de requisição usam `-`; 500 registra classe/frames, sem mensagem da
  exceção, conteúdo de requisição ou variáveis locais.
- Exceções tratadas preservam rollback de `ATOMIC_REQUESTS` e headers de protocolo.
- Próxima etapa: 0.3, login/refresh/logout JWT com rotação e blacklist.
