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
| 45 | Revisão do ADR 0032 (usuário): organizações só na área do cliente, menu para o admin do contrato e comuns com permissão; `/admin/organizations/` removida (ADR 0037) |
| 46 | Permissões de organização não reservadas: o cliente decide quem vê e gerencia (`organization:view` nova; `create` só CONTRACT, revisto na 62). Usuários, perfis e atribuições seguem reservados |
| 47 | Quem tem `organization:view` em qualquer escopo lista todas as organizações do contrato |
| 48 | Resumo de permissões para a interface: `GET /api/v1/me/permissions/` com `X-Organization-Id` |
| 49 | Suporte do superadmin dentro de organização (escolha contrato → organização) fica para depois |
| 50 | Editar/excluir organizações: código concedido em qualquer escopo vale para qualquer organização do contrato, como a visão |
| 51 | Excluir organização que é escopo de atribuição ou alvo de exceção → 409 `organization-in-use` |
| 52 | O contrato mantém pelo menos uma organização ativa → 409 `last-active-organization` |
| 53 | Nome de organização único no contrato, sem diferenciar maiúsculas → 422 |
| 54 | 5.4 (usuário): gestão de usuários, perfis e atribuições continua reservada ao admin do contrato (ADR 0009 §3.1) |
| 55 | Usuário cadastrado pelo admin do contrato: `username` + nome (LGPD, necessidade) |
| 56 | Senha inicial temporária gerada no servidor, exibida uma vez, troca obrigatória |
| 57 | 5.4 em etapas: 8.1 usuários → 8.2 perfis → 8.3 permissões do usuário (layout da aba de permissões do GIS) |
| 58 | 8.3 (usuário): aplicar perfil **vincula** a atribuição (ADR 0009 §2), não copia como o GIS; caixas livres viram avulsas |
| 59 | 8.3: item "Todas as organizações" edita o escopo CONTRACT; cada organização mostra o herdado com a exceção "não vale nesta organização" |
| 60 | 8.3: a aba grava num Salvar único, `PUT /users/{id}/access/` substitui o conjunto numa transação |
| 61 | Formulários: campos na aba **Principal** (`p-tabs`), como o de contratos; seções extras em outras abas |
| 62 | Revisão da 46 (usuário): `organization:create` em qualquer escopo; visão por contrato, como view/update/delete (ADR 0037 §2) |
| 63 | Aba Permissões sem a caixa "Administrador do contrato": o perfil essencial é aplicado pelo seletor de perfis, só em "Todas as organizações" (escopo CONTRACT, sem exceções); continua visível, só leitura, na tela de Perfis |
| 64 | Perfil vinculado com customização livre: desmarcar o que veio do perfil grava exceção de permissão (por atribuição, opcionalmente por organização); sem cadeados nem bloco de herdados (ADR 0038) |
| 65 | Aparência (tela de Configurações) guardada no usuário, no backend (`/me/preferences/`); login com a aparência padrão |
| 66 | Configurações: cor principal, estilo (Aura/Lara/Nora), modo claro/escuro e tipo de menu, em português; painel "Settings" removido do login e das demais telas |
| 67 | 5.5: Swagger UI dentro do frontend (`/documentacoes/api`, menu do avatar → Documentações → API), com o schema buscado pela sessão JWT; o backend só serve `/api/v1/schema/` |
| 68 | 5.5: qualquer autenticado vê a documentação da área do cliente; `/admin/` só o superadmin (ADR 0004) |
| 69 | Perfil (Bloco 9): foto, nome editável, fuso horário, troca de senha, sessões, 2FA e "meu acesso"; aparência continua em Configurações |
| 70 | Mídia configurável por `.env`: `DJANGO_MEDIA_STORAGE=filesystem` ou `s3` (compatível com MinIO por endpoint) |
| 71 | Foto entregue por URL temporária assinada nos dois modos; bucket e pasta privados |
| 72 | Sem e-mail no perfil por enquanto (decisão 55 mantida); entra quando houver finalidade |
| 73 | 2FA por app autenticador (TOTP, RFC 6238); WebAuthn fica para depois |
| 74 | 2FA opcional para todos, inclusive superadmin (risco do ADR 0010 continua aceito) |
| 75 | Recuperação do 2FA: 10 códigos reserva de uso único + reset por admin (contrato: admin do contrato; admins e superadmins: superadmin), auditado |
| 76 | Migração de mídia entre filesystem e S3 pelo comando `transfer_media` (incremental, mantém os nomes, não apaga a origem); o banco não muda |
| 77 | Perfil é um formulário em `/perfil` no padrão das telas (abas); troca de senha pelo próprio usuário na aba Senha (9.2) |
| 78 | Um ADR por assunto: revisão decidida pelo usuário é corrigida no próprio ADR, com linha "Revisões" |
| 79 | Fachada única de mídia `apps/core/media.py`: campos `MediaFileField`/`MediaImageField` (herdam os do Django) e funções; nunca o storage do Django direto (teste-trava); `mediaUrl` no frontend |
| 80 | Perfil envia o formulário inteiro num `PUT /me/profile/` multipart (nome, fuso, foto, remover foto); só a senha fica separada, no `POST /auth/change-password/`. Rota de mídia só leitura e limitada por IP |
| 81 | Mídia separada por contrato: `<public_id do contrato>/<pasta>/…`, e `system/…` para o que não é de cliente, para separar um cliente levando a pasta inteira |
| 82 | Bases obrigatórias `BaseAPIView` (no-store por padrão) e `BaseSerializer`, com teste-trava; ADR 0021 revisado |
| 83 | Sessões: encerrar revoga o refresh (corte na próxima renovação, até 15 min, sem consulta por requisição); encerradas e expiradas são apagadas (LGPD) |
| 84 | Dispositivo pelo User-Agent com classe própria `users.devices.UserAgent` (sem dependência); guarda só o rótulo |
| 85 | Aba Sessões do Perfil só de visualização: sessões ativas + últimos 20 logins do registro de acesso; rotas de encerrar mantidas na API |
| 86 | 2FA (9.4) por implementação própria adaptada do django-otp (Unlicense): espera crescente após falhas, antirreuso pelo último intervalo (`last_t`) e código reserva apagado ao usar; `pyotp` só para o cálculo. Corrigido em relação a ele: segredo cifrado, códigos reserva com hash, linha travada na verificação, login em dois passos no JWT |
| 87 | Segredo do 2FA cifrado (Fernet, `cryptography`) com chave própria `DJANGO_MFA_ENCRYPTION_KEY`; a 9.4 é entregue de uma vez (backend, Perfil, login e reset por admin) |
| 88 | MFA permanece opcional e só é pedido após ativação confirmada pelo usuário. Ativar, desativar, regenerar reservas ou resetar encerra todas as sessões e pede novo login; mostrar as reservas antes da saída. Preservada a decisão 83 para access já emitido |
| 89 | 9.5 vira a aba **Minhas permissões** do Perfil, antes de Sessões: só leitura, todas as organizações do usuário (a ativa em destaque), com perfis e permissões efetivas de cada uma |
| 90 | Superadmin não vê a aba Minhas permissões por ora; o acesso total do superadmin está em reavaliação pelo usuário (sem mudança até decidir) |

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
| 5.4 | Área comum (admin do contrato): organizações, usuários, perfis e atribuições | 0009 §3.1 | ✅ (Blocos 7 e 8) |
| 5.5 | OpenAPI (`drf-spectacular`), navegável só para autenticados | 0004 | ✅ |

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
6.6/6.7 cobrir sai do escopo delas. Organizações da 5.4 foram antecipadas no Bloco 7.

