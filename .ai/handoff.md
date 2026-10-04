# Handoff

- **Atualizado em:** 2026-10-04
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Última alteração:** `perf(audit): limit access logs to authentication events` (este handoff entra no commit; consultar git log -1)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | revisão 4.1 — ✅ concluída, cobertura aprovada no ADR 0019 |
| Próximo passo exato | 5.1: mixin options conforme ADR 0011, após confirmação |
| Aguardando o usuário? | sim — confirmar início da 5.1 |

## Concluído

0.1 · 0.2 · 1.1 · 0.3 · 1.2 · 2.1 · 2.2 · 3.1–3.6 · 2.3–2.5 · 4.1 e sua revisão.

- Usuário aprovou seguir cobertura do Spatial: login sucesso/falha e refresh sucesso.
  Consultas comuns não gravam AccessLog; logout/refresh recusado/payload inválido/
  throttle antes da tentativa não geram esse registro. Logging técnico de erros mantido.
- Views marcam eventos; middleware persiste fora da transação, antes de devolver a
  resposta. Falha de login sobrevive ao rollback. Sucesso reutiliza usuário validado;
  sem consulta adicional, credenciais, username digitado ou conta presumida na falha.
- Migration audit.0004 aplicada localmente: action, histórico anterior vazio sem
  reclassificar/apagar dados. AuditEvent e entrada de superadmin preservados.
- Premissa forte GLOBAL do usuário registrada em AGENTS, modo-de-trabalho e revisão
  de performance: queries/escritas/locks/CPU/memória/rede/concorrência; medir conforme
  risco, não aceitar gargalos graves conhecidos. Queries constantes não bastam.
- Validação: 381 testes, lint, formato, migrations e checks desenvolvimento/produção.
  Zero INSERT na leitura comum com 1/30 chamadas; auth constante com 1/30 usuários:
  login 8, refresh 20, logout 13 queries. Sem benchmark de capacidade/latência.
- Revisão OWASP A01–A10: auth/permissões/rollback preservados, sem novos segredos,
  dependências ou SQL manual; A09 registra falha/sucesso selecionados e AuditEvent.
  Erros RFC 9457 preservados. Sem novos achados no diff; pendências de produção abaixo.
- Legal: ADR 0019 não afirma que só login satisfaz a lei; cobertura jurídica pendente.
  Guarda/sigilo/retenções preservados, dados mínimos sem terceiros/UI/dependências novas.

## Falta / dúvidas

- Nada pendente na implementação desta revisão. Validar juridicamente a cobertura
  escolhida para o serviço antes de produção; não interpretar ausência de granularidade
  literal na lei como confirmação de suficiência de apenas login.

## Avisos

- managers falham sem tenant; global só system_context()/@system_scope/unscoped().
  Views com TenantScopedViewMixin e permissões declaradas; model novo exige fábrica de isolamento.
- Escritas users/RBAC pelos services; eventos AuditEvent imutáveis. Leituras de auditoria
  devem filtrar contrato, inclusive na futura API do bloco 5. Nenhum endpoint novo nesta revisão.
- Banco local com migrations aplicadas (audit.0004); não regenerar initials nem versionar .env.
- Antes de produção: expurgo/LegalHold (ADR 0007), proxy real configurado, sigilo e
  backups protegidos, NTP, cache compartilhado/atômico, borda, MFA/recuperação e limpeza de tokens.
- Reorganizações de módulos/SQL documentadas no backend/AGENTS.md e guia Django.
- Push só quando solicitado; validador Windows via Git Bash com PATH=/usr/bin:/bin:$PATH.
