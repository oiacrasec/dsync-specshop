# Handoff

- **Atualizado em:** 2026-10-31 18:20
- **Agente:** Claude → Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Último commit:** da38906 feat(frontend): show the organization search from six organizations

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 9.4 MFA TOTP — ✅ concluída e commitada; ajustes de UI/segurança da sessão também commitados |
| Próximo passo exato | Nenhum em andamento. Perguntar ao usuário: conferência visual pendente ou iniciar 9.5 (Meu acesso) |
| Aguardando o usuário? | sim — escolher o próximo trabalho; conferir no navegador as telas listadas abaixo |

## Feito nesta sessão (todos commitados, sem push; af7f843..da38906)

- MFA (9.4) commitado; 401 no logout corrigido (outlet "sem menu" exige sessão).
- Segurança: 2º passo derruba provas após 10 falhas seguidas e conta no bloqueio do login;
  ativar MFA exige senha atual (`MfaConfirmSerializer`). ADR 0041 revisado.
- Layouts aprovados no FigCraft e aplicados: login, 2º passo, aba Perfil › Verificação em
  duas etapas (4 estados), barra única de busca/filtros (`ui-filter`).
- Nome configurável: `environment.appName/companyName` (token `APP_BRAND`) e
  `DJANGO_APP_NAME`; padrão Dsync CORE / DsyncLabs. Nome do repositório não muda.
- URN de erros agora `urn:dsync:problem:*` (revisão no ADR 0004; core sem consumidores).
- Filtros booleanos com o mesmo rótulo da grade (is_active → Situação: Ativo/Inativo).
- Listas: 10 por página (API segue padrão 20); contagem global "N registros" à direita,
  mesmo estilo do relatório da paginação.
- Seletor de organização: busca a partir de 6 (junto com a rolagem da lista de 350 px).
- FigCraft limpo: propostas superadas e capturas "antes" removidas; páginas Login,
  Filtros avançados e Perfil · Verificação em duas etapas; biblioteca com contagem nova.

## Falta / pendências

- Conferência visual no navegador (extensão do Chrome estava desconectada): login, aba do
  MFA no Perfil, barra de filtros, contagem/paginação, seletor de organização.
- 20 perfis mock ZZ-01..ZZ-20 no contrato CLIENTE X (banco local, criados via
  `save_profile`, auditados): apagar quando o usuário pedir.

## Validação (último estado)

- Backend 758 testes, ruff, OpenAPI validate/fail-on-warn. Frontend 136 testes, lint,
  format:check, build.

## Avisos

- Não imprimir/versionar .env, chave MFA, segredos, provas ou reservas.
- Python: /home/cesar/Virtual/datasync-core-3.14/bin/python. Após subconjuntos de testes,
  suíte completa com `pytest --reuse-db --create-db`.
- Push só quando pedido; nunca --amend na main; usuário revisa o diff antes de cada commit.
- FigCraft: app aberto com `figcraft --control 7710` (MCP usa `--attach 7710`); se o MCP
  não conectar, o app não está aberto. Arquivos em design/; salvar após editar.

## Próximas etapas (não iniciar sem aprovação)

- 9.5 Meu acesso; 5.3 superadmins/admins adicionais; suporte do superadmin por organização.
- Produção: HTTPS/CSP, cache compartilhado/borda, recuperação, expurgo/LegalHold e infraestrutura.
- npm audit adiado; não reativar telas DESABILITADO sem aprovação. 9.1–9.4 concluídas.