## Bloco 7 — Organizações na área do cliente (decisões 45 a 53)

| # | Etapa | Lado | ADR | Status |
|---|---|---|---|---|
| 7.1 | ADR 0037; remover `/admin/organizations/`; registry com `organization:view` e as quatro permissões não reservadas (`create` só CONTRACT) | backend | 0037 | ✅ |
| 7.2 | `GET /api/v1/me/permissions/`: códigos efetivos na organização ativa, para a interface | backend | 0037, 0009 §4 | ✅ |
| 7.3 | CRUD de organizações em `/api/v1/organizations/` (lista, detalhe, options, schema, criar, editar, excluir), RBAC, auditoria e isolamento | backend | 0037, 0006 | ✅ |
| 7.4 | Frontend: tela de organizações no Core, `PermissionContextService` ligado ao 7.2, menu e botões por permissão | frontend | 0037, 0035 | ✅ |

## Bloco 8 — Usuários, perfis e permissões na área do cliente (5.4, decisões 54 a 57)

| # | Etapa | Lado | ADR | Status |
|---|---|---|---|---|
| 8.1 | Usuários: `/api/v1/users/` (CRUD, redefinir senha, `user:view`/`user:delete` reservadas) e telas | backend + frontend | 0009, 0015 | ✅ |
| 8.2 | Perfis do cliente e suas permissões (catálogo do registry com rótulos) | backend + frontend | 0009, 0016 | ✅ |
| 8.3 | Aba "Permissões" do usuário: organizações à esquerda, grade por recurso, aplicar perfil, admin do contrato | backend + frontend | 0009 | ✅ |
| 8.4 | Exceção de permissão na atribuição (ADR 0038): modelo, avaliador, `…/access/` e aba sem cadeados | backend + frontend | 0009, 0038 | ✅ |
| 8.5 | Tela de Configurações (menu do avatar) com preferências de aparência no usuário (`/me/preferences/`); `ThemeService` no lugar do painel do template | backend + frontend | — | ✅ |

