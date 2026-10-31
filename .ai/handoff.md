# Handoff

- **Atualizado em:** 2026-10-31 18:30
- **Agente:** Claude → Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Último commit:** ver `git log -3` (handoff e proposta 9.5 commitados juntos)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 9.5 Minhas permissões — 🔄 em andamento (só decisões e proposta visual; nenhum código) |
| Próximo passo exato | Terminar a proposta no FigCraft (estado 2: administrador do contrato) e pedir aprovação; só então backend + frontend |
| Aguardando o usuário? | sim — aprovação da proposta visual da 9.5 |

## Decisões da 9.5 (plano, decisões 89–90)

- Aba **Minhas permissões** no Perfil, **antes de Sessões**; somente leitura.
- Mostra **todas as organizações** do usuário (a ativa em destaque/aberta), com perfis e
  permissões efetivas de cada uma.
- **Superadmin não vê a aba** por ora; o acesso total do superadmin está em reavaliação pelo
  usuário — não mudar nada nisso até ele decidir.

## Feito

- FigCraft `design/datasync-core-telas.figcraft`, página **Perfil · Minhas permissões**:
  estado 1 (usuário com 2 organizações): abas com a nova antes de Sessões; orientação
  "Somente leitura. Para mudar…, fale com o administrador do contrato"; organização ativa
  aberta (ícone, nome, tag Atual, resumo "N recursos · N permissões", perfis em chips,
  tabela recurso → ações concedidas com ✓); outra organização recolhida (acordeão).

## Falta

- FigCraft: estado 2 (administrador do contrato: aviso de acesso a todas as permissões do
  contrato, sem listar código a código?) — confirmar com o usuário; ordenar ações como
  Ver · Criar · Editar e recursos como Organizações · Usuários · Perfis no estado 1.
- Backend (após aprovação): endpoint só leitura do próprio usuário, ex. `GET /api/v1/me/access/`,
  sem header de organização. Reusar `rbac.evaluation.evaluate(grants, organization, registry)`
  por organização em memória (concessões carregadas uma vez → queries constantes); não
  expor perfis não atribuídos (diferente de `user_access`, que é da tela do admin). 403/404
  para superadmin ou ocultar no frontend (decidir junto). Rótulos vêm de `/permissions/`.
  Testes de isolamento, custo constante com N organizações, OpenAPI, docs/api, ADR se preciso.
- Frontend: aba em `pages/perfil` (componente próprio, carregado sob demanda como Sessões),
  oculta para `is_superuser`; testes.

## Avisos

- Não imprimir/versionar .env, chave MFA, segredos, provas ou reservas.
- Python: /home/cesar/Virtual/datasync-core-3.14/bin/python. Após subconjuntos de testes,
  suíte completa com `pytest --reuse-db --create-db`.
- Push só quando pedido; nunca --amend na main; usuário revisa o diff antes de cada commit.
- FigCraft: app aberto com `figcraft --control 7710` (MCP usa `--attach 7710`); se o MCP
  não conectar, o app não está aberto. Salvar após editar.
- 20 perfis mock ZZ-01..ZZ-20 no CLIENTE X (banco local): apagar quando o usuário pedir.
- Conferência visual no navegador ainda pendente: login, aba MFA, filtros, contagem/paginação,
  seletor de organização (extensão do Chrome estava desconectada).

## Próximas etapas (não iniciar sem aprovação)

- 5.3 superadmins/admins adicionais (aguarda decisão sobre o acesso total do superadmin).
- Produção: HTTPS/CSP, cache compartilhado/borda, recuperação, expurgo/LegalHold e infraestrutura.
- npm audit adiado; não reativar telas DESABILITADO sem aprovação. 9.1–9.4 concluídas.
