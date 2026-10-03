# API — estado após a etapa 0.2

O prefixo oficial é `/api/v1/`. O arquivo `backend/config/api/v1.py` reúne as rotas
da versão; endpoints serão acrescentados conforme o plano da Entrega 1.
Rotas desconhecidas sob `/api/` retornam 404 no [formato RFC 9457](errors.md),
inclusive em desenvolvimento. O fallback fica depois das versões em `config/urls.py`.

Campos JSON usam snake_case; identificadores externos serão `public_id` UUID v7.
Autenticação JWT entra na etapa 0.3. Até lá, `IsAuthenticated` permanece global,
com lista de autenticadores vazia. Nenhum endpoint de negócio está publicado.

Todas as respostas do backend recebem `X-Request-Id`, gerado pelo servidor,
para correlação com os logs. Em erros da API, o mesmo valor aparece no corpo.
O middleware registra apenas respostas 4xx/5xx, sem log de conclusão para sucessos
ou redirecionamentos. Observabilidade mais ampla será tratada futuramente.

Fonte: ADR 0004 e plano `docs/plans/entrega-1-fundacao-tenancy-rbac.md`.
