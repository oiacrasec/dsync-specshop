# Handoff

- **Atualizado em:** 2026-10-31 13:26
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md (Blocos 7 e 8 concluídos)
- **Commit desta entrega:** `feat(frontend): improve organization selection and switching` (hash em `git log -1`)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | Melhoria da seleção/troca de organização implementada; 9.4 2FA permanece não iniciada |
| Próximo passo exato | Escolher o próximo bloco; 9.4 2FA já desenhada, ainda não iniciada |
| Aguardando o usuário? | sim — escolha do próximo trabalho; commit desta entrega autorizado |

## Troca de organização (concluída e aprovada)

- Avatar: `_topbar.scss` agora estiliza também `button.right-sidebar-button`,
  restaurando cursor pointer/hover/foco perdidos na troca de link por botão.
  Assert de cursor adicionado ao teste existente do topo.

- Regressão IM03 corrigida: p-dialog movido para fora do flex `.layout-topbar`.
  O host fechado ocupava uma terceira posição no space-between e deslocava os ícones.
  Chrome: margem direita de 14 px em 390/1280/1920 px; estável aberto/fechado/após Esc.
  Teste de geometria adicionado em `pages/auth/auth-pages.spec.ts`.

- Ajuste posterior pedido pelo usuário: botão com rótulo fixo **Entrar**, sem o nome
  da organização, aplicado no frontend e nos seis botões das propostas do FigCraft.

- Usuário aprovou os desenhos, inclusive 100 organizações, e pediu aplicar.
- `frontend/src/app/shared/ui/organization-picker/`: cartões/rádios, Atual no modal,
  busca local acima de 7 (nomes normalizados por carregamento), seleção preservada,
  vazio com Limpar e lista até 350 px; busca/ações fora da rolagem.
- `pages/auth/contexto-selecao.ts` usa o componente; `src/app.routes.ts` move a seleção
  para AuthLayout sem menu. Guards/audiência comum e entrada direta com organização única mantidos.
- `layout/components/app.topbar.ts`: p-dialog no avatar sem navegar; Cancelar/X/Esc
  preservam contexto/URL e devolvem foco ao avatar. Confirmação usa setActiveContext/openContext
  (ADR 0035); confirmar a já ativa apenas fecha. Superadmin não troca.
- Uma chamada por abertura; destroy cancela HTTP, revisão da sessão ignora resposta antiga.
  Nenhum endpoint/backend/dependência/configuração de ambiente alterado.
- 120 testes ChromeHeadless; lint, formato e build passando. Revisão OWASP A01–A10/performance:
  sem novos achados no escopo. Bundle inicial ~1,29 MB. Docs, plano e memória atualizados.
- Chrome com API simulada: desktop 1280×900 e login 320×800 sem overflow horizontal,
  lista de 350 px, busca e Esc/foco. Sem E2E com banco real/auditoria WCAG completa.
- Resultado revisado pelo usuário e commit autorizado; código, desenhos e documentação
  reunidos nesta entrega. Nenhum push solicitado ou realizado.
- `design/datasync-core-telas.figcraft`: páginas **Troca de organização** (login/modal)
  e **Troca · 100 organizações** (lista/busca/vazio/login; busca em estados simulados).
  Salvo via MCP anexado (7710); não encerrar/sobrescrever janela desnecessariamente.

## Como trabalhar no FigCraft (MCP pode estar desconectado)

- Sem janela: `figcraft-cli run <script.json> --in/--out <arquivo> --automation-read-root design/ --automation-read-root
  <pasta do script> --automation-write-root design/`. Fechar o app (`pkill -x figcraft`) antes de editar o arquivo.
- Biblioteca: publicar com `library.publish` e aceitar no arquivo de telas com `library.acceptUpdates`;
  reexportar `design/tokens.json` (`variable.export`). Ver `design/README.md`.

## Design system (`design/`, ADR 0040 Aceito; tudo abaixo já commitado)

- Arquivos em `design/`: `datasync-ds.figcraft` (biblioteca v1), `datasync-core-telas.figcraft`
  (vínculo com a biblioteca refeito para `design/`), `tokens.json`, `README.md`. Abrir/editar e
  procedimento de publicação no README. `~/FigmaProjects` ficou como cópia antiga (não usar).
