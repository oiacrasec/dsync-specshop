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
| 4 | A porta de origem do registro de acesso depende do proxy reverso: resolvido na 4.1 com headers configuráveis (decisão 20) |
| 5 | Por aprovação do usuário, executar **1.1 antes de 0.3**, para que o JWT use o `public_id` do usuário sem expor o ID interno (ADR 0007). Ordem: 0.1 → 0.2 → 1.1 → 0.3 → 1.2 → demais etapas |
| 6 | Login: usuário aprovou contar somente falhas por conta, limite inicial 5/min e bloqueio temporário; cache compartilhado/atômico, controles de borda, recuperação e MFA administrativa devem ser tratados antes de produção |
| 7 | Usuário aprovou `apps/contracts` para `Plan`, `Contract` e `Organization`, com `PROTECT` nas FKs de contexto (ADR 0013) |
| 8 | Modalidade pertence à implantação; não será campo de `Plan` ou `Contract` (ADR 0014) |
| 9 | Usuário aprovou preparar quatro quotas opcionais em Plan (organizações, armazenamento, integrações e operações mensais), somente schema nesta etapa, sem contadores ou enforcement |
| 10 | Licenças contam usuários ativos e inativos não excluídos; soft delete libera vaga e restauração exige disponibilidade (ADR 0015) |
| 11 | Usuário decidiu antecipar o bloco RBAC antes do contexto, pois 2.3 depende das atribuições de 3.2. Após 2.2: 3.1 → 3.2 → demais etapas RBAC → 2.3 → 2.4 → 2.5, validando e confirmando cada etapa |
| 12 | Usuário aprovou apps/rbac para perfis, permissões e atribuições; registry compartilhado permanece em core (ADR 0016) |
| 13 | Pedaço da 2.3 antecipado na 3.3 (aprovado): ler e validar `X-Organization-Id` (400) e resolver a organização do contrato do usuário (403), preenchendo `request.organization`. Contrato ativo a cada requisição e superadmin com organização opcional continuam na 2.3. O acesso total dinâmico do perfil essencial já vale no cálculo; a 3.4 fica com a fixture e a proteção do último admin |
| 14 | 3.4 (aprovado): perfil essencial criado por migration de dados idempotente (não fixture manual); proteção do último admin cobre atribuição e também desativação/exclusão do usuário; vale inclusive para o superadmin; `User.delete()` e o lote de usuários delegam a `delete_user`; `User.save()` delega a `save_user` (aprovados) |
| 15 | 3.5 (aprovado): publica só `GET /api/v1/me/organizations/` (filtrado pelo usuário); busca do superadmin fica em selectors, endpoint na área admin (5.2). Lista só organizações ativas e não excluídas, ordem por nome |
| 16 | Ordem ajustada (aprovado): 2.3 antes da 3.6, porque auditar a entrada do superadmin exige o contexto. Nova ordem: 2.3 → 3.6 → 2.4 → 2.5 → 4.1 → bloco 5 |
| 17 | 2.3 (aprovado): login com senha certa e contrato indisponível → 403 `contract-inactive`; access/refresh negados enquanto indisponível, sem revogar todos os refresh; superadmin entra em organização de contrato vencido/inativo (excluído → 403); superadmin sem header em endpoint de negócio → 400. Usuário confirmou o 403 para contrato excluído |
| 18 | 3.6 (aprovado): `apps/audit` + `AuditEvent` (ADR 0017); entrada do superadmin 1x por superadmin + organização + access token; "alterações de superadmin" = contas de superadmin; eventos imutáveis, com before/after só dos campos de permissão |
| 19 | 2.4 (aprovado): `all_objects` também filtra pelo contexto (manager base do Django vira `_base_objects`, sem filtro); `User` e `Contract` entram no escopo (ADR 0012), autenticação usa `.unscoped()`; código fora de requisição usa `system_context()`/`@system_scope` e os testes um contexto de sistema automático; query sem contexto levanta `TenantContextMissing` |
| 20 | 4.1 (aprovado): IP/porta reais por headers do proxy configuráveis (`check --deploy` avisa); toda requisição à `/api/` com só os campos da lei + `request_id`; `AccessLog` como exceção ao escopo (ADR 0018); retenção de 6 meses declarada, expurgo + `LegalHold` na entrega do ADR 0007 antes de produção; gravação por middleware após a resposta |
| 21 | Revisão da 4.1 aprovada: seguir cobertura implementada no Spatial (login sucesso/falha e refresh sucesso), sem AccessLog por requisição comum; preservar AuditEvent e registros históricos. ADR 0019 substitui a cobertura de 0018, sem afirmar suficiência jurídica de apenas login |
| 22 | Premissa permanente do usuário: performance forte em todo o projeto, não só AccessLog; avaliar frequência, queries, escritas, locks, CPU, memória, tráfego e concorrência, com medição conforme o risco antes de entregar |
| 23 | 5.2: usuário aprovou impedir redução de licenças abaixo dos usuários não excluídos, contando inativos; usar lock do contrato compartilhado com cadastro de usuários (ADR 0020) |
| 24 | Revisão 5.2: usuário pediu composição como Spatial, com bases em core/views, mixins/pagination/permissions compartilhados e recursos declarados nos apps (ADR 0021); preservar cabeçalho compacto/alinhado ajustado manualmente |
| 25 | Usuário determinou usar django-filter como Spatial: BaseFilterSet/backend DRF no core e filterset_class/FilterSets explícitos nos apps, preservando contrato/escopo (ADR 0022) |
| 26 | Usuário determinou delegar gravação por create/update dos serializers ao service, usando serializer.save() padrão nas views; exclusão permanece no mixin (ADR 0023) |
| 27 | Usuário determinou classe base de services no core e exclusão comum herdada, sem delete_service repetido nas views; classes de domínio e registro explícito por model (ADR 0024) |
| 28 | Usuário aprovou service_class nos serializers; ServiceModelSerializer centraliza create/update chamando save_instance, sem staticmethod nos recursos (ADR 0025) |
| 29 | Usuário determinou schema de colunas/filtros por campos do model, label/tipo/URL automáticos com sobrescrita por campo; ordenação usa OrderingFilter sem duplicação na view (ADR 0026) |
| 30 | Usuário aprovou classes de selectors/base no core e selector_class nas views; determinou ordem selector_class, serializer_class, filterset_class e demais configurações (ADR 0027) |
| 31 | Usuário revisou a preferência: queryset diretamente nas views para consultas simples, sem função de selector só para isso; selectors para lógica própria; ordem queryset/serializer_class/filterset_class/demais; ADR 0028 substitui 0027 |
| 32 | Usuário aprovou adaptar general_search_fields do Spatial ao Core: busca única OR, controles individuais AND e schema separado, com lookups textuais explícitos e sem conversões de tipos (ADR 0029) |
| 33 | Usuário determinou verbose_name explícito nos rótulos dos campos, mesmo quando Django aceita o argumento posicional; padrão de models atualizado, sem alteração de labels/migrations |
| 34 | Usuário aprovou CRUD padrão do DRF com autoria/auditoria no BaseModelSerializer, regras no validate() e hooks extras antes do super; dispensou full_clean genérico e model_validation_fields/exclude. Validação/gravação na mesma transação com lock anterior; ADR 0030 substitui 0023–0025 |
| 35 | Usuário determinou helpers core/responses.py para actions customizadas com try/except como Spatial; adaptar ao handler RFC 9457 existente, preservando rollback, headers e logging seguro (ADR 0031) |
| 36 | Usuário determinou OrganizationViewSet independente, sem action aninhada no contrato, respeitando organizações acessíveis; serializer chamado OrganizationSerializer. Escopo de leitura preservado, CRUD continua 5.4 (ADR 0032) |
| 37 | Prioridade (usuário): área administrativa e frontend antes do restante do bloco 5. `contracts` continua o app do **domínio** (Plan, Contract, Organization, usado por todos); novo app `administration` só para a API do superadmin (views, serializers, services, URLs `/admin/`), sem models próprios |
| 38 | Primeiro acesso (usuário, referência Spatial/GIS): provisionamento cria a **1ª organização + admin do contrato**; só se o contrato ainda não tem usuários; bloqueio até trocar a senha **no backend, em toda a API** (exceto trocar senha, refresh e logout); senha temporária devolvida **uma vez** na resposta (no-store, nunca em log/auditoria); escopo inclui listar admins e resetar senha; login devolve resumo do usuário. Superadmin fora do fluxo. Futuro: envio assíncrono por tabela de eventos + Celery/Dramatiq |
| 39 | Frontend (usuário): **copiar o datasync-gis inteiro** (template Poseidon/PrimeTek, licença confirmada pelo usuário) para `frontend/` e desabilitar telas fora do escopo **comentando** rotas e menu, com a marca `// DESABILITADO: fora do escopo atual` |
| 40 | Respostas do bloco 6 (usuário): `Contract.plan` passa a ser **opcional** (nulo = sem plano/sem limites; PROTECT mantido; migration e doc de domínio na 6.3); formulário de contrato lista planos (options), campo opcional; tela de cadastro de planos fica para o futuro. Seleção de organização pronta na 6.5 para usuários comuns (superadmin não tem organização). Reset de senha do admin revoga seus refresh tokens (6.7) |
| 41 | Após avaliar cookies HttpOnly, usuário decidiu manter JWT em **localStorage**; organização ativa também compartilhada. Trocar organização em uma aba sincroniza e recarrega o conteúdo de todas; refresh/logout coordenados entre abas por Web Locks, sem polling (ADR 0035) |
| 42 | 6.6 (usuário): `POST /api/v1/admin/contracts/{public_id}/provision/`; admin com dados mínimos (`username` + `name`); só contrato **disponível** e sem usuários **e** sem organizações não excluídos (inclusive inativos), senão 409 `contract-not-provisionable` |
| 43 | 6.7 (usuário): admins do contrato = atribuição essencial ativa (perfil ativo), usuário ativo **ou inativo**, não excluído; rotas `GET …/contracts/{public_id}/admins/` (paginada) e `POST …/admins/{user_public_id}/reset-password/`. Refresh passa a travar usuário → token, a mesma ordem do reset |
| 44 | 6.8 (usuário): formulário de contrato inclui a retenção pós-contrato (`post_termination_retention_days`, 0–365, padrão 90) além do plano opcional |

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
| 1.2 | Os 4 tipos de escopo + system check "escopo declarado" (com as exceções do ADR 0012) | 0006 §1.1, 0013 | ✅ |

