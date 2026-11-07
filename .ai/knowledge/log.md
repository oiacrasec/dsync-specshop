# Histórico do conhecimento

## 2026-11-07 — Dados e acesso do SPECSHOP (1.1)

- ADR 2003: produto e correspondência por contrato, pesquisa e resultado por organização;
  base global de observações anônima (exceção ao ADR 0006), chave (fonte, anúncio, dia,
  preço), partição mensal, índice (produto do catálogo, dia) INCLUDE preço, uma consulta
  por série; coleta servidor x navegador com limite de confirmações configurável (início 1),
  quarentena de valor fora da curva e origem em tabela restrita; pesquisa por produto
  disparada pela tela (sem fila); recursos, ações e 3 perfis iniciais.

## 2026-11-07 — Telas do MVP no FigCraft

- `design/specshop-telas.figcraft` (arquivo do projeto, biblioteca do core sem edição):
  telas 1 a 1e (produtos), 2 a 2b (shopping), 3 (dashboard macro), 4 (histórico) e 5
  (auditoria em página). Inventário e pendências em `docs/domain/specshop/telas.md`.
- Padrões seguem o app real (`ui-table`, `ui-filter`, formulário de usuário); a biblioteca
  do core diverge do app em barra de filtros, altura do card, rodapé e lista vazia.

## 2026-11-07 — Mercado Livre via API de catálogo (0.2)

- ADR 2002: API como fonte principal (`/products/search` com `domain_id` e paginação +
  `/products/{id}/items`, token `client_credentials`): 240 ofertas da L3250 em 7 produtos
  de catálogo, com condição, UF e frete por CEP. `/sites/MLB/search` e `/items` dão 403
  (política, não escopo); servidor recebe verificação de conta na busca pública.
- Extensão do navegador como complemento (Pix, parcelamento, anúncios fora do catálogo),
  acionada pelo SPECSHOP; instalação com 1 clique na loja oficial (etapa 3.4).
- Pagamento sem dado = "desconhecido"; nota fiscal = "não informada"; histórico da base
  global própria, compartilhada entre empresas sem revelar quem pesquisou.
- Plano: Mercado Livre implementado primeiro; 0.3/0.4 antes dos blocos 5 e 6.
- `docs/domain/specshop/fontes-de-para.md`: DE-PARA pedido × loja (ML, KaBuM!, OLX,
  Buscapé, Magalu, MegaMamute, Meta) com testes de 07/11; ADR 2001 ganhou seção Revisões.

## 2026-11-07 — Variáveis do SPECSHOP no .env do core

- ADR 2000 item 7: bloco `# SPECSHOP` no fim de `backend/.env.example` (ML_CLIENT_ID,
  ML_CLIENT_SECRET); `backend/.gitattributes` aplica `merge=union` para o merge do core
  preservar as linhas do projeto e acrescentar as novas do core.

## 2026-11-07 — Regras de coleta nas fontes (0.1)

- ADR 2001: API oficial primeiro com credencial da aplicação; sem API, só páginas públicas
  liberadas pelo robots.txt e termos; nunca contornar login/CAPTCHA/bloqueio/limite;
  só dados factuais; vendedor mínimo (nome exibido, ID na fonte, cidade/UF).
- Levantamento: Mercado Livre via API (endpoint a confirmar no 0.2); KaBuM!, MegaMamute e
  Buscapé condicionados pelo robots.txt; Magalu e OLX indeterminados (403 anti-robô);
  Facebook/Instagram bloqueados sem permissão da Meta. Auditoria jurídica antes da produção.

## 2026-11-07 — Merge do core: índice de ADRs do projeto

- Merge de `core/main` (77a3145): ADRs de projetos derivados a partir de 2000, índice em
  `docs/adr/projeto.md`. ADR 2000 e `docs/domain/specshop/README.md` alinhados: o índice
  dos ADRs do SPECSHOP passa a ser `docs/adr/projeto.md`.

## 2026-11-07 — Plano do MVP do SPECSHOP

- `docs/plans/entrega-2001-mvp.md`: blocos 0 (viabilidade das fontes) a 7 (piloto),
  começando pelas fontes por decisão do usuário. Planos do SPECSHOP numerados a partir de
  2001 (ADR 2000, revisão de 2026-11-07).

## 2026-11-07 — Especificação do SPECSHOP organizada no padrão

- Especificação v0.8 do idealizador consolidada em `docs/domain/specshop/` (README,
  regras, requisitos, decisoes-e-pendencias, decisoes-tecnicas), com IDs D, RF, RQ, Q,
  DEC e DT preservados; o arquivo original não é mantido no repositório.
- ADR 2000 (Aceito): ADRs do SPECSHOP a partir de 2000, índice em
  `docs/domain/specshop/README.md`, DT registradas como ADR 2000+.
- Alerta para DT-02: coleta em sites de terceiros exige passar por `conformidade-legal`
  (termos de uso das fontes; LGPD para vendedores pessoa física em OLX/Facebook).

## 2026-11-07 — Fábricas de isolamento por app e OpenAPI em projetos derivados

- `apps/core/tests/test_isolation.py` junta `FACTORIES`/`SHARED` de `apps/<app>/tests/isolation.py`
  (repetição de model é erro). `backend/AGENTS.md`, ADR 0036 item 5 e
  `docs/derived-projects/README.md`: projeto declara fábricas sem editar o core; conflito no
  `docs/api/openapi-v1.yaml` gerado se resolve regenerando.

## 2026-11-07 — Apps e rotas do projeto derivado

- ADR 0036 item 5: `backend/config/project.py` (`PROJECT_APPS`) e
  `backend/config/api/project.py` (rotas v1) são arquivos do projeto, vazios no core e
  ligados em `config/settings/base.py` e `config/api/v1.py`. Teste da ligação em
  `apps/core/tests/test_project_files.py`; guia em `docs/derived-projects/README.md`.

## 2026-11-07 — Permissões declaradas por app

- ADR 0044: `PermissionRegistry.register`/`freeze`; `apps/rbac/catalog.py` carrega
  `permission_catalog.py` de cada app em `RbacConfig.ready()` (permissões e rótulos) e
  congela o registry. Repetição de código ou rótulo interrompe a inicialização. Projetos
  derivados declaram permissões sem editar o core (`docs/derived-projects/README.md`).

## 2026-11-07 — ADRs de projetos derivados começam em 2000

- ADR 0036 (item 6 e pendência do índice), `docs/adr/README.md` e
  `docs/derived-projects/README.md`: o core numera ADRs de 0001 a 1999; cada projeto
  derivado começa em 2000, evitando colisão com ADRs novos do core. Índice do projeto em
  `docs/adr/projeto.md` (arquivo do projeto no item 5 do ADR 0036).

## 2026-11-07 — changepassword com contexto de tenant e calendário no body

- `apps/core/management/commands/changepassword.py` sobrescreve o comando do Django e roda em
  `system_context()` (o manager de usuário exige tenant). Só funciona porque `apps.core` agora
  vem antes de `django.contrib.auth` em `INSTALLED_APPS`. Grava só o hash: sem auditoria e sem
  revogar sessões.
- `ui-input-date`: `appendTo` passa a ser `body` por padrão, para o popup não ser cortado
  pelo card do formulário.

## 2026-10-31 — Guia para criar projeto derivado

- docs/derived-projects/README.md: criar repositório com histórico (clone + remote
  `core`), personalizar nome/banco/chaves/docs, ambiente local, regra de só acrescentar,
  atualizar por `git fetch core && git merge`, limitações atuais e venda. Linkado no
  overview (2.3) e no ADR 0036. Primeiro projeto previsto: SPECSHOP.

## 2026-10-31 — Gateway HTTPS: Nginx + certbot (3.2)

- Usuário escolheu Nginx + certbot no host (familiaridade). ADR 0043; modelo
  `scripts/nginx-site.conf.example` (/api/ → backend, resto → frontend, cabeçalhos de
  proxy sempre sobrescritos, 10 MB, sem access_log). Tutorial seção 4 e guia atualizados.
- Validado localmente: `nginx -t` (1.30.6) e gateway na frente das imagens reais (HTTP
  chega ao Django e redireciona; cabeçalho forjado ignorado; SPA 200; 3 MB sem 413).
  Teste no subdomínio real do usuário pendente.

## 2026-10-31 — Tutorial de servidor com N projetos

- docs/deployment/tutorial.md: preparar VPS e máquina de operação, adicionar projetos
  (banco, clone, setup, configuração, portas distintas, deploy), gateway pendente (3.2),
  rotina de atualização e backup. Linkado no README de deployment.

## 2026-10-31 — Deploy em Python com operação remota por Fabric