- FigCraft precisa ser reaberto com roots em `design/` para o MCP editar ali.
- Melhorias da lista de Organizações, aprovadas pelo usuário ("a proposta está muito melhor"),
  valem para todas as listas, na ordem:
  1. Texto suave (`surface-500`, 2,7:1) → `surface-700` (4,5:1); sobre o fundo da página, `surface-800`+.
  2. "Novo …" com `severity="secondary"` → primário nas 11 listas (sem decisão registrada contra).
  3. Coluna booleana → `boolean-tag` (já existe no `ui-table`, sem uso; mapear em `core/utils/table-schema.ts`).
  4. Paginação só com mais de uma página (senão a contagem); "Limpar" só com filtro ativo.
  5. Situação 160 px e Ações 96 px fixas; realce da linha no hover. 6. Ações 40 × 40 px.
  7. Organização ativa em 2 linhas no topo. 8. ☰ para recolher o menu; trilha legível.
- Decidido e aplicado no frontend (2026-10-31): primária azul 600; as 8 melhorias de Organizações em todas
  as listas e na estrutura; placeholder surface-600. Mantidos por decisão: trilha em cartão com ícone,
  nome da organização inteiro (API não separa o contrato), busca e avisos no topo.
- Poseidon offline (caminho A, aprovado): recriar do código em `frontend/`, nunca copiar o site.
  Parte 1 ✅ (biblioteca v3): ícones, página Layout, padrão Página · estrutura. Parte 2 ✅ (v4): select,
  multiselect, data + calendário, menu de ações, diálogo de confirmação, variantes do Botão. Parte 3 ✅ (v5): Lista com
  ações, Lista vazia, Formulário · cadastro, Confirmação de exclusão (página Padrões). Edição sem janela: `figcraft-cli run <script> --in/--out` com
  `--automation-read-root design/ e a pasta do script` (MCP desconectado nesta sessão).
- Planejado: `codeConnect` + `figcraft.connect.json`; telas Login e Perfil; slot na célula da Tabela;
  logo para o modo escuro (`logo-white.svg` ausente); ponto vermelho do sino; corrigir
  (`'março'` já corrigido no app).

## Concluído

0.1–0.3 · 1.1–1.2 · 2.1–2.5 · 3.1–3.6 · 4.1 · 5.1–5.2 · 5.4 (via Blocos 7–8) · 6.1–6.8 · 7.1–7.4 ·
8.1–8.5.

## Desenho da 9.4 (2FA TOTP, decisões 73–75, 86–87)

Dependências: `pyotp` 2.10.0 (MIT) e `cryptography` (Apache/BSD); frontend `qrcode` 1.5.4 (MIT).
Conferir versões ≥ 2 semanas na hora de instalar.

| Peça | Desenho |
|---|---|
| `UserMfa` (1:1 usuário) | segredo cifrado (Fernet, `DJANGO_MFA_ENCRYPTION_KEY`), `confirmed`, `last_t`, falhas + horário da última |
| `UserRecoveryCode` | hash HMAC-SHA256 de cada um dos 10 códigos; apagado ao usar |
| `apps/users/mfa.py` | classe: gera segredo, link `otpauth://`, verifica com `select_for_update`, espera crescente 1, 2, 4, 8 s… com teto, antirreuso por `last_t`, consome código reserva; crédito ao django-otp |
| Ativar | `POST /me/mfa/setup/` (segredo pendente + QR) → `POST /me/mfa/enable/` (código) → 10 códigos uma vez |
| Login | `POST /auth/login/` com 2FA → `mfa_required` + token temporário de 5 min; `POST /auth/login/mfa/` (código ou reserva) → tokens + sessão 9.3 |
| Desativar | senha + código; regenerar códigos com código |
| Reset por admin | admin do contrato → usuários comuns do contrato; superadmin → admins do contrato; superadmin ↔ superadmin por comando até a 5.3; auditado |
| Frontend | aba "Verificação em duas etapas" no Perfil (QR, confirmar, códigos); 2º passo na tela de login; ação "Redefinir 2FA" em Usuários e em Admins do contrato |

Fonte da análise: django-otp 1.7.5 (`TOTPDevice.verify_token`, `ThrottlingMixin`, `StaticToken`):
segredo em hex legível, códigos reserva legíveis e verificação sem lock de linha (os três
corrigidos aqui); login por sessão (não serve, usamos JWT).

## Pendências (para escolher o próximo bloco)

| Item | O que falta | Origem |
|---|---|---|
| **9 Perfil do usuário** (decisões 69–75) | 9.1 mídia → 9.2 foto/nome/fuso → 9.3 senha/sessões → 9.4 2FA TOTP → 9.5 meu acesso (ver plano) | usuário |
| 5.3 Admin de usuários | CRUD de superadmins na área admin (auditar criação e mudança de `is_superuser`); admins adicionais de um contrato pelo superadmin (6.6 cria só o 1º; 6.7 lista e reseta) | ADR 0010 |
| Suporte do superadmin | entrar numa organização de cliente (contrato → organização), com auditoria | ADR 0037 §5, decisão 49 |
| Antes de produção | MFA do superadmin; HTTPS/CSP; cache compartilhado/borda; expurgo pós-contrato | ADRs 0010, 0035 |
| Frontend | `npm audit` (88 vulns, adiado); itens "Perfil" e "Agenda" do avatar sem ação; telas DESABILITADO (setores, geoespacial) | handoff |
| Repositório | push para o remoto (só quando pedido) | — |