## Bloco 2 — Contratos e contexto

| # | Etapa | ADR | Status |
|---|---|---|---|
| 2.1 | `Plan`, `Contract` (vigência, licenças, retenção pós-contrato) e `Organization` | 0006, 0007, 0013, 0014 | ✅ |
| 2.2 | Campo `contract` no `User` + regras (licenças, superadmin sem contrato) | 0006 §2, 0015 | ✅ |
| 2.3 | Resolução do contexto (`X-Organization-Id`): 400/403, contrato ativo, superadmin opcional | 0006 §3 | ✅ |
| 2.4 | Proteção em camadas B a E: manager fail closed, `contextvar`, mixin de view, FKs do serializer | 0006 §1.3 | ✅ |
| 2.5 | Testes de isolamento genéricos (camada F) | 0006 §1.3 | ✅ |

## Bloco 3 — RBAC

| # | Etapa | ADR | Status |
|---|---|---|---|
| 3.1 | Registry de permissões (Python puro): escopos permitidos e reservadas | 0009 §1, §3.1 | ✅ |
| 3.2 | `Profile`, permissões do perfil e atribuições (com exceções de organização) | 0009 §2, §3, 0016 | ✅ |
| 3.3 | Cálculo da permissão efetiva + permissão do DRF que **nega por padrão** | 0009 §4 | ✅ |
| 3.4 | Perfil essencial "Administrador do contrato" (fixture, acesso total dinâmico) | 0009 §5 | ✅ |
| 3.5 | Lista de organizações acessíveis + busca contrato → organização do superadmin | 0009 §6 | ✅ |
| 3.6 | Auditoria das mudanças de permissão e das entradas do superadmin em organização | 0009 §7 | ✅ |

