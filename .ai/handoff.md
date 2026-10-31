# Handoff

- **Atualizado em:** 2026-10-31 18:41
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Commit da etapa:** feat(users): add read-only personal permissions tab (este handoff integra o commit; hash em `git log -1`)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 9.5 Minhas permissões — ✅ concluída; resultado e commit autorizados pelo usuário |
| Próximo passo exato | Aguardar usuário definir próxima prioridade; 5.3 depende da decisão sobre acesso total do superadmin |
| Aguardando o usuário? | sim — próxima etapa, sem pendência na 9.5 |

## Entregue na 9.5

- Decisões 89–92: aba antes de Sessões, só leitura, organizações acessíveis,
  ativa aberta/destacada, perfis e ações concedidas. Superadmin não vê a aba.
- FigCraft: dois estados salvos/aprovados; administrador com aviso de todas as
  permissões, inclusive futuras, sem repetir a grade. Código usa rótulos do catálogo.
- GET /api/v1/me/access/ sem header, só próprio usuário; concessões carregadas
  uma vez e evaluate compartilhado, 4 SELECTs de dados; sem perfis atribuíveis.
- Superadmin recebe 403 permission-denied antes de consultar concessões; demais
  permissões do superadmin preservadas. Proteção coberta por teste.
- Frontend: componente my-permissions carregado na primeira abertura; acordeões
  nativos, carga/vazio/erro com nova tentativa, consulta cancelada na saída.
- 769 testes backend/143 frontend passaram; ruff check/format, lint, format:check,
  build, OpenAPI validate/fail-on-warn, migrations check, check e check --deploy passaram.
- Validador por comandos equivalentes com SDK do PyCharm (.venv não existe).
  Suíte backend completa: --reuse-db --create-db.
- OWASP A01–A10 sem achados pendentes no diff; leitura sem escrita/locks e queries
  constantes com 30 organizações/perfis adicionais. Cálculo/resposta crescem com o retrato.
- Chrome com API simulada: desktop/320 px dos dois estados, sem overflow horizontal;
  abertura por Enter. Imagens /tmp/datasync-95-{common,admin}-{desktop,mobile}.png.
- Docs/API/OpenAPI/overview/READMEs/memória atualizados; sem migration/dependência nova.

## Limites / avisos

- Sem auditoria WCAG completa, E2E com API real ou ensaio de capacidade em produção.
- Não imprimir/versionar .env, chave MFA, segredos, provas ou reservas.
- Python: /home/cesar/Virtual/datasync-core-3.14/bin/python (consultar SDK PyCharm).
- Push só quando pedido; nunca --amend na main; usuário revisa diff antes de cada commit.
- FigCraft: --control 7710; MCP --attach 7710. Salvar após editar.
- 20 perfis mock ZZ-01..ZZ-20 no CLIENTE X local: apagar só quando pedido.
- Conferência visual anterior (login/MFA/filtros/contagem/seletor com API real) pendente.
- 9.1–9.5 concluídas. Não iniciar 5.3 sem decisão sobre acesso total do superadmin.
- Produção: HTTPS/CSP, cache compartilhado/borda, recuperação, expurgo/LegalHold e infra.
- npm audit adiado; não reativar telas DESABILITADO sem aprovação.