Pendência registrada (pedido do usuário, depois do Bloco 8): tela de **Configurações** no menu do
avatar, com as opções de tema (cor primária, preset Aura/Lara/Nora, claro/escuro) e remoção do
painel "Settings" da tela de login. ✅ Etapa 8.5.

## Bloco 9 — Perfil do usuário (decisões 69 a 75)

Página do item "Perfil" do menu do avatar (`/perfil`), com abas Principal, Segurança e Acesso.

| # | Etapa | Lado | ADR | Status |
|---|---|---|---|---|
| 9.1 | Mídia configurável por `.env` (`filesystem` ou `s3`, `django-storages`), URL temporária assinada nos dois modos, bucket/pasta privados; comando `transfer_media` para migrar entre os modos; fachada `media` com campos próprios | backend | 0039 | ✅ |
| 9.2 | Perfil `/perfil` (formulário no padrão, abas): Principal com foto (256 px WebP sem metadados, remover), nome editável, usuário só leitura, fuso horário IANA aplicado às datas; aba Senha (troca pelo próprio usuário) | backend + frontend | 0039 | ✅ |
| 9.3 | Sessões: navegador/IP de cada sessão (claim `sid`), aba Sessões só leitura com ativas + últimos logins; rotas de encerrar uma e as outras prontas na API | backend + frontend | 0004 | ✅ |
| 9.4 | 2FA TOTP opcional: ativar por QR, 10 códigos reserva, 2º passo no login, desativar com senha + código, reset por admin auditado | backend + frontend | 0041 | ✅ |
| 9.5 | Minhas permissões (aba do Perfil, só leitura): organizações, perfis e permissões efetivas (decisões 89–90) | backend + frontend | — | 🔄 |

## Melhoria aprovada — escolha e troca de organização (2026-10-31)

- ✅ FigCraft: escolha no login, troca em modal e cenários com 100 organizações/busca/vazio.
- ✅ Frontend: `UiOrganizationPicker` compartilhado, rota em AuthLayout, diálogo pelo
  avatar; busca local a partir de 6 (junto com a rolagem), seleção preservada e lista limitada a 350 px.
- ✅ Entrada direta com organização única, guards e sincronização/recarregamento
  mantidos (ADR 0035); Cancelar/X/Esc preservam contexto/URL e retornam foco ao avatar.
- Validação: 120 testes ChromeHeadless; lint/formato/build; revisão OWASP A01–A10 e
  performance sem novos achados no escopo. Chrome com API simulada: desktop e
  320 px sem overflow horizontal, busca e Esc. Sem auditoria WCAG completa/E2E real.
- ✅ Resultado revisado e commit autorizado pelo usuário, incluindo os ajustes do topo/avatar e rótulo Entrar.

### Situação da 9.4 em 2026-10-31

- MFA opcional por conta: setup pendente não exige segundo fator; confirmação do
  primeiro TOTP ativa. Login com fator confirmado só emite tokens/sessão após TOTP
  ou reserva. Segredo cifrado, reservas HMAC, antirreuso/locks e espera persistida.
- Decisão 88 registrada no ADR 0041: todas as sessões/refresh e provas revogados ao
  mudar o fator. Reservas exibidas antes de limpar a sessão local e pedir novo login.
  Access já emitido preserva limite de até 15 min, sem consulta na navegação (83).
- Perfil integrado, QR local, reservas uma vez/download explícito. Reset nas ações de
  Usuários e Admins do contrato; papel de administrador preservado mesmo inativo.
  Comando auditado para recuperação de superadmin até 5.3.
- Migrations users.0008/audit.0011 aplicadas localmente com autorização; chave MFA
  independente gerada apenas no .env ignorado. Nenhuma conta ativada automaticamente.
- Validação: 756 testes backend e 128 frontend; ruff check/format, lint/format:check/
  build, OpenAPI validate/fail-on-warn, migration check, check e check --deploy passaram.
  Isolamento, falhas persistidas, concorrência e consultas constantes com 30 contas
  adicionais cobertos; sem consulta MFA na navegação. Sem teste de capacidade em produção.
- Revisão OWASP A01–A10: sem achados pendentes neste diff; corrigido reset de admin
  inativo. Conformidade: credenciais cifradas/sem logs, reservas só HMAC, QR local,
  autoria auditada, licenças verificadas, controles acessíveis e recurso opcional.
- ✅ Etapa concluída e commitada (af7f843). Não iniciar 9.5 sem aprovação.
- Revisão de segurança pós-commit: corte após 10 falhas seguidas no 2º passo (7c0edbe) e
  senha atual obrigatória para ativar (00eec1c); ambas registradas no ADR 0041.
- Layouts aprovados e aplicados: 2º passo do login, login, aba do Perfil (FigCraft).
