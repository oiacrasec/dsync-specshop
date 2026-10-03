# Backend — estado após a etapa 0.1

Fontes: `backend/config/settings/base.py`, `backend/config/settings/production.py`,
`backend/config/urls.py`, `backend/AGENTS.md`, ADR 0008 e plano da Entrega 1.

- Django Admin, sessões e messages removidos, incluindo seus middlewares,
  context processors, cookies de sessão configurados e `apps/users/admin.py`.
- `django.contrib.auth` e `contenttypes` mantidos: usuário, senhas e management
  command `createsuperuser` continuam disponíveis.
- Nenhuma rota HTTP publicada; `/admin/` e `/admin/login/` retornam 404.
- DRF mantém `IsAuthenticated` global; lista de autenticadores vazia até o JWT na
  etapa 0.3. Não adicionar autenticação por sessão.
- `TimeStampedModel` ainda existe; `BaseModel` e a nova migration do usuário são da
  etapa 1.1. Não executar `migrate` no banco de desenvolvimento antes dela.
- Próxima etapa: 0.2, prefixo `/api/v1/`, handler RFC 9457 e `request_id`.
