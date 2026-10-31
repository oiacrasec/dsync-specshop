# Handoff

- **Atualizado em:** 2026-10-31 18:52
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Commit da etapa 9.5:** b54a38b feat(users): add read-only personal permissions tab

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 9.5 Minhas permissões — ✅ concluída; resultado e commit autorizados pelo usuário |
| Próximo passo exato | Prioridade 1: analisar e corrigir segurança das dependências. Depois, prioridade 2: alinhar e estruturar deploy em VPS / servidor local (decisões 94–95) |
| Aguardando o usuário? | Sem pergunta pendente sobre quantidade de projetos: VPS comportará 1 ou N; banco sempre em outra VPS. Dependências ainda sem alteração; deploy por alinhar antes de implementar |

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
- 9.1–9.5 concluídas. 5.3 e revisão do acesso total do superadmin paralisadas:
  não retomar nem propor sua retomada até solicitação explícita do usuário (decisão 93).
- Produção: HTTPS/CSP, cache compartilhado/borda, recuperação, expurgo/LegalHold e infra.
- npm audit retomado a pedido: 101 pacotes sinalizados (5 critical, 48 high,
  46 moderate, 2 low), incluindo desenvolvimento/transitivas; impacto real ainda a avaliar.
  Relatório: /tmp/datasync-npm-audit-public.json. Nenhuma dependência alterada.
- Docker: frontend tem Dockerfile/Nginx; backend e composição da implantação faltam.
  VPS/servidor local deve comportar 1 ou N projetos derivados; banco sempre em outra
  VPS. Alinhar estrutura antes de implementar (95). Retenção segue ADR 0007.
- Não reativar telas DESABILITADO sem aprovação.