## Bloco 4 — Registro de acesso

| # | Etapa | ADR | Status |
|---|---|---|---|
| 4.1 | `AccessLog` seletivo de autenticação + middleware (IP, porta, data UTC, usuário, contrato, organização) + retenção declarada de 6 meses | 0006 §6, 0018, 0019, skill `marco-civil` | ✅ |

## Bloco 5 — Endpoints

| # | Etapa | ADR | Status |
|---|---|---|---|
| 5.1 | Mixin `options` | 0011 | ✅ |
| 5.2 | Admin: planos e contratos (`/api/v1/admin/…`) | 0008, 0020 | ✅ |
| 5.3 | Admin: usuários, superadmins e admins de contrato | 0010 | ⬜ |
| 5.4 | Área comum (admin do contrato): organizações, usuários, perfis e atribuições | 0009 §3.1 | ⬜ |
| 5.5 | OpenAPI (`drf-spectacular`), navegável só para autenticados | 0004 | ⬜ |

## Bloco 6 — Área administrativa e frontend (prioridade, decisões 37 a 39)

Ordem proposta: 6.1 → 6.2 → 6.2a → 6.3 → 6.4 → 6.5 → 6.6 → 6.7 → 6.8. Cada etapa fecha com
`validar-etapa`; as de frontend usam lint/build/testes do próprio `frontend/`.