- scripts/*.sh → Python: `deploy.py` (máquina de operação, Fabric 3.2.3, SSH sem PTY,
  RejectPolicy para host desconhecido) envia `deploy_server.py` por stdin; o worker na
  VPS usa só a biblioteca padrão e gera as chaves com `secrets` no próprio servidor.
  Atalho `<destino>/deploy.py`; `backend/scripts/start.py` substitui start.sh (Gunicorn via exec).
- Testes: `scripts/test_deploy.py` (unittest) + Fabric real em SSH loopback; imagens
  reconstruídas e smoke de contêineres ok. ADR 0042 revisado; docs/deployment e plano.

## 2026-10-31 — Chaves automáticas no setup de nova implantação

- Usuário solicitou reaproveitar .env.example e gerar as chaves de aplicação.
  Setup deriva novo backend.env do modelo; OpenSSL CSPRNG gera chaves Django/JWT
  independentes (48 bytes hex) e MFA/Fernet (32 bytes base64 URL-safe).
- Sem exibição de valores, arquivo 0600 desde a criação; falha do gerador bloqueia
  criação de configuração. Backend.env existente e .env local preservados; sem rotação.
- Banco/domínio e credenciais externas continuam manuais; backup seguro das chaves
  documentado. Testes cobrem formatos, independência entre implantações, preservação,
  ausência de chaves no log e falha bloqueante. ADR 0042/plano/docs atualizados.

## 2026-10-31 — Mapeamento de portas Compose explícito

- Backend/frontend usam sintaxe longa (target, published, host_ip, protocol), com
  validação :? separada em x-required-variables, pois a IDE rejeitava essa expressão
  no published. Inspeções PyCharm sem erros; Docker Compose confirma portas
  obrigatórias e acesso somente loopback preservados.

## 2026-10-31 — Base de deploy Git/Compose e mídia acessível no host

- Usuário aprovou scripts na raiz para setup inicial e deploy por Git/build na VPS;
  backup de mídia será coletado por outra máquina. ADR 0042 e plano Entrega 3 criados.
- scripts/setup-deploy.sh cria destino externo, configuração e wrapper; preserva
  mídia/segredos existentes. scripts/deploy.sh faz pull --ff-only, build sequencial,
  checks/migrations/up --wait com trava e falha bloqueante. Compose nunca é copiado.
- Dockerfiles/Compose isolados por aplicação; Python 3.14.10, Node 24 LTS e Nginx
  stable 1.30.6. API_BASE_URL aplicado apenas na imagem frontend. Backend não root;
  mídia filesystem em <implantação>/media montada só no backend; URLs assinadas mantidas.
- Sintaxe/testes de scripts, Compose real, builds e check --deploy passaram.
  Migrations em PostgreSQL temporário separado, API perfil 401 sem autenticação,
  mídia visível no host e preservada após recriação; SPA 200 e /media direto 404.
- Configuração de SSH/ACL para backup, gateway HTTPS, restore e dimensionamento real
  pendentes de alinhamento/ambiente. Sem implantação externa, sem commit desta etapa.
- Documentação em docs/deployment/README.md; AGENTS, overview, READMEs e handoff
  atualizados. Plano ativo Entrega 3; Entrega 2 mantém nove avisos npm do Karma.

## 2026-10-31 — Segundo lote frontend: produção sem avisos e 9 moderadas residuais

- Autorização permanente para apagar arquivos comprovadamente desnecessários ao
  commitar registrada em modo-de-trabalho; backend/package-lock.json vazio e não
  versionado removido. Lockfile frontend preservado e atualizado.
- Quill removido do manifesto (único consumidor no CMS desabilitado); exemplo
  preservado com aviso de revisão/reinstalação antes de reativar. Autorização de
  limpeza supera a pergunta pendente do primeiro lote.
- Removidos três plugins ESLint não carregados; ESLint 10.14.0, @eslint/js 10.0.1
  explícito, typescript-eslint 8.72.1. Uma inicialização descartada removida de utils.ts.
- Overrides limitados: glob 13 → 14.0.3, minimatch 10 → 11.0.3 e uuid do SockJS →
  11.1.1; comparações de padrões, arquivos, cache e HTTP/WebSocket passaram.
- npm 48 → 9 moderadas, zero críticas/altas/baixas; produção 1 → zero. Resíduo
  minimatch 3/Karma/cobertura: não forçar API incompatível nem mascarar auditoria.
  Modernização do executor ainda sem decisão; alcance do aviso documentado.
- 143 testes, lint/formato/npm ls/build e ng serve passaram. Os 77 arquivos JS/CSS
  de produção ficaram idênticos por SHA-256; backend sem alteração neste lote.
- Relatório docs/security/dependencies.md, README frontend, overview, plano e handoff
  atualizados. Resultado revisado pelo usuário e commit do segundo lote solicitado,
  preservando as nove pendências documentadas.

## 2026-10-31 — Primeiro lote de segurança das dependências validado

- Escopo frontend + backend aprovado; plano ativo agora em
  `docs/plans/entrega-2-seguranca-dependencias.md`.
- Angular 21.2.25/CLI-build 21.2.29/CDK 21.2.14, PostCSS 8.5.32; `primeclt` sem uso
  removida. npm 101 → 48 avisos: zero críticas/altas, 47 moderadas de ferramentas
  (glob/minimatch/uuid) e Quill baixo. Produção: 21 → 1 (Quill).
- Quill só no CMS desabilitado: pergunta enviada sobre remover/manter/avaliar versão
  anterior; ainda sem resposta, dependência não alterada. Não reativar o exemplo.
- Pillow 12.3.0 → 13.0.0 (MIT-CMU): 39 avisos → zero. SDK e resolução dos requirements
  produção/desenvolvimento auditados, `pip check` OK; ferramenta temporária fora do SDK.
- 769 testes backend/143 frontend passaram; lint/formato/build/ruff/migrations/checks
  passaram. Bundle ~1,31 MB (~272,20 kB); sem alteração de queries/locks de produto.
- Relatório com fontes, alcance, limites e pendências: `docs/security/dependencies.md`.
  Dependências, READMEs, inventário, overview e handoff atualizados; commit do primeiro
  lote autorizado pelo usuário. 48 avisos npm e decisão sobre Quill continuam pendentes.

## 2026-10-31 — Prioridades e requisitos de deploy definidos pelo usuário

- Ordem: 1) segurança das dependências; 2) deploy em VPS / servidor local.
- Uma VPS poderá hospedar 1 ou N projetos derivados do core; banco de dados sempre
  separado em outra VPS. Estrutura Docker será alinhada antes da implementação.
- Decisões 94–95 registradas no plano ativo e no handoff; 5.3 permanece paralisada.

## 2026-10-31 — Alinhamento de produção e auditoria npm retomada

- Usuário destacou Dockerização para VPS nas clouds e pediu alinhamento antes da implementação.
- `npm audit` executado sem mudar dependências: 101 pacotes sinalizados, incluindo
  transitivas/desenvolvimento (5 critical, 48 high, 46 moderate, 2 low). Ainda avaliar
  alcance em produção e correções compatíveis; não equivale a 101 falhas exploráveis no app.
- Relatório temporário: /tmp/datasync-npm-audit-public.json; handoff atualizado.

## 2026-10-31 — Etapa 5.3 paralisada pelo usuário

- Etapa 5.3 e revisão do acesso total do superadmin ficam paralisadas até solicitação
  explícita do usuário; não propor sua retomada como próxima atividade.
- Decisão 93 registrada no plano ativo e no `.ai/handoff.md`.

## 2026-10-31 — Minhas permissões (9.5 concluída)

- Novo `GET /me/access/` em rbac: organizações acessíveis, perfis atribuídos e códigos
  efetivos do próprio usuário. Concessões carregadas uma vez e avaliador compartilhado;
  4 SELECTs de dados constantes com 30 organizações/perfis adicionais, sem escritas/locks.
- Aba antes de Sessões, só leitura, carregada na primeira abertura; atual aberta e
  destacada, perfis/ações em acordeões; admin com aviso de acesso total. Superadmin oculto.
- 769 testes backend/143 frontend passaram; ruff, lint/formato/build, OpenAPI, migrations
  e checks Django/produção passaram. Chrome com API simulada: desktop/320 px, sem
  overflow e abertura por Enter. Sem auditoria WCAG completa/E2E real/capacidade de produção.
- Superadmin recebe 403 `permission-denied` antes da consulta de concessões (decisão 92),
  com teste de regressão. Revisão OWASP A01–A10 sem achados pendentes no diff.
- Arquivos: backend/apps/rbac/{selectors,serializers,views,urls,tests/test_my_access}.py;
  frontend/src/app/pages/perfil/{perfil,my-permissions}.{ts,html}, my-permissions.spec.ts,
  core/services/profile.service.ts, core/utils/api-url.ts, types/profile.ts;
  docs/api/{my-access,profile}.md e openapi-v1.yaml, overview, plano, READMEs e handoff.

## 2026-10-31 — Proposta de Minhas permissões: administrador do contrato

- FigCraft: segundo estado com perfil e aviso de acesso total, inclusive permissões
  futuras, preservando organizações em acordeão e a atual em destaque; sem grade repetida.
- Primeiro estado ordenado: Organizações · Usuários · Perfis; Ver · Criar · Editar.
- Proposta salva e imagens desktop conferidas; aprovação visual pendente, sem código de aplicação.
  Arquivos: design/datasync-core-telas.figcraft, design/README.md e .ai/handoff.md.

## 2026-10-31 — Busca do seletor de organização a partir de 6

- Busca aparece junto com a rolagem: 6 ou mais organizações (antes, mais de 7).
  Arquivos: organization-picker.ts, auth-pages.spec.ts, frontend/docs/architecture/authentication.md.

## 2026-10-31 — Senha na ativação do MFA e nova aba do Perfil

- `POST /me/mfa/enable/` exige `password` (serializer `MfaConfirmSerializer`, comum a ativar
  e desativar); senha errada conta falha e respeita a espera. ADR 0041 revisado.
- Aba Perfil › Verificação em duas etapas redesenhada (FigCraft): situação, como funciona,
  configuração com QR/chave/código/senha, códigos reserva e ações de ativada.

## 2026-10-31 — Identificadores datasync → dsync

- Tipos de erro RFC 9457 agora `urn:dsync:problem:<slug>` (backend, frontend, testes,
  docs/api, OpenAPI, skill erros-api-rfc9457); revisão registrada no ADR 0004.
- Sal de assinatura de mídia `dsync.media` (invalida só URLs temporárias já emitidas);
  exemplos `dsync-media` e `/srv/dsync/media`. Nome do repositório/projeto não muda.

## 2026-10-31 — Limite de falhas no 2º passo do login

- Revisão de segurança: 2º passo sem limite final. Decisão do usuário (opção A, N = 10):
  `MFA_MAX_LOGIN_FAILURES`; a falha que atinge o limite derruba as provas pendentes
  (`MfaChallengesRevoked`, 401) e registra falha no `LoginThrottle`. Frontend volta à
  senha em 401 do 2º passo. ADR 0041 revisado; docs/api/mfa.md atualizado.
- Arquivos: users/constants.py, mfa.py, services.py, throttles.py, views.py,
  tests/test_mfa.py, pages/auth/login.ts, mfa-login.spec.ts.

## 2026-10-31 — Nome do sistema configurável

- Textos usam o nome por variável: frontend `environment.appName`/`companyName` via token
  `APP_BRAND` (login, rodapé, título da aba, arquivo de códigos reserva); backend
  `DJANGO_APP_NAME` (emissor TOTP, título do OpenAPI). Padrão Dsync CORE / DsyncLabs.
- Rodapé sem "GIS"; título da aba deixa de ser "Poseidon - PrimeNG".
- Arquivos: core/tokens/app-brand.ts, environments, app.component.ts, app.footer.ts,
  pages/auth/login.*, perfil/mfa-settings.ts, settings/base.py, users/mfa.py,
  .env.example, docs/api/openapi-v1.yaml, docs/architecture/overview.md.

## 2026-10-31 — Proposta visual do segundo passo do login

- Por solicitação do usuário e com referência em IM03.png, desenhada a página
  Login · Verificação em duas etapas em design/datasync-core-telas.figcraft.
- Reutilizados fundo, card branco de 560 px, Figtree, cores e componentes da seleção
  de organização aprovada. Campo ampliado, Verificar em largura total, alternativas
  no rodapé; autenticador/reserva/erro e versões 390/320 px conferidos visualmente.
- Navegação autenticador ↔ reserva no protótipo desktop. Exemplos fictícios; sem
  segredos reais. Biblioteca/tokens e código da aplicação não alterados nesta revisão.
- FigCraft salvo e aberto na proposta. Aguardando aprovação antes de implementar.

## 2026-10-31 — 9.4 MFA TOTP opcional

- Decisão 88: usuário aprovou encerrar todas as sessões ao mudar o fator e reafirmou
  que MFA é opcional, exigido apenas após ativação. ADR 0041 atualizado no mesmo assunto.
- Backend users: credenciais cifradas, reservas HMAC, prova opaca com TTL/uso único,
  proteção contra reuso e espera crescente persistida; tokens só após segundo fator.
  Configuração, ativação, desativação, renovação e reset completos e auditados.
- Recuperação: admin do contrato redefine comuns do próprio contrato; superadmin
  redefine admins, inclusive inativos. Comando auditado para superadmins até 5.3.
  Revisão corrigiu a distinção entre papel administrativo e situação ativa da conta.
- Frontend: Perfil integrado, QR local, reservas uma vez/download e guarda antes de
  sair; login com TOTP/reserva; resets nas telas de Usuários e Admins do contrato.
- Dependências verificadas em fontes oficiais: PyOTP 2.10.0, cryptography 50.0.2,
  qrcode 1.5.4 e tipos 1.5.6, licenças permissivas. QR em chunk sob demanda.
- Migrations users.0008/audit.0011 aplicadas por solicitação; chave própria gerada
  somente em backend/.env ignorado, sem exibição. Nenhum usuário ativado automaticamente.
- Validação concluída: 756 testes backend/128 frontend, ruff check/format, lint,
  format:check/build, OpenAPI validate/fail-on-warn, checks de migration/sistema/produção.
  Concorrência e consultas constantes com 30 contas adicionais; sem teste de carga
  produtiva. OWASP A01–A10 revisados, sem achados pendentes no diff.
- ADR/API/OpenAPI/AGENTS/README/plano e memória sincronizados. Alterações sem commit,
  aguardando revisão do usuário; próxima etapa 9.5 exige aprovação.

## 2026-10-31 — Seleção de organização no login e em modal

- Avatar: seletores de `frontend/src/assets/layout/_topbar.scss` abrangem também
  o botão semântico do perfil (cursor de mão, hover e foco), sem voltar a um link.
  Teste existente do topo verifica o cursor computado.

- Regressão IM03: p-dialog retirado do flex de `.layout-topbar`; o host fechado
  dividia o space-between e deslocava os ícones. Teste de geometria e Chrome
  em 390/1280/1920 px confirmam margem direita de 14 px, estável ao abrir/fechar.

- Ajuste posterior solicitado: ação com rótulo fixo Entrar, sem o nome escolhido.
  Template do seletor, testes existentes, FigCraft e docs de autenticação sincronizados.

- Aplicado desenho aprovado no FigCraft, incluindo cenário com 100 organizações.
- Novo `frontend/src/app/shared/ui/organization-picker/`, seleção em AuthLayout e
  troca em p-dialog no `layout/components/app.topbar.ts`; rota em `src/app.routes.ts`.
- Busca local acima de 7, lista até 350 px, seleção preservada e retorno do foco;
  uma chamada por abertura, destroy cancela HTTP e resposta antiga é rejeitada.
  ADR 0035 e API preservados. Sem backend, dependências ou configuração de ambiente.
- `pages/auth/auth-pages.spec.ts` adaptado/ampliado; 120 testes passando.
  Desktop e 320 px, busca e Esc conferidos no Chrome com API simulada.
- Docs de autenticação, memória de frontend, plano e handoff atualizados.
  Resultado revisado; commit autorizado pelo usuário, sem push.

## 2026-10-31 — Melhorias de layout (proposta de Organizações aplicada)

- Listas (`shared/ui/table`, `filter`, `core/utils/table-schema.ts`): "Novo …" primário nas 11 listas;
  coluna booleana como tag Sim/Não e `is_active` como **Situação** Ativo/Inativo; paginação só com mais de
  uma página (senão contagem com `countLabels` da lista, ex.: "2 organizações"); "Limpar" só com busca,
  filtro ou ordenação; "Buscar por nome"; realce da linha; tag 11rem; ⋯ 40 × 40 centralizado e linha
  compacta; "Filtros avançados" primário sem ícone. Testes novos em `table.spec.ts`.
- Estrutura: ☰ (40 px, fundo de cartão) antes da trilha, sem separador; trilha legível (`p-disabled`
  no `<li>` tinha opacidade 0,6) e último item em destaque; organização ativa inteira em até 2 linhas
  (sem corte em 20 caracteres), à esquerda; item ativo do menu em highlight 600; itens com 40 px; títulos
  de seção 700 em surface-900; rodapé legível sobre o fundo azulado.
- Contraste no tema (`theme.service.ts`): botão secundário em texto surface-700, tag cinza surface-800,
  placeholder surface-600 (3,5:1, distinto do valor), além da etapa 1 abaixo.
- Biblioteca `design/` v0.8 sincronizada com o app (tokens, item de menu ativo, título de seção, Topo).

## 2026-10-31 — Melhorias de layout, etapa 1 (tema)

- Primária no claro: `{primary.600}` (hover 700, ativo 800) e `text.mutedColor` `{surface.700}` em
  `layout/service/theme.service.ts` (ADR 0040 §7). `text-surface-500` → `text-surface-700` nas telas,
  layout e `shared/ui` (99 usos em 46 arquivos; `pages/examples` fora). Tradução pt-BR do PrimeNG com
  acentos (`março`, `terça`, `sábado`, `Não`, `Contém`…) em `src/app.component.ts`.

## 2026-10-31 — Design system em `design/`

- `design/`: biblioteca `datasync-ds.figcraft` (v1: tokens Tema/Primitivos, 8 estilos, 7 componentes
  com propriedades do PrimeNG), `datasync-core-telas.figcraft` (Usuários; Organizações antes × depois
  com 8 melhorias) e `tokens.json`. README com como abrir, publicar e refazer o vínculo da
  biblioteca (o FigCraft grava caminho absoluto). ADR 0040 (Aceito). `.gitattributes`:
  `*.figcraft binary`. `AGENTS.md`: `design/` em "Onde está cada coisa".
- Primária azul 600 (5,2:1) no lugar do 500 do template (3,7:1): biblioteca v2, ADR 0040 §7.
- Biblioteca v3: 31 ícones PrimeIcons + logo; página Layout (estrutura do Poseidon medida no código);
  padrão Página · estrutura (claro/escuro). ADR 0040 §8.
- Biblioteca v4: Select, MultiSelect, Data (+ calendário pt-BR), Menu de ações, Diálogo de confirmação;
  Botão com secondary text e danger outlined (vermelho 700). App: `'marco'` sem cedilha no datepicker.
- Biblioteca v5: padrões de tela adaptados de `usermanagement`/`crud` do Poseidon (lista com ações,
  lista vazia, formulário com abas e 2 colunas, confirmação de exclusão), só com campos reais do app.
- Biblioteca v6: Campo de texto com variante `filled` (placeholder × valor em `campo-texto`).

## 2026-10-30 — Skill leis-do-ux

- `.ai/skills/leis-do-ux/SKILL.md`: as 30 leis de UX em 5 grupos (percepção, decisão e memória,
  interação, expectativas, experiência), cada uma com regra do datasync; exceções (login genérico
  por segurança, acessibilidade, custo de autenticação) e checklist. Texto próprio: lawsofux.com é
  CC BY-NC-ND 4.0 e o artigo da Aela não tem licença aberta (só referência). Registrada no
  `AGENTS.md` e no índice `project-skills`.

## 2026-10-23 — 9.4 desenhada (2FA)

- Decisões 86–87: implementação própria adaptada do django-otp (caminho C), segredo cifrado com
  `DJANGO_MFA_ENCRYPTION_KEY`, entrega única. Comparados django-otp 1.7.5, django-two-factor-auth
  1.18.1 e django-allauth 65.20.1 (código conferido). Desenho completo no handoff.

## 2026-10-23 — Etapa 9.3: sessões

- Decisões 83–85. `users.UserSession` (registro técnico em `UNSCOPED_RECORDS`; `users.0007`):
  public_id, user, refresh_jti, device (rótulo), ip, created/last_seen/expires. Claim `sid` no
  refresh e no access. Login abre (e apaga expiradas), refresh trava e atualiza (usuário → token →
  sessão; sem sessão → 401; token antigo ganha sessão), logout e reset apagam; `end_sessions`
  revoga refresh e apaga. `users.devices.UserAgent` (regras próprias). Rotas `me/sessions/`,
  `me/sessions/<id>/` (DELETE), `me/sessions/end-others/`, `me/logins/` (AccessLog LOGIN_SUCCESS,
  unscoped filtrado pelo dono). Queries do login 8→10, refresh 20→22, logout 13→14 (constantes).
  Isolamento: `OWNER_ONLY = {UserSession}`. 17 testes; suíte 724.
- Frontend: aba Sessões do Perfil (só leitura, carregada ao abrir), ícone celular/computador. 108.

## 2026-10-23 — Bases de view e serializer (decisão 82)

- `apps/core/views.BaseAPIView` (`no_store=True` via `finalize_response`, também em erro; parser JSON;
  `UPLOAD_PARSERS`) e `apps/core/serializers.BaseSerializer`. 12 views e 13 serializers migrados;
  decorators `never_cache` das APIViews removidos; `MediaFileView` com `no_store = False`;
  `OpenApiSchemaView(BaseAPIView, SpectacularAPIView)`. Explicação em comentário: docstring das
  bases era herdada como descrição no OpenAPI. Verificado: DRF já converte `ValidationError` do
  Django em `validate*` e o handler RFC 9457 trata o do `save()`; try/except do avatar removido.
  OpenAPI sem diferença. Teste-trava `test_base_classes.py`. Back 708.

## 2026-10-23 — Etapa 9.2: Perfil

- Backend: `User.avatar` (`MediaImageField` avatars, 2 MB, 256 px) e `User.time_zone` (vazio =
  TIME_ZONE), `users.0006`; `GET/PUT /api/v1/me/profile/` multipart (`MyProfileSerializer`,
  `TIME_ZONES` de zoneinfo); `delete_user` apaga a foto (soft delete). Fachada: `get_storage` passou
  a devolver o `default_storage` (proxy preguiçoso) porque o Django avalia o storage do campo uma vez
  na carga do model; testes tinham gravado em `backend/media/` (limpo). 10 testes; suíte 704.
- Frontend: `/perfil` (abas Principal e Senha, um Salvar; senha só se preenchida), `ProfileService`
  (foto/iniciais no topo, fuso), pipe `zonedDate` + `timeZoneOffset` nas colunas datetime,
  `AuthService.changePassword` (renomeado). 106 testes. Docs: `docs/api/profile.md`.
- Melhorias: `ui-image-preview` (p-dialog no body, reaproveitável) com olho sobre a foto; menu do
  avatar fecha ao escolher item; aba Senha sem o texto de apoio.
- Decisão 81: mídia por contrato (`media.owner_folder`/`contract_of`; `media.save(contract=…)`;
  `system/` sem contrato). Foto local existente do `admin_x` movida para a pasta do contrato. Back 705.
- `SignedFileSystemStorage.delete` remove pastas vazias até a raiz da mídia (`os.rmdir`, para na
  primeira com conteúdo). Back 706.

## 2026-10-23 — Migração de mídia e regra de ADR

- Decisão 76: `manage.py transfer_media --from filesystem|s3 --to s3|filesystem [--dry-run]`
  (`apps/core/storage.transfer_media`: copia mantendo nomes, pula mesmo tamanho, substitui cópia
  incompleta, confere, não apaga a origem, falha no fim se houver erro); storages montados do mesmo
  `.env` (`config/storage.media_storage`). 6 testes. Procedimento no ADR 0039 §5 e no README.
- Decisão 77: senha na aba Senha do formulário `/perfil` (9.2); 9.3 fica só com sessões.
- Decisão 79: fachada `apps/core/media.py` (get_storage como função; save/url/open_file/exists/
  delete/delete_on_commit; detect_content_type por assinatura; imagens → WebP sem metadados;
  `MediaFileField`/`MediaImageField` com UUID v7, validador, pre_save e limpeza pós-commit;
  build_storage/transfer). `MediaFileView` e `transfer_media` passam pela fachada. Teste-trava contra
  storage direto. Pillow 12.3.0 (13.0 recém-lançada, evitada). Front `mediaUrl`. Back 692, front 101.
- `MediaFileView` só leitura (`http_method_names` get/head) e `MediaDownloadThrottle` por IP real
  (`client_address`, `DJANGO_MEDIA_DOWNLOAD_RATE=120/min`). Perfil (9.2): um `PUT /me/profile/` multipart
  com nome, fuso e foto; senha continua no `POST /auth/change-password/` (decisão 80).
- Decisão 78: um ADR por assunto; revisões no próprio ADR (linha "Revisões"); skill
  `modo-de-trabalho` e `docs/adr/README.md` ajustados; 0004 e 0037 com as revisões de 2026-10-19.

## 2026-10-19 — Etapa 9.1: armazenamento de mídia (ADR 0039)

- Decisões 69–75 registradas (Bloco 9). `config/storage.py` monta `STORAGES['default']`:
  `filesystem` → `apps.core.storage.SignedFileSystemStorage` (url = `/api/v1/media/<token>/`,
  `signing` com validade `DJANGO_MEDIA_URL_EXPIRE`), `s3` → `storages.backends.s3.S3Storage`
  privado com pre-signed SigV4 (endpoint/addressing para MinIO). `MediaFileView` sem JWT (token é
  a credencial; 404 se adulterado/vencido/ausente/modo s3; `private` + CSP sandbox). Produção só
  troca `staticfiles`. `django-storages[s3]` 1.14.6 + boto3. 6 testes; suíte 675. OpenAPI regenerado.

## 2026-10-19 — Etapa 5.5: OpenAPI

- Decisões 67–68. Backend: `drf-spectacular` 0.30.0; `apps/core/openapi.py` (AutoSchema com
  `X-Organization-Id` nas views com `RequiredPermission` ou `organization_header`, JWT bearer,
  respostas RFC 9457 por hook, gerador em `system_context`, `api_schema` em cache por processo);
  `GET /api/v1/schema/` autenticado, `/admin/` só superadmin; paginação `{data, total_records}` e
  `first`/`rows` no schema; `@extend_schema` nas APIViews e actions. Action `schema` renomeada
  para `table_schema` (URL igual) por colidir com `view.schema` do DRF. `docs/api/openapi-v1.yaml`
  versionado com teste de divergência. Suíte 669.
- Frontend: `/documentacoes/api` (menu do avatar) com `swagger-ui-dist` 5.33.1 (Apache-2.0) sob
  demanda; Try it out com token/organização só para a API (`needsOrganizationHeader` extraído do
  interceptor). 99 testes.

## 2026-10-19 — Etapa 8.5: tela de Configurações e preferências no usuário

- Decisões 65–66. Backend: `User.preferences` (JSONField, `users.0005`), `GET/PUT /api/v1/me/preferences/`
  (`MyPreferencesView`, `PreferencesSerializer` com listas fechadas em `users/constants.py`; leitura
  completa com o padrão; gravação com `update_fields`). 8 testes; suíte 664.
- Frontend: `ThemeService` (extraído do `app.configurator`, removido), `PreferencesService`, página
  `/configuracoes` (aba Principal, aplica na hora, Salvar grava, sair sem salvar reverte); `AppLayout`
  carrega as preferências; `AuthLayout` volta ao padrão; engrenagem removida do login/landing/erro.
  97 testes. Docs: `docs/api/preferences.md`, README do frontend.

## 2026-10-19 — Etapa 8.4: exceção de permissão na atribuição (ADR 0038)

- Decisão 64: perfil vinculado com customização livre. `AssignmentExclusion` com `permission_code` e
  `excluded_organization` opcional (rbac.0004, restrição de alvo); `Grant.excluded_codes`,
  `codes_at`/`codes_anywhere` no avaliador; `save_exclusion` aceita exceção de permissão em
  atribuição de perfil (organização só no CONTRACT; essencial sem exceção).
- `…/access/`: `excluded_permissions` por concessão. Aba sem bloco de herdados nem cadeados (só o
  admin trava a grade); desmarcar código de perfil grava exceção, marcar grava avulsa.
- Testes: avaliador, API (propagação de código novo com exceção mantida). Back 656, front 93.

## 2026-10-19 — Etapa 8.3: permissões do usuário; padrão de abas nos formulários

- Decisões 58–61: perfil vinculado; "Todas as organizações" = escopo CONTRACT com exceções por
  organização; Salvar único; formulários com a aba Principal (como contratos).
- Backend: `GET/PUT /api/v1/users/{id}/access/` (`UserViewSet.access`, `user:view` /
  `assignment:create`); `rbac.selectors.user_access`; `UserAccessSerializer` resolve UUIDs no
  contrato; `rbac.services.replace_user_access` grava só a diferença. 13 testes; suíte 647.
- Frontend: `usuario/permissoes/` (`app-user-access`); `app-permission-grid` com `locked` e `scope`;
  formulários de organização, usuário e perfil em `p-tabs` (perfil: aba Permissões). 90 testes.
- Docs: `docs/api/users.md`, `frontend/AGENTS.md`, `frontend/docs/standards/patterns-frontend.md`.
- Decisão 62: `organization:create` em qualquer escopo (registry `_ANY_SCOPE`; ADR 0037 §2 revisto;
  `docs/api/organizations.md`); teste de criação com concessão só numa organização. Suíte 648.
- Decisão 63: sem a flag `contract_admin`; o essencial entra no seletor de perfis da aba (só em
  "Todas as organizações", sem exceção) e no `GET …/access/` com `is_essential` e todos os códigos.
- Catálogo: `PERMISSION_LABELS` sobrepõe o rótulo da ação (`user:manage` → "Redefinir senha").

## 2026-10-19 — Etapa 8.2: perfis do contrato

- Backend: registry `profile:view` (reservada); `GET /api/v1/permissions/` (catálogo com rótulos
  `RESOURCE_LABELS`/`ACTION_LABELS`); `ProfileViewSet` em `/api/v1/profiles/` (perfis do contrato
  editáveis, do sistema só leitura, `permissions` sincronizadas pelos services de RBAC);
  `begin_write` autoriza o admin ativo no próprio contrato. Suíte 634.
- Frontend: tela de perfis (lista, form com `app-permission-grid` por recurso, perfil do sistema
  só leitura), `PermissionCatalogService` (uma busca por sessão), `PROFILE_*`, menu. 85 testes.
- Docs: `docs/api/profiles.md`.

## 2026-10-18 — Etapa 8.1: usuários do contrato

- Decisões 54–57: gestão reservada; username + nome; senha temporária; etapas 8.1→8.2→8.3 com a aba
  de permissões no layout do GIS (analisado a pedido do usuário).
- Backend: registry `user:view`/`user:delete` (reservadas); `UserViewSet` em `/api/v1/users/`
  (`users/urls.py` passa a montar `auth/…` e o router); `ContractUserSerializer` (save_user, senha
  temporária uma vez, username único global); reset em `user:manage`; eventos `user.*` (audit.0010).
  `BaseFilterSet.default_ordering` e `ListQuerySerializer.ordering` sem default fixo `name`.
  10 testes; suíte 623.
- Frontend: tela de usuários reativada (lista, form, reset com confirmação, permissões `USER_*`);
  componente compartilhado `app-temporary-password` (também no formulário de contrato);
  `error-message.ts` do GIS removido. 78 testes.
- Pendência: tela de Configurações (tema) no menu do avatar, depois do Bloco 8.

## 2026-10-18 — Etapa 7.4: organizações no frontend

- `PermissionContextService` real: `/me/permissions/` uma vez por sessão+organização, signal, nega
  por padrão; superadmin não consulta; menu carrega no ngOnInit. `types/permission.ts` = PermissionSummary.
- Tela de organizações reativada (rotas COMMON com requireContext e permissionGuard; menu por
  `organization:view`; fora dos ignores do ESLint): service no Core (`listTable`, `encodeURIComponent`),
  lista com `resolveCrudPermissions`, formulário só com nome/situação, UUID validado, problemMessage,
  renomear a ativa atualiza o contexto. `PERMISSION_KEYS.ORGANIZATION_*` = códigos do registry.
- Pedido do usuário: padrões nos componentes (`ui-table` rows 20 e dataKey `public_id`;
  `ui-autocomplete` rows 20); telas não repetem. 8 testes novos (72). Bundle ~1,24 MB.
- Pedido do usuário: coluna `boolean` do schema vira ícone no ui-table (`pi-check-square` verde,
  `pi-times-circle` vermelho; PrimeIcons não tem x quadrado), com texto oculto Sim/Não. +1 teste (73).
- Pedido do usuário: Font Awesome Free 7.3.1 por classe (npm verificado: CC-BY-4.0 AND OFL-1.1
  AND MIT; atribuição no README). CSS núcleo+solid+regular em angular.json; célula booleana usa
  `fa-square-check`/`fa-square-xmark`. Bundle inicial 1,24 → 1,32 MB (aviso do orçamento de 1,3 MB).

## 2026-10-18 — Etapa 7.3: CRUD de organizações na área do cliente

- Decisões 50–53 (usuário): editar/excluir com código em qualquer escopo valem no contrato todo;
  excluir organização em uso → 409; manter uma ativa → 409; nome único sem caixa → 422.
- rbac: `granted_codes`, `request_grants`/`contract_codes` (concessões uma vez por request),
  `RequiredPermission.has_context` extraído e `ContractWidePermission`.
- contracts: `OrganizationViewSet` (`/api/v1/organizations/`), `OrganizationSerializer` CRUD,
  `OrganizationFilterSet`; administração usa `OrganizationSummarySerializer`. Exceções
  `OrganizationInUse`/`LastActiveOrganization`, eventos `organization.*` (audit.0009, só choices).
- 16 testes (contrato inteiro, códigos por ação, contexto, isolamento, nome, última ativa,
  em uso, auditoria sem nome, essencial, queries constantes, concorrência) + catálogo. Suíte 603.
- Pedido do usuário: mapa de permissões dinâmico nas bases. `core/mixins.ResourcePermissionMixin`
  (`permission_resource`, gerado em `__init_subclass__` a partir de
  `core/constants.RESOURCE_PERMISSION_ACTIONS`); overrides por dict; actions customizadas negadas
  até declaradas. OrganizationViewSet usa `permission_resource = 'organization'`. 6 testes; 609.
- Pedido do usuário: options com as mesmas permission_classes da view. Removidos
  `options_permission_class`, `LookupOptionsPermission` e o `get_permissions` do mixin;
  `RequiredPermission.has_context` exige `:view` no options e `AllowAuthenticated` delega o
  options a RequiredPermission. Testes de options inalterados; +1 teste (contrato inteiro). 610.
- Refactor: `core/mixins.ModelQuerysetMixin` (`model = X` → `X.objects.all()` na requisição) nas
  bases; OrganizationViewSet sem `get_queryset` próprio. +1 teste; 611.

## 2026-10-18 — Etapa 7.2: resumo de permissões

- `rbac.views.MyPermissionsView` em `GET /api/v1/me/permissions/` (AllowAuthenticated, never_cache):
  `resolve_organization` + `access_evaluation`; sem acesso → 403 context-forbidden; superadmin e
  perfil essencial → todos os códigos. 7 testes (efetivos/exceção, 400/403/401, inativo, queries
  constantes sem escrita). Suíte 585. Doc `docs/api/permissions.md`.

## 2026-10-18 — KPI vira Dashboards em branco

- Pedido do usuário: a home KPI (dados fictícios do template GIS) virou `/dashboards`, com página
  `pages/dashboards/` vazia no core; projetos derivados implementam os seus. Removida a pasta
  `pages/examples/dashboards/kpi`; rotas, menu, guard, login, acesso negado, topbar e
  `safeReturnPath` usam `/dashboards`. 64 testes; bundle inicial ~1,24 MB.

## 2026-10-18 — Etapa 7.1: organizações na área do cliente (ADR 0037)

- Revisão do ADR 0032 com o usuário (decisões 45–49): organizações só na área do cliente;
  permissões `organization:*` não reservadas (`view` nova, `create` só CONTRACT); `view` em
  qualquer escopo lista o contrato inteiro; `/me/permissions/` para a interface; suporte do
  superadmin adiado. ADR 0037 aceito; 0032 substituído; 0009 §3.1 substituído no trecho de organizações.
- Removidos `contracts/views.py`, `urls.py`, `filters.py`, a rota `admin/` de contracts e
  `test_organizations_api.py`; `OrganizationSerializer` mantido (provisionamento). Registry e
  testes atualizados; admin sem rotas de organização (404). 578 testes backend.
- Docs: ADR 0037/índice/0032/0009, organizations, overview API, admin-contracts, rbac, registry,
  backend AGENTS/README, plano (Bloco 7), overview, memória e handoff.

## 2026-10-18 — Ajustes de UX após teste do usuário

- Topbar em tela pequena: botão do menu junto ao breadcrumb, só o logo à direita (commit 4f7610e).
- AppLayout sem menu (seleção de organização e troca de senha após login) centraliza o card na
  vertical; layout completo inalterado.
- Seleção de organização: com exatamente uma organização disponível (a API lista só ativas) e que
  ainda não é a ativa, entra direto; com mais de uma, ou já ativa, mantém a tela. 60 testes.
- Revisão automática de segurança (open redirect): `returnUrl` passava por checagem textual e
  `/\t/host` virava `//host`. `core/utils/return-url.safeReturnPath` recusa controle/espaço/`\`,
  exige mesma origem via `URL` e bloqueia telas de entrada; usado em `openContext`.
- "Limpar" do ui-filter emite `cleared`; ui-table zera a ordenação (estado e ícones do p-table, sem
  outro onLazyLoad) e o filtersChange seguinte busca sem `ordering`. 64 testes.

## 2026-10-18 — Tipo nas colunas do schema e locale pt-BR

- Pedido do usuário: máscara de data na grid de contratos. Escolha do usuário pensando em
  i18n: backend envia só o tipo semântico; frontend formata pelo locale.
- Backend: `core/schema.field_type` compartilhado; colunas do schema ganham `type` (mudança
  compatível, ADR 0026). Testes de schema/admin/organizações atualizados (594).
- Frontend: `LOCALE_ID` pt-BR + `registerLocaleData`, `index.html` `lang="pt-BR"` (skill
  acessibilidade), `ui-table` padrão `shortDate`; ContratoService mapeia date/datetime.
  55 testes ChromeHeadless; bundle ~1,25 MB. LOCALE_ID afeta números/moeda no app todo.
- Adaptador do Core extraído do ContratoService: `core/utils/table-schema.ts` (COLUMN_FORMATS,
  toTableResponse, toLookupResponse) e `BaseCrudService.listTable`/`lookupOptions`, com cache
  de schema por recurso; tipos genéricos em `types/table-schema.ts`. Sem mudança de comportamento.
- `API_PREFIX` fixo removido: `core/utils/api-url.serverUrl` resolve caminhos do servidor na origem
  do API_BASE_URL (recusa URL completa/`//host`). 3 testes novos (58).
- Lições registradas no `frontend/AGENTS.md` a pedido do usuário: reuso antes de tela, URLs só via
  API_BASE_URL, i18n com tipo semântico + LOCALE_ID, validar/codificar ids em caminhos da API.

## 2026-10-18 — Etapa 6.8: frontend de contratos na API do Core

- Decisão 44 (usuário): retenção pós-contrato no formulário. Tipos de contrato em inglês/
  snake_case (`types/contrato.ts`) e `types/options.ts`.
- ContratoService: /api/v1/admin/contracts, schema cacheado e adaptado ao ui-table,
  planOptions (q / public_id), provision, admins (rows 100) e resetAdminPassword.
- ui-filter: relação resolve por `public_id` (antes `pk`), rows 20, resposta snake_case.
- Lista com dataKey public_id/rows 20; formulário com plano, retenção, provisionamento,
  admins (situação/troca pendente) e reset com confirmação; erros via problemMessage.
- Rotas mantêm accessGuard ADMIN; permissionGuard libera superadmin (códigos `contrato:*`
  do GIS seguem sem uso no Core).
- 8 testes novos (52 no total), lint/formato/build OK; bundle ~1,25 MB. Backend inalterado.
- Docs: frontend README/autenticação/padrões, plano, overview, memória e handoff.

## 2026-10-18 — Etapa 6.7: admins do contrato e reset de senha

- Decisão 43 (usuário): lista inclui admins inativos; rotas admins/ e reset-password/ (POST).
- `rbac.selectors.contract_admin_users`, `users.services.reset_password` +
  `_revoke_refresh_tokens`, `administration.services.reset_admin_password`, actions `admins`
  e `admin_password_reset`, `ContractAdminSerializer`, evento `user.password_reset` (audit.0008).
- Refresh mudou a ordem de locks para usuário → OutstandingToken (antes token → usuário),
  igual ao reset, evitando deadlock e refresh concorrente escapando da revogação.
  Logout continua só no token. Testes de auth/concorrência preservados.
- 17 casos de teste novos (lista/paginação/queries constantes, reset, revogação, 404, 401/403,
  rollback, ator revalidado, refresh × reset concorrentes); suíte 594.
- Docs: admin-contracts, authentication, audit, plano, overview, backend AGENTS/README,
  memória e handoff.

## 2026-10-18 — Etapa 6.6: provisionamento do contrato

- Decisão 42 (usuário): rota POST /api/v1/admin/contracts/{public_id}/provision/; admin com
  username + name; exige contrato disponível e sem usuários/organizações não excluídos.
- `apps/administration/services.py` (provision_contract), action `provision`,
  `ContractProvisionSerializer`, `users/utils.generate_temporary_password`, exceção
  `ContractNotProvisionable` (409) e evento `contract.provisioned` (audit.0007, só choices).
  `rbac.services._begin_write` virou `begin_write` (público) para a ordem de locks.
- 21 testes novos (sucesso, login com troca obrigatória, 409/422/404/401/403, rollback,
  custo fixo e concorrência); suíte com 576 + 1 de catálogo. Migration audit.0007 (só choices, sem
  SQL) aplicada ao banco local com autorização do usuário.
- Docs: admin-contracts, errors (+ contract-not-provisionable), audit, plano, overview,
  backend AGENTS/README, skill erros-api-rfc9457, memória e handoff.

## 2026-10-18 — Documentação alinhada às etapas entregues

- Status dos ADRs 0023–0025 (substituídos por 0030) e 0027 (substituído por 0028)
  corrigidos nos arquivos e no índice; conteúdo das decisões preservado.
- Overview §5 e §29 seguem os fluxos dos ADRs 0028/0030. README da raiz, visão geral
  da API, catálogo de erros, autenticação, domínio, registry, escopos e backend
  AGENTS/README deixaram de descrever como pendente o que foi entregue (2.3–3.6, 6.5).
- Só documentação; nenhum código ou contrato de API alterado.

## 2026-10-18 — ADR 0036: projetos derivados do core

- Registrado, como proposta, o modelo em que cada projeto é um fork do core com remote
  `core`, o fluxo é só do core para os projetos e o projeto apenas acrescenta, sem
  editar arquivos do core. Inclui o procedimento de venda por espelhamento do histórico.
- Criado `docs/adr/0036-projetos-derivados-do-core.md`; atualizados o índice dos ADRs,
  `docs/architecture/overview.md` (seção 2.3) e o `AGENTS.md` da raiz.
- Só documentação. Nenhum código alterado. Commit `bb39658`.

## 2026-10-04 — Etapa 6.5: frontend auth e organização compartilhada

- Usuário decidiu manter JWT localStorage após avaliar HttpOnly; determinou que
  mudar organização sincronize/recarregue todas as abas. ADR 0035 e decisão 41.
- AuthService/types/telas/interceptors adaptados a /api/v1, user mínimo, UUID de
  organização e RFC 9457. Senhas não persistidas; resumo atualizado após troca.
- Sessão/contexto signals + localStorage; Web Locks coordena refresh/logout,
  compartilhamento na mesma aba, descarte de respostas antigas e isolamento de URL.
- Storage sincroniza login/logout/organização. Troca limpa caches e recarrega;
  atualização apenas de label/rotação de JWT não recarrega. Dono impede contexto
  herdado por outra conta. Removidos headers/contrato de contexto Spatial.
- ETag global URL-only e resumo de permissões GIS desabilitados; nenhuma nova API.
  Proxy dev Angular /api → 127.0.0.1:8000; homol/prod URL e contratos 6.8 pendentes.
- 44 testes ChromeHeadless e probe de 30 pedidos sem storage/refresh; bundle ~1,25 MB.
  Arquivos: frontend core/types/auth/layout/appconfig, README/AGENTS/padrões/docs,
  docs ADR/API/overview/plano e memória frontend/handoff. Backend não alterado.
- Evidência não inclui E2E completo duas abas/backend, capacidade sob carga ou
  auditoria WCAG completa. JWT continua legível por JS; risco registrado, sem
  promessa de HttpOnly. Demais pendências anteriores de segurança/legal preservadas.

## 2026-10-04 — Etapa 6.4: primeiro acesso e troca de senha

- User.must_change_password default false; users.0004 aplicada localmente, sem
  bloquear contas existentes. A marcação no provisionamento/reset entra na 6.6/6.7.
- Login retorna user explícito (public_id, username, name=first_name, is_superuser,
  must_change_password), sem novo lookup. Superadmin isento, resumo sempre false.
- JWTAuthentication.authenticate bloqueia usuário comum marcado antes de permissões/
  contexto, inclusive views com permission_classes próprios e actions options/schema.
  Erro 403 password-change-required RFC 9457, catálogo/skill sincronizados.
  Só PasswordChangeView libera flag; login/refresh/logout continuam disponíveis.
- POST /api/v1/auth/change-password/ exige access, atua só na própria conta, sem
  organização, aceita atual/nova/confirmação. Troca também voluntária como Spatial.
  Recarrega conta/contrato e confere senha atual sob lock somente no usuário;
  validadores Django, set_password/Argon2, flag=false, autoria e auditoria atômica.
- Evento user.password_changed só guarda before/after da flag, autor/alvo/contrato.
  audit.0006 aplicada (choices, sem SQL de alteração). Sem senha/hash/token nos
  logs, erros ou auditoria; no-store na operação. Tokens atuais preservados;
  revogação de refresh por reset continua na 6.7 conforme decisão 40.
- Throttle próprio do DRF: 5 pedidos/min por usuário na troca, antes do hash/lock,
  sem mudar falhas de login/navegação. Cache compartilhado/borda são pré-produção;
  UserRateThrottle não representa limite estrito sob concorrência.
- Validador completo: 555 testes, lint/formato (124 arquivos), migrations e checks
  dev/produção OK. Novos 40 casos cobrem exceções, estado alterado após emissão do
  JWT, superadmin, alvo em outro contrato, validação, Argon2 real, rollback e corrida
  de duas trocas (200/422, um evento). Suíte de login/refresh/logout preservada.
- Performance: navegação normal/bloqueada com 1/30 contas extras faz um SELECT, sem
  writes/hash/lock. Troca faz 2 SELECT + 1 UPDATE + 1 INSERT (4 operações de dados),
  só um FOR UPDATE OF dsc_user; sem N+1. Login/refresh/logout mantêm contagens.
  Hash fica na operação infrequente de autenticação; memória/CPU do Argon2 já fazem
  parte desse custo. Não houve ensaio de capacidade/latência sob carga nesta etapa.
- OWASP A01–A10 revisadas sem achados novos no diff; política JWT existente mantida.
  LGPD: finalidade da flag e minimização do resumo documentadas, sem terceiros ou
  tracking novo. AccessLog mantém cobertura do ADR 0019; adequação jurídica/expurgo/
  LegalHold/MFA/infra continuam pendências anteriores. Nenhuma tela/dependência nova.
- Docs: ADR 0034/índice, autenticação/erro/auditoria, AGENTS/README, overview/plano,
  conhecimento e handoff atualizados. Próxima 6.5, após confirmação.

## 2026-10-04 — Etapa 6.3: API do superadmin separada do domínio

- Criado apps/administration (startapp, sem models próprios). Movidos views,
  serializers, filters, constantes de auditoria e testes de planos/contratos.
  Models/labels/tabelas/migrations permanecem em contracts; API mantém URLs,
  basenames, permissions, schema/options e eventos existentes (ADR 0033).
- Contract.plan opcional (null/blank), PROTECT preservado quando vinculado.
  Criação aceita omissão/null; atualização pode remover plano; auditoria registra
  null. Licenças e vigência continuam validadas; nenhum enforcement de quotas novo.
- contracts.0003_contract_plan_optional gerada e aplicada localmente. Migration
  padrão remove NOT NULL e recria a FK, sem alterar vínculos ou preencher dados.
  Em produção, planejar lock/validação da FK conforme volume; rollback exige
  resolver contratos sem plano antes de retornar ao NOT NULL.
- OrganizationViewSet/ADR 0032 continuam rascunho em contracts com comportamento
  anterior; incluem a mesma rota /admin/organizations para preservar a API na 6.3.
- Validação: 515 testes, lint/formato, migrations/checks dev/produção OK. Testes
  cobrem contrato sem plano/remover vínculo/auditoria/licenças, permissão do admin,
  FK histórica/PROTECT, concorrência e schema. OWASP A01–A10 sem achados novos.
- List/options com/sem plano, 1/30 itens: duas consultas de dados e sem writes;
  JOIN explícito evita N+1, locks de escrita preservados. Sem medição de carga nova.
  Sem novos dados pessoais, logs, dependências, telas ou contratação/cobrança.
- Docs atualizadas: ADR 0033/índice, domínio/API de contratos, AGENTS/README/standards,
  overview/plano, memória e handoff. Próximo passo 6.4, após confirmação.

## 2026-10-04 — Etapa 6.2a: qualidade do frontend

- ESLint flat config (`eslint.config.mjs`) com angular-eslint/typescript-eslint; autofix e
  correções manuais (inject(), seletores app-*, ordem de membros); telas desabilitadas ignoradas.
- Prettier aplicado; scripts `lint` e `format:check`; 4 espaços confirmados.
- Preloading CSS inline no index.html; temas Lara/Nora por import dinâmico no configurator:
  bundle inicial 1,46 → 1,25 MB (~257 KB gzip). Orçamento de 1 MB ainda avisa.

## 2026-10-04 — Etapa 6.2: telas fora do escopo desabilitadas

- Rotas e menu comentados com `/* DESABILITADO: fora do escopo atual ... */` em app.routes,
  pages.routes, administracao.routes e app.menu. Home KPI fictícia mantida (pedido do usuário);
  `/landing` redireciona ao login. Build ok; avisos de CSS geoespacial e quill sumiram.

## 2026-10-04 — Etapa 6.1: frontend copiado do datasync-gis

- `git archive` do GIS para `frontend/` (só arquivos versionados); nome `datasync-core-frontend`,
  environments sem URLs do Spatial (homol/prod vazios), Dockerfile com Node 24, AGENTS/README
  próprios, `LICENSE.md` da PrimeTek mantido; docs do GIS reduzidos a `docs/standards/patterns-frontend.md`.
- Angular 21 é a LTS mais recente (22 ativa) e o GIS já está nela. `npm ci` e `ng build` ok.
- Achados herdados: ESLint sem efeito (config inválida), 65 arquivos fora do Prettier, bundle acima do orçamento.

## 2026-10-04 — OrganizationViewSet independente com leitura autorizada

- Removida organizations do ContractViewSet. OrganizationViewSet herda base de
  leitura DRF com paginação/filter/options/schema; usa OrganizationSerializer.
- Registro no MESMO SchemaRouter de plans/contracts, conforme ajuste do usuário;
  rota /api/v1/admin/organizations/, filtro contract na lista (ADR 0032).
- Usuário comum usa accessible_organizations/RBAC, com contrato/perfis/atribuições/
  exceções; superadmin usa queryset global explícito. Sem header ativo, sem CRUD,
  somente organizações ativas de contextos permitidos. /me/organizations preservado.
- 68 testes dirigidos passaram após ajuste do router; suíte completa 507 passou.
  Permissões/IDOR, exclusões, inativos, contrato excluído, detalhe/options e query
  inválida testados. OWASP A01–A10 revisadas sem achados novos. Sem migrations.
- List/options: cinco SELECTs com perfil (três RBAC + COUNT/página) com 1/30 itens,
  sem writes/locks/N+1, campos mínimos e até 100 itens materializados. Sem JWT real
  ou ensaio de carga novo; contagem constante não certifica capacidade.
- Atualizados plano/ADR/índice, API administrativa/organizações, AGENTS/README,
  estilo/overview e memória/handoff. CRUD de gestão continua na 5.4.
## 2026-10-04 — Responses compartilhadas para actions customizadas

- Criado core/responses.py com build_result_response e build_exception_response.
  Actions options/schema seguem try/except como solicitado pelo usuário (ADR 0031).
- Sucesso mantém payload/status; erro exige request e delega ao handler RFC 9457:
  rollback, headers, request_id e logging sanitizado, sem mensagem privada da exceção.
- Testes: 44 dirigidos de responses/options/schema passaram; 507 na suíte completa
  incluindo a revisão de organizações ainda pendente de commit. Lint, formato,
  migrations e checks dev/produção passaram após corrigir formatação de um teste.
- OWASP A01–A10 revisadas, sem achados novos; helper sem consultas/escritas próprias,
  sem mudanças de coleta/retentivos/dependências. Docs/ADR/memória sincronizados.

## 2026-10-04 — Revisão 5.2: CRUD auditado nos serializers do DRF

- BaseModelSerializer/BaseAdminModelSerializer substituem ServiceModelSerializer:
  super().create/update, autoria explícita, hooks extras e auditoria atômica.
  SerializerDeleteMixin delega a delete() da base. Removidos BaseModelService,
  PlanService/ContractService e registry no AppConfig.ready (ADR 0030).
- Campos usam validação DRF; Contract.validate trata vigência, plano disponível e
  redução de licenças. Usuário dispensou full_clean genérico e model_validation_fields.
  Preservado audit_events multiline ajustado pelo usuário, com fmt off/on local.
- get_audit_contract_id fica na base: raiz Contract usa sua PK; demais registros
  usam contract_id quando existente. ContractSerializer não precisa sobrescrever.
- ATOMIC_REQUESTS e lock antes de validar update/delete na view; uso direto exige
  atomic envolvendo is_valid/save e recarrega estado atual com lock. FK histórica,
  contagem de inativos, isolamento e services próprios de users/RBAC preservados.
- Validador completo: 478 testes, lint/formato, migrations e checks dev/produção OK.
  Após três novos casos de hooks/rollback, rodada dirigida de 51 passou (481 no total).
  Sem migrations ou dependências novas. OWASP A01–A10 revisadas, sem achados novos.
  Leituras sem writes/locks e sem N+1; removidas consultas de full_clean, lock só no
  registro/plano recebido e contagem só na redução de licenças. Sem ensaio de carga novo.
- Documentação: backend/AGENTS/README/standards, overview, API administrativa,
  ADR/índice, plano, memória de arquitetura e handoff sincronizados.

## 2026-10-04 — Login: remoção do estilo de formulário da senha

- Removido `style={'input_type': 'password'}` de `LoginSerializer` em
  `backend/apps/users/serializers.py`, por solicitação do usuário.
- Mantidos `write_only=True` e `trim_whitespace=False`; contrato JSON e autenticação
  preservados. A máscara do formulário será responsabilidade do Angular.
- Validação dirigida: 41 testes de autenticação e lint do arquivo passaram.

## 2026-10-04 — Revisão 5.2: busca geral e filtros individuais

- search_fields do BaseFilterSet virou general_search_fields (padrão vazio);
  apps declaram name. Busca OR continua search/icontains, controles individuais AND.
  Lookup de filtro individual não muda o geral; overrides em general_search_lookups.
- Schema adiciona general_search separado de filters; parameter/label/fields com
  labels/lookups do model/FilterSet, null desabilita a busca. options não mudou.
- Somente texto e relações singulares diretas, sem conversões/regex/joins multivalorados.
  Metadata sem queries; busca preserva queryset com tenant e não grava dados.
- Validação: suíte completa 477 testes/checks OK; depois adicionado teste de rejeição
  de M2M, rodada dirigida final de 14 testes de filtros passou. Cobertura total 478.
  OR/AND, isolamento, lookup independente, override, configuração inválida e schema
  sem SQL cobertos. OWASP A01–A10 sem achados; busca administrativa mantém name e
  custo SQL anterior, sem certificado de carga novo; conformidade anterior preservada.
- Arquivos: core/constants/filters/mixins/tests, contracts/filters/tests,
  backend/AGENTS/README/style, API/overview/plano, ADR 0029 e memória/handoff.

## 2026-10-04 — Models: verbose_name explícito

- Usuário determinou usar verbose_name como argumento nomeado nos rótulos de todos
  os campos; convertidos argumentos posicionais nos models core/contracts/rbac/audit.
  Campos/labels/schema permanecem iguais; sem alteração de migrations.
- Padrão compacto/alinhado e limite de 120 preservados; modelos com campos longos
  foram quebrados onde necessário. Guia de estilo, exemplo e backend/AGENTS atualizados.
- Validação: suíte de 477 testes, lint/formato/migrations/checks OK no workspace.
  Sem alteração de SQL, permissões ou custos de runtime. Busca geral está em revisão
  no mesmo workspace e será fechada em commit próprio.

## 2026-10-04 — Revisão 5.2: querysets simples diretamente nas views

- Usuário determinou queries simples diretamente no queryset da view, sem selector wrapper.
  Removidas classes de selectors e SelectorQuerysetMixin; get_queryset padrão do DRF.
  Ordem nas views: queryset, serializer_class, filterset_class, demais configurações.
- Administração conserva unscoped explícito, inativos, soft delete e JOIN do plano;
  queryset construído sem SQL, clonado por requisição. Recursos de tenant continuam
  construindo querysets durante requisição, sem relaxar managers/contexto.
- Validação: 464 testes e checks/lint/formato/migrations OK. Cobertura existente
  verifica CRUD, inativos/excluídos, queries constantes/JOIN e isolamento/autorização.
  OWASP A01–A10 sem achados
  novos, nenhuma query/escrita/lock adicional; mesma conformidade anterior.
- Arquivos: contracts/selectors/views/tests, core/selectors/mixins/views/tests,
  backend/AGENTS/README/style, API/plano/overview, ADR 0028, memória/handoff.

## 2026-10-04 — Revisão 5.2: classes de selectors

- BaseModelSelector preserva o contexto do manager e aplica select_related declarado;
  BaseAdminModelSelector usa unscoped administrativo explícito. PlanSelector e
  ContractSelector substituem funções admin_plans/admin_contracts; JOIN do plano mantido.
- Views declaram selector_class, serializer_class, filterset_class e demais nessa
  ordem, por determinação do usuário. SelectorQuerysetMixin centraliza get_queryset.
- Validação: 468 testes, lint/formato/migrations/checks OK. Testes cobrem ausência
  de model/contexto, isolamento de tenant, inativos/soft delete, construção sem SQL
  e relação em uma query. OWASP A01–A10 sem achados novos; mesmas queries/locks,
  sem trabalho/escrita de leitura adicionais. Conformidade anterior preservada.
- Arquivos: core/selectors/mixins/tests, contracts/selectors/views,
  backend/AGENTS/README/style, API/plano/overview, ADR 0027 e memória/handoff.

## 2026-10-04 — Revisão 5.2: schemas automáticos por campos

- schema_columns/schema_filters agora contêm nomes de campos; TableSchemaMixin usa
  verbose_name/tipos do model, com schema_column_overrides/schema_filter_overrides
  por campo. Contract mantém label Início como exemplo; filtro is_active preservado.
- SchemaRouter relaciona models dos serializers às rotas options por basename;
  reverse resolve o namespace atual. Sem caminhos adivinhados, sem queries na
  geração/registro. Override explícito para relações fora do router.
- ordering_fields usa OrderingFilter do FilterSet; removida duplicação nas views.
  Campos continuam explícitos; filtros precisam existir no FilterSet. Configuração
  inválida falha, sem expor todos os campos automaticamente.
- Validação: 464 testes e checks/lint/formato/migrations OK. Metadados/URLs gerados
  com zero queries em teste; overrides, labels, tipos e erros de configuração cobertos.
  OWASP A01–A10 sem achados novos; mesmas permissões/consultas dos dados, sem writes,
  SQL ou novos custos por item de listagem. Conformidade anterior preservada.
- Arquivos: core/schema/routers/mixins/tests, contracts/views/urls/tests,
  backend/AGENTS/README/style, API/overview/plano, ADR 0026 e memória/handoff.

## 2026-10-04 — Revisão 5.2: service_class nos serializers

- Usuário aprovou declarar a classe do service em cada serializer, sem staticmethod.
  ServiceModelSerializer.create/update chamam service_class.save_instance com
  dados validados, ator explícito e instância na atualização. BaseModelService como
  padrão falha sem implementação; nenhum fallback para gravação direta no ORM.
- PlanSerializer/ContractSerializer declaram PlanService/ContractService. Regras,
  autorização, locks, auditoria e consultas não mudaram. OWASP A01–A10 revisada sem
  achados novos; performance sem consultas/escritas/custos de leitura adicionais.
- Validação: 454 testes e checks/lint/formato/migrations OK; cobertura existente de
  CRUD e serializer sem view preserva autoria, auditoria e negação de acesso.
- Arquivos: core/serializers, contracts/serializers, backend/AGENTS/README/style,
  API/plano/overview, ADR 0025, memória e handoff.

## 2026-10-04 — Revisão 5.2: classe base de services e exclusão herdada

- BaseModelService em core/services implementa delete_instance e define save_instance;
  autorização, lock por PK, estado anterior, soft delete e auditoria na mesma transação.
- PlanService/ContractService herdam BaseContractService, com contexto de sistema
  explícito, superadmin e auditoria próprios. Gravação migrou das funções para classes;
  serializers apontam save_service para save_instance. Views não declaram exclusão.
- AppConfig.ready registra as classes por model sem SQL. Ausência de registro/model
  incompatível falha antes da escrita; não existe fallback direto ao ORM.
- Validação: 454 testes, lint/formato, migrations e checks desenvolvimento/produção.
  Novos testes de negação direta pelo service e rollback de exclusão se auditoria
  falhar. OWASP A01–A10 sem achados novos; mesmo escopo/queries/locks de domínio,
  despacho em memória, sem escrita em leituras. Nenhuma nova decisão legal.
- Arquivos: core/services/views/mixins/tests, contracts/apps/services/serializers/
  views/tests, backend/AGENTS/README/style, API/overview/plano, ADR 0024 e memória/handoff.

## 2026-10-04 — Revisão 5.2: services em create/update dos serializers

- Usuário determinou gravar pelos serializers. ServiceModelSerializer em core
  delega create/update ao save_service declarado; views usam serializer.save()
  padrão do DRF, sem associação manual de serializer.instance ou service de gravação.
- Plan/ContractSerializer declaram save_service; views mantêm selector/delete_service.
  ServiceWriteMixin virou ServiceDeleteMixin; autoria vem do contexto do serializer,
  explicitamente passada ao service. Transações/locks/regras/auditoria preservados.
- Spatial verificado: view chama serializer.save(), BaseModelSerializer.create/update
  chama super (gravação padrão), sem service genérico nesses métodos. Core adapta
  o ciclo do DRF à arquitetura de services, sem copiar gravação direta.
- ADR 0023 e docs/AGENTS/plano atualizados. 448 testes, lint/formato/migrations/checks
  dev/produção aprovados; testes diretos do serializer provam regras/auditoria/autor.
  OWASP A01–A10 sem achados novos, queries 1/30 e zero writes em leitura preservados;
  sem dependências/migrations/dados pessoais novos ou alteração legal.

## 2026-10-04 — Revisão 5.2: django-filter como Spatial

- Usuário pediu django-filter. 26.2 verificado no PyPI oficial (Django 5.2/Python
  3.14, BSD-3), instalado em requirements/base e INSTALLED_APPS. pip check OK.
- BaseFilterSet/ValidatedDjangoFilterBackend em core/filters; FilterSets de planos,
  contratos e organizações em contracts/filters. View declara filterset_class;
  biblioteca aplica filtros/ordering lazy, entrada comum normalizada no backend.
- Geração automática de filtros acessa manager na importação e falha sem tenant:
  filtros explícitos, sem contornar o contexto. UUIDFilter para plano sem query de FK.
- Removidos filter_listing/AdminListQuerySerializer. Detalhes/options preservados,
  search/ordering/booleanos/UUIDs, offset exato, 422, limites e schema mantidos.
  Sem migrations, writes em leitura ou novas regras; ADR 0022/docs/memória atualizados.
- 446 testes, lint/formato/migrations/checks dev/produção passaram. OWASP A01–A10
  sem achados novos: listas permitidas, querysets preservados, ORM parametrizado,
  dependência/licença verificada e erros RFC 9457. Queries 1/30 itens constantes,
  duas consultas de dados e zero escritas; sem novo benchmark de capacidade.

## 2026-10-04 — Assinatura compacta de filter_listing

- Usuário pediu a declaração em uma linha: assinatura com 118 caracteres.
  first/rows recebidos na entrada validada são removidos dos filtros, pois a
  paginação já é responsável por eles. Resultado e validação de filtros preservados.
- 35 testes da API administrativa, lint e formato passaram; sem migrations.

## 2026-10-04 — Revisão 5.2: composição no core, como Spatial

- Usuário pediu bases no core, paginação e mixins (ADR 0021). core/views compõe
  BaseModelViewSet/BaseAdminModelViewSet; core/mixins concentra selector/write/
  filter/options/schema e TenantScopedViewMixin existente. SuperadminPermission
  movida para core/permissions; paginação first/rows em core/pagination.
- Filtro genérico lazy em core/selectors; serializers compartilhados Page/List.
  Contratos mantêm selectors de domínio e actions/configuração nas próprias views.
  Imports e docs atualizados; cabeçalho da base compacto/alinhado, conforme ajuste
  manual do usuário, protegido com fmt: off/on só nesse trecho.
- Sem mudar API/permissões/locks/auditoria/migrations. Testes adicionais confirmam
  offset não múltiplo da página e filtros da listagem sem interferir no detalhe.
- Validação: 442 testes passaram; lint, formato, migrations e checks dev/produção
  aprovados. O formato manual exigiu proteção local do cabeçalho; restante segue Ruff.
  OWASP A01–A10 sem achados novos; performance mantém duas consultas e zero escrita
  nas leituras, sem novo trabalho por item ou benchmark repetido sem necessidade.

## 2026-10-04 — Revisão 5.2: base das views administrativas

- Usuário pediu aplicar o reaproveitamento do Spatial. BaseAdminModelViewSet
  substitui AdminCatalogViewSet e centraliza get_queryset/perform_create/update/destroy.
  PlanViewSet/ContractViewSet declaram queryset_selector/save_service/delete_service
  como staticmethod; schema_filters declarado no recurso, sem isinstance na base.
- Sem alteração de API, queries, permissões, locks ou auditoria; regras continuam
  nos services, ações específicas na subclass. Convenção no guia Django/AGENTS.
- Validação: 440 testes, lint/formato, migrations e checks dev/produção OK.
  OWASP A01–A10 revisada sem novos achados; queries constantes/sem escritas nas
  leituras e teste de concorrência preservados. Sem novas decisões legais/dados.

## 2026-10-04 — Etapa 5.2: administração de planos e contratos

- CRUD em /api/v1/admin/plans e contracts, somente superadmin ativo, sem organização;
  serializers/selectors/services/permissions/views/urls em apps/contracts. Listas
  first/rows, busca por nome, filtros/ordenação permitidos, options/schema; ação de
  organizações ativas do contrato para entrada do superadmin, prevista na 3.5.
- Usuário aprovou impedir redução de licenças abaixo dos usuários não excluídos,
  contando inativos (ADR 0020). Atualização com estado atual/lock do contrato;
  teste de redução concorrente com cadastro garante ocupação <= licenças.
- Soft delete sem cascata/expurgo. Quotas continuam configuração. Planos excluídos
  não são selecionáveis; contrato histórico continua consultável/editável.
- Escritas auditadas atomicamente, configuração antes/depois sem nome de cliente;
  falha do AuditEvent desfaz alteração. audit.0005 aplicada localmente (seis escolhas).
  Leituras administrativas/options não gravam logs/eventos; duas queries de dados,
  constantes com 1/30 itens, JOIN do plano sem N+1.
- Medição exploratória local com JWT e 10 chamadas sequenciais: 30 contratos,
  medianas listagem/options 6,91/4,09 ms; 10 mil, 28,80/16,14 ms. EXPLAIN ANALYZE
  avaliado; não é carga concorrente/certificação de capacidade. Sem novos índices
  genéricos; reavaliar busca/contagem/offset conforme volumes reais.
- Validação: 440 testes; lint, formato, migrations/checks desenvolvimento/produção OK.
  OWASP A01–A10: sem novos achados, controles de acesso, ORM parametrizado, limites,
  falha fechada e auditoria revisados. Base legal/CDC: API de configuração interna,
  sem cobrança/aceite/assinatura, dependências/PII novos ou mudança de retenção.

## 2026-10-04 — Etapa 5.1: infraestrutura de opções

- LookupOptionsMixin em core/views, entrada em core/serializers, leitura em
  core/selectors e proteção :view em rbac/permissions. Sem rotas de produção,
  models, migrations ou dependências novas. Contrato em docs/api/options.md.
- UUID/rótulo somente; campos SQL explícitos, ordenação estável, busca por trecho,
  first/rows (20, máximo 100), UUID repetível limitado a 100. Resolução ignora q e
  inclui inativos; nunca excluídos/fora do contexto. Erros RFC 9457.
- Testes de isolamento contrato/organização, permissões adicionais, negação de
  manage/ausência de view, validação, paginação, inativos e relacionadas sem __str__.
- Performance: 1/30 itens, duas queries no selector, sete operações SQL no endpoint
  com force_authenticate, sem escritas. Sem benchmark de carga/JWT real; busca,
  COUNT e OFFSET exigem análise de volume/índices por recurso antes da publicação.
- Segurança OWASP A01–A10 revisada: escopo, permissão explícita, projeção mínima,
  ORM parametrizado, limites e falha fechada; sem achados novos. Base legal
  preservada, sem novos dados pessoais, retenções, terceiros ou telas.
- Validação completa: 407 testes passaram; lint, formato, migrations e checks
  de desenvolvimento/produção aprovados. Nenhuma migration necessária.

## 2026-10-04 — Revisão 4.1: autenticação seletiva e premissa global de performance

- Usuário aprovou seguir o Spatial: AccessLog só para login sucesso/falha e refresh
  sucesso. ADR 0019 substitui cobertura por requisição de 0018, sem afirmar que a lei
  exige apenas login ou que esta cobertura comprova conformidade. Validação jurídica pendente.
- Markers nas views, persistência síncrona no middleware fora da transação da view;
  falha sobrevive ao rollback. Refresh fornece o usuário validado, sem consulta extra.
  Sem username/token/senha; não gravar em consultas comuns, logout ou refresh recusado.
- audit.0004 aplicada localmente; action vazio no histórico, sem apagar/reclassificar.
  AuditEvent e entrada de superadmin preservados. Docs/plano/overview/memória sincronizados.
- Premissa forte GLOBAL de performance registrada em AGENTS e skills de trabalho/revisão:
  banco, locks, CPU, memória, tráfego e concorrência, com medição proporcional ao risco;
  contagem constante de queries não substitui avaliação de custo ou ensaio sob carga.
- 381 testes passaram, lint/formato/migrations/checks desenvolvimento/produção OK.
  Leitura comum com 1/30 chamadas sem INSERT; login 8, refresh 20, logout 13 queries,
  constantes com 1/30 usuários adicionais. Sem benchmark de capacidade/latência.

## 2026-10-04 — Etapa 4.1: registro de acesso

- ADR 0018; `AccessLog` em `apps/audit`, fora do BaseModel e dos tipos de escopo
  (`UNSCOPED_RECORDS`); só inserção; leitura só em `system_context()`.
- `AccessLogMiddleware` após a resposta (fora da transação da view); `client_address` com
  headers do proxy configuráveis e check de deploy (audit.W001/W002); login define o usuário.
- Testes de API passaram a precisar de banco; test_exceptions/test_urls transacionais
  (suíte ~40 s). Migration audit.0003 criada; aplicação local aguarda autorização.

## 2026-10-04 — Padrão de queries SQL escritas à mão

- `apps/<app>/queries/<nome>.py` com uma constante por arquivo; só o selector executa,
  com contrato/organização do contexto como parâmetros nomeados e teste de isolamento próprio.
  Documentado no guia de estilo e no `backend/AGENTS.md`. Nenhuma query criada ainda.
- Formato: `-- NOME` na 1ª linha; CTE (ou temporária `ON COMMIT DROP`) `parametros` com
  `contract`/`organization` (id interno, cast); tudo num `execute` (binding no cliente, testado);
  selector avança com `nextset()`. Funções do PostgreSQL: futuro command idempotente no deploy.
- `@tenant_params(organization=...)` injeta `tenant` do contexto (falha fechada) e `fetch_all`
  devolve dicts do último resultado; testados em `core/tests/test_raw_queries.py`. Nomes em inglês.

## 2026-10-04 — Organização dos módulos dos apps

- `audit/managers.py`; `rbac/utils.py` (`required_permission`, `access_evaluation`);
  `audit/utils.snapshot` genérico (rbac mantém `AUDIT_FIELDS` por label).
- `constants.py` em core, users, rbac e audit (só literais). Exceções técnicas documentadas
  no guia de estilo. `'contract_admin'` substituído por `ESSENTIAL_PROFILE_KEY` no código.
- `users/services.py` mantém gestão de usuário e tokens juntos (decisão do usuário).

## 2026-10-04 — Organização dos módulos do core

- `core/managers.py` (querysets/managers), `core/utils.py` (`scope_filter`, `context_values`),
  `core/problems.py` (respostas RFC 9457 e `exception_handler`), `api_not_found` em `core/views.py`.
  `exceptions.py` só com classes; `models.py` só com models. Sem mudança de comportamento.

## 2026-10-04 — Etapa 2.5: testes de isolamento genéricos

- `apps/core/tests/test_isolation.py`: cobertura obrigatória (FACTORIES/SHARED), outro contrato,
  outra organização, Hybrid, fail closed e Shared; 30 testes. Mutação confirmou detecção.
- Migrations só de estado da 2.4 aplicadas ao banco local (autorizado).

## 2026-10-04 — Etapa 2.4: proteção em camadas B a E

- `apps/core/tenancy.py` (contextvar, middleware, `system_context`, `@system_scope`);
  `ScopedManagerMixin` em `objects`/`all_objects` de todos os models (incl. User, Contract,
  AuditEvent); `scope_filter` por tipo; manager base `_base_objects`.
- Contexto preenchido por `bind_user` (classes de permissão) e `resolve_organization`.
- Services de integridade e de autenticação em `@system_scope` (o SimpleJWT usa `User.objects`).
- `TenantScopedViewMixin` (D) e `ScopedModelSerializer`/`PublicIdRelatedField` (E).
- App só de testes `apps/core/tests/scoping` (com migration, senão quebra as FKs no test DB).
- Migrations só de estado (troca do manager base): contracts.0002, rbac.0003, users.0003, audit.0002.
- ADR 0007 anotado (managers com escopo). 324 testes.

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
