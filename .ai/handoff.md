# Handoff

- **Atualizado em:** 2026-10-31 19:13
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-2-seguranca-dependencias.md
- **Commit deste lote:** fix(deps): update Angular LTS and Pillow security releases (este handoff integra o commit; hash em `git log -1`)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 2.1 🔄 primeiro lote validado com commit autorizado; 2.2 backend ✅ concluída |
| Próximo passo exato | Usuário decidir Quill: remover (recomendado), manter com alerta ou avaliar 2.0.2. Depois avaliar lote compatível para moderadas de ferramentas |
| Aguardando o usuário? | sim — pergunta assíncrona sobre Quill ainda sem resposta; não mudar essa dependência sem decisão |

## Implementado / validado

- Escopo frontend + backend aprovado. Deploy é prioridade seguinte, por alinhar.
- Angular 21.2.25 LTS, CLI/build 21.2.29, CDK 21.2.14 e PostCSS 8.5.32.
  Mínimos corrigidos em package.json, lockfile novo resolvido em temporário,
  preservando demais bibliotecas diretas; npm ci --ignore-scripts e npm ls passaram.
- `primeclt` herdada sem uso removida, incluindo dependências transitivas.
- npm audit completo 101 → 48: zero críticas/altas, 47 moderadas e 1 baixa.
  Produção (--omit=dev) 21 → 1 baixa: Quill 2.0.3 no CMS desabilitado.
- Moderadas: glob/minimatch/uuid de ferramentas (lint/build/teste). Correções de major
  fora das faixas dos dependentes; nenhum override global nem downgrade forçado aplicado.
- Pillow 12.3.0 → 13.0.0 (MIT-CMU); API de mídia revisada. pip-audit no SDK:
  39 avisos em Pillow → zero; requirements produção + desenvolvimento resolvidos: zero.
  Gunicorn/WhiteNoise ausentes no SDK, cobertos pela auditoria de requirements.
- pip-audit 2.10.1 e dependências só em /tmp/datasync-pip-audit-tool (não no SDK).
- 143 testes frontend, lint, formato e build; 769 backend, pip check, ruff check/format,
  migrations check, check e check --deploy passaram. Sem migration ou código de produto novo.
- Bundle inicial ~1,30 → 1,31 MB (269,76 → 272,20 kB estimados). Sem novas queries,
  escritas/locks; sem ensaio de carga. Licenças alteradas revisadas, sem AGPL/GPL/ausentes.
- OWASP A01–A10 revisado; A03 tem pendências explícitas, npm audit ainda sai com código 1.
- Relatório: docs/security/dependencies.md. READMEs, inventário de dependências,
  overview, plano e memória atualizados. Usuário autorizou commit do lote mantendo
  as 48 pendências documentadas; sem decisão nova sobre Quill.

## Cuidados / próximas frentes

- Não ocultar avisos de auditoria nem afirmar que ferramentas estão seguras.
  Minimatch: npm sinaliza <11.0.1; texto do mantenedor cita 10.2.6. Alcance aberto.
- Relatórios em /tmp/datasync-{npm-audit-*,python-audit-*}.json; comandos no relatório versionável.
- Sem auditoria WCAG completa/E2E com API real/capacidade em produção neste lote.
- Python do SDK: /home/cesar/Virtual/datasync-core-3.14/bin/python; consultar PyCharm
  antes de cada comando. Após subconjuntos, suíte completa --reuse-db --create-db.
- Não imprimir/versionar .env, chave MFA, segredos, provas ou reservas.
- Usuário revisa diff antes de commit; push só quando pedido; nunca --amend na main.
- 9.1–9.5 concluídas (b54a38b). 5.3 e revisão do superadmin paralisadas até pedido explícito.
- Deploy: VPS/servidor local para 1 ou N projetos derivados, banco sempre em outra VPS;
  alinhar estrutura Docker antes de implementar (decisões 94–95 da Entrega 1).
- Produção também tem retenção/expurgo/LegalHold (ADR 0007), HTTPS/CSP, cache/borda e recuperação.
- Conferência visual anterior de login/MFA/filtros/contagem/seletor com API real pendente.
- FigCraft --control 7710 / MCP --attach 7710. Salvar após editar.
- 20 perfis mock ZZ-01..ZZ-20 no CLIENTE X local: apagar só quando pedido.
- Não reativar telas DESABILITADO sem aprovação.
- backend/package-lock.json vazio surgiu durante a sessão: preservado fora do commit
  por não pertencer ao backend Python. Não apagar sem solicitação.