- 6.6–6.8: provisionamento (409 contract-not-provisionable), admins/reset (refresh trava
  usuário → token), frontend de contratos no Core. audit.0007/0008 aplicadas ao banco local.
- Após a 6.8 (com push): schema com `type` semântico nas colunas; LOCALE_ID pt-BR e `shortDate`;
  adaptador `core/utils/table-schema.ts` + `BaseCrudService.listTable/lookupOptions`; `serverUrl`;
  topbar mobile; card centralizado sem menu; entrada direta com organização única; open redirect
  corrigido (`safeReturnPath`); "Limpar" zera ordenação e ícones.
- 7.1/decisões 45–49: organizações só na área do cliente; `/admin/organizations/` removida (404);
  `organization:view/create/update/delete` não reservadas (`create` em qualquer escopo desde a 62);
  `view` em qualquer escopo lista o contrato inteiro; suporte do superadmin adiado.

- 8.2/8.3: perfis do cliente + catálogo `/permissions/`; aba Permissões do usuário
  (`GET/PUT /users/{id}/access/`, perfil vinculado, "Todas as organizações" = CONTRACT com exceções,
  Salvar único). Admin do contrato = perfil essencial aplicado pelo seletor (decisão 63).
  8.4: exceção de permissão na atribuição (ADR 0038, decisão 64): caixas livres, perfil vinculado.
  `organization:create` em qualquer escopo (62). Formulários com aba Principal (61).
  Usuários/perfis/atribuições continuam reservados (decisão 54 mantida em 2026-10-19).
- Mídia só pela fachada `apps.core.media` (decisão 79): `MediaFileField`/`MediaImageField`; teste-trava.
- 9.3 (decisões 83–85): `UserSession` + claim `sid`; aba Sessões só leitura (ativas + 20 logins);
  rotas de encerrar prontas na API. Bases `BaseAPIView`/`BaseSerializer` obrigatórias (decisão 82).
- 9.2 (decisões 77, 80, 81): `/perfil` (Principal + Senha; sem Voltar/Cancelar), `GET/PUT /me/profile/`
  multipart, foto em `<public_id do contrato|system>/avatars/`, fuso nas colunas datetime (`zonedDate`),
  `ui-image-preview` (p-dialog no body com girar/zoom/espelhar/baixar). Pastas vazias somem no filesystem.
- 9.1 (decisões 69–75, ADR 0039): `DJANGO_MEDIA_STORAGE=filesystem|s3` em `config/storage.py`;
  URL assinada `/api/v1/media/<token>/` (filesystem) ou pre-signed (S3); mídia sempre privada.
- 5.5 (decisões 67–68): `/api/v1/schema/` + `docs/api/openapi-v1.yaml` (regenerar a cada mudança
  de API; teste acusa divergência); Swagger UI no frontend `/documentacoes/api`.
- 8.5 (decisões 65–66): tela `/configuracoes` (menu do avatar); aparência no usuário
  (`/me/preferences/`, `users.0005`); `ThemeService` substitui o configurador do template.

## Dúvidas abertas

- Nenhuma. 7.3 decidida (50–53): código em qualquer escopo vale no contrato todo; em uso 409;
  última ativa 409; nome único 422. audit.0009 aplicada ao banco local com autorização.

## Avisos

- validar.sh procura `.venv` na raiz; o venv local é `~/Virtual/datasync-core-3.14`.
  Usuário pediu para não mexer em config/docs de ambiente: rodar os passos à mão.
- Commits só após revisão do usuário; nunca `--amend` na main (ajuste = commit novo).
- Regras do frontend em `frontend/AGENTS.md`: reuso antes de tela, URLs só via API_BASE_URL,
  tipo semântico + LOCALE_ID, ids validados/codificados, `safeReturnPath`.
- Não reativar telas DESABILITADO sem aprovação (a 7.4 reativa organizações, aprovada).
- Home virou `/dashboards` em branco (KPI removida a pedido); `pages/dashboards/` é arquivo do projeto (ADR 0036).
- JWT localStorage (ADR 0035); HTTPS/CSP, cache compartilhado/borda/MFA e expurgo antes de produção.
- Font Awesome Free 7.3.1 por classe (atribuição CC BY no README do frontend); orçamento de aviso 2 MB.
- npm audit (88 vulns) adiado pelo usuário até o front ficar mais redondo. Push só quando pedido.