| # | Etapa | Lado | ADR | Status |
|---|---|---|---|---|
| 6.1 | Copiar o datasync-gis para `frontend/` (sem `.git`, `node_modules`, `dist`, `.angular`; `environment*.ts` revisados), com `AGENTS.md`, README e `Dockerfile` próprios; conferir versão LTS do Angular/PrimeNG; build e lint passando | frontend | 0001, 0003 | ✅ (lint pendente, ver abaixo) |
| 6.2 | Desabilitar telas fora do escopo comentando rotas e menu (`DESABILITADO: fora do escopo atual`): ficam login, primeiro acesso, seleção de organização, administração de contratos, home KPI fictícia (pedido do usuário) e páginas de erro | frontend | — | ✅ |
| 6.2a | Qualidade herdada do GIS: ESLint funcional (`angular-eslint` 21 + `typescript-eslint` 8, `npm run lint` zerado no código ativo; telas desabilitadas ignoradas até reativar), Prettier aplicado (`npm run format:check`), `inject()`, seletores `app-*`, CSS de preloading inline e temas Lara/Nora sob demanda (bundle inicial 1,46 → 1,25 MB; ~257 KB gzip) | frontend | — | ✅ |
| 6.3 | App `administration`: mover a API admin de planos e contratos de `contracts` (views, serializers, filters, URLs), sem mudar o contrato da API; `Contract.plan` opcional (decisão 40) | backend | 0033 | ✅ |
| 6.4 | Primeiro acesso: `User.must_change_password`; login devolve resumo do usuário; bloqueio global no backend até trocar; `POST` de troca de senha (atual + nova + confirmação, validadores do Django, diferente da atual) | backend | 0010, 0034 | ✅ |
| 6.5 | Frontend: camada de API do core (login/refresh/logout JWT, `X-Organization-Id`, erros RFC 9457, `public_id`) + telas de login, primeiro acesso e seleção de organização; JWT/contexto localStorage, sincronização/recarregamento entre abas | frontend | 0003, 0004, 0035 | ✅ |
| 6.6 | Provisionamento do contrato: cria 1ª organização + admin (perfil essencial) com senha temporária; só contrato sem usuários; licença conferida; auditado sem a senha | backend | 0009 §5, 0010 | ✅ |
| 6.7 | Admins do contrato: listar e resetar senha (nova temporária + `must_change_password`), auditado | backend | 0010 | ✅ |
| 6.8 | Frontend: administração de contratos (lista, formulário, provisionamento, admins e reset), adaptada à API do core | frontend | 0008 | ✅ |

Pendências do bloco 6: respondidas (decisão 40).

Validação da 6.5: 44 testes ChromeHeadless, incluindo evento storage real e refresh
entre serviços independentes; lint, formato e build. Validador backend preservado.
30 pedidos cotidianos sem storage/refresh; bundle ~1,25 MB (~257 KB estimados).
Sem auditoria WCAG completa, E2E com duas abas/banco ou ensaio de capacidade sob carga.
ETag global herdado desabilitado por cache apenas por URL; resumo de permissões GIS
desabilitado, endpoint inexistente no Core. Contratos adaptados na 6.8.

Achados da 6.1 (herdados do datasync-gis, a decidir com o usuário):

| Achado | Situação |
|---|---|
| Lint | resolvido na 6.2a. Antes: `eslint.config.js` estava no formato antigo (eslintrc) com nome de flat config e sem parser TypeScript: o ESLint não analisa nenhum arquivo, nem no GIS |
| Formatação | resolvido na 6.2a. Antes: Prettier apontava 65 arquivos fora do padrão (além do CRLF da cópia, normalizado pelo git) |
| Bundle | resolvido na 6.2a até 1,25 MB (~257 KB gzip); o restante é a base Angular/RxJS/PrimeNG/estilos. Orçamento de 1 MB ainda avisa: ajuste depende do usuário |

A 5.3 (admin de usuários/superadmins) e a 5.4 (área comum) continuam pendentes; o que a
6.6/6.7 cobrir sai do escopo delas. O rascunho de organizações (ADR 0032, Proposto) é
revisado depois do bloco 6.
