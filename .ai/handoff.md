# Handoff

- **Atualizado em:** 2026-10-04
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md (Bloco 6 = prioridade)
- **Última alteração:** etapa 6.5, frontend auth/contexto Core (consultar git log -1)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 6.5 concluída: frontend auth, primeiro acesso e organização |
| Próximo passo exato | 6.6: provisionar primeira organização e admin do contrato, senha temporária uma vez |
| Aguardando o usuário? | sim — confirmação para iniciar 6.6; não avançar automaticamente |

## Concluído

0.1–0.3 · 1.1–1.2 · 2.1–2.5 · 3.1–3.6 · 4.1 · 5.1–5.2 · 6.1 · 6.2 · 6.2a · 6.3 · 6.4 · 6.5.
Ordem seguinte: 6.6 → 6.7 → 6.8 (decisões 37–41 do plano).

- 6.5/ADR 0035: usuário manteve JWT localStorage após avaliar HttpOnly e exigiu
  organização compartilhada. dsc_session_v1 = access/refresh/user mínimo + ID local
  de sessão; dsc_active_context_v1 = UUID/nome da organização + UUID do proprietário.
  Trocar organização limpa caches e recarrega todas as abas; label/rotação não.
- Refresh/logout coordenados por Web Locks (HTTPS/localhost, navegador compatível),
  refresh sob demanda e compartilhado, sem polling; respostas antigas descartadas.
  Logout revoga refresh mais recente; falha ainda limpa localmente e é informada.
- API /api/v1: login/refresh/logout/change-password/me/organizations; Bearer só origem/
  prefixo exatos; X-Organization-Id só negócio comum. RFC 9457; guards apenas UX.
  Login root → kpi; comum marcado → troca; comum → organizações UUID acessíveis.
  Senhas não persistidas; troca usa resumo atualizado, mínimo UI 12 + confirmação.
- ETag global legado URL-only e resumo de permissões GIS desabilitados. Não existe
  endpoint de resumo RBAC no Core. Dev proxy /api → 127.0.0.1:8000; sem novo CORS.
- Usuário confirmou login manual de datasync_admin funcionando. Antes houve
  credenciais rejeitadas/429 pelo limite 5 falhas/min; nenhuma senha foi redefinida.
- Validação 6.5: 44 testes ChromeHeadless, lint/formato/build; 555 testes backend,
  Ruff/migrations/checks dev/prod OK. 30 pedidos comuns sem storage/refresh.
  Bundle ~1,25 MB/~257 KB estimados. Sem E2E completo duas abas/backend, ensaio de
  capacidade sob carga ou auditoria WCAG completa. Documentação/memória atualizadas.
- 6.4/ADR 0034: must_change_password default false, bloqueio global JWT (root isento),
  login resumo user; troca atômica Argon2/validadores + autoria/auditoria sem senha.
  Access/refresh atuais preservados; reset revoga refresh na 6.7. Throttle troca 5/min.
- 6.3/ADR 0033: API root em administration; models em contracts; plan opcional/PROTECT.

## Próximas etapas e avisos

- 6.6: primeira organização + admin/perfil essencial, só contrato sem usuários;
  conferir licença contando inativos. Senha temporária uma vez/no-store, sem logs/
  auditoria de credenciais. 6.7: listar admins/reset senha, marcar flag e revogar refresh.
- 6.8: frontend contratos ainda GIS/id/PT, adaptar Core/public_id, plan opcional/options.
  Não reativar telas comentadas DESABILITADO. KPI fictícia preservada por pedido.
- OrganizationViewSet/ADR 0032 rascunho Proposto em contracts, /admin/organizations;
  revisar após Bloco 6. 5.3/5.4/5.5 (OpenAPI) pendentes. Homol/prod frontend URL pendente.
- JWT localStorage é legível por JS/XSS; risco documentado na escolha. HTTPS/CSP,
  cache compartilhado/borda/MFA e limpeza tokens antes de produção. Sem cookies/BFF.
- Superadmin local datasync_admin, senha só com usuário. .env nunca versionado.
- Banco até users.0004, contracts.0003, audit.0006; sem migration nesta etapa.
- Performance GLOBAL; managers exigem tenant, global só unscoped/system_context.
  AuditEvent imutável; AccessLog só auth, adequação jurídica/expurgo/LegalHold pendentes.
- Referências datasync-spatial/GIS; frontend autônomo. Push só quando pedido.
