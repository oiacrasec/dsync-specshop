# API — visão geral

O prefixo oficial é `/api/v1/`. O arquivo `backend/config/api/v1.py` reúne as rotas
da versão; endpoints serão acrescentados conforme o plano da Entrega 1.
Rotas desconhecidas sob `/api/` retornam 404 no [formato RFC 9457](errors.md),
inclusive em desenvolvimento. O fallback fica depois das versões em `config/urls.py`.

Campos JSON usam snake_case; identificadores externos são `public_id` UUID v7.
Autenticação JWT e `IsAuthenticated` são globais.

| Prefixo | Conteúdo | Contrato |
|---|---|---|
| `/api/v1/auth/` | login, refresh, logout e troca de senha | [autenticação](authentication.md) |
| `/api/v1/me/organizations/` | organizações acessíveis do usuário | [organizações](organizations.md) |
| `/api/v1/admin/plans/`, `/api/v1/admin/contracts/` | administração do superadmin | [administração](admin-contracts.md) |
| `/api/v1/admin/organizations/` | organizações acessíveis (ADR 0032, Proposto) | [organizações](organizations.md) |

Seleções seguem o contrato de [options](options.md). Nenhum endpoint de negócio
com contexto de organização está publicado.

Todas as respostas do backend recebem `X-Request-Id`, gerado pelo servidor,
para correlação com os logs. Em erros da API, o mesmo valor aparece no corpo.
O middleware registra apenas respostas 4xx/5xx, sem log de conclusão para sucessos
ou redirecionamentos. Observabilidade mais ampla será tratada futuramente.

Fonte: ADR 0004 e plano `docs/plans/entrega-1-fundacao-tenancy-rbac.md`.
