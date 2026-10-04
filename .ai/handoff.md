# Handoff

- **Atualizado em:** 2026-10-04
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md (Bloco 6 = prioridade)
- **Última alteração:** etapa 6.4, primeiro acesso/troca de senha (consultar git log -1)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 6.4: primeiro acesso e troca de senha no backend — concluída |
| Próximo passo exato | 6.5: adaptar API/types/interceptors/guards e telas de login, primeiro acesso e seleção de organização no frontend |
| Aguardando o usuário? | sim — confirmar início da 6.5 |

## Concluído

0.1–0.3 · 1.1–1.2 · 2.1–2.5 · 3.1–3.6 · 4.1 · 5.1–5.2 · 6.1 · 6.2 · 6.2a · 6.3 · 6.4.
Ordem seguinte: 6.5 → 6.6 → 6.7 → 6.8 (decisões 37–40 do plano).

- ADR 0034: User.must_change_password default false; contas existentes preservadas.
  Login: access/refresh/user (public_id, username, name=first_name, is_superuser,
  must_change_password). JWT bloqueia comum marcado antes das permissões/contexto
  com 403 password-change-required; superadmin isento, flag false no resumo.
- POST /api/v1/auth/change-password/: access, atual/nova/confirmação; conta do request,
  sem organização. Revalida conta/senha sob lock próprio, Django/Argon2, flag=false,
  autoria e user.password_changed atômicos; sem senha/hash/token no evento ou logs.
  Resposta user atualizado, no-store; também troca voluntária. Throttle DRF 5 pedidos/
  min por usuário, antes do hash/lock. Tokens atuais preservados, reset revoga na 6.7.
- users.0004 e audit.0006 aplicadas localmente. Validador completo: 555 testes,
  lint/formato e checks dev/produção OK. Navegação normal/bloqueada: um SELECT sem
  writes/locks; troca: 2 SELECT + UPDATE + INSERT, lock só no usuário, com 1/30 contas.
  Argon2 real, rollback e concorrência testados; sem ensaio de capacidade sob carga.
- ADR 0033 preservado: API do superadmin em administration, models em contracts;
  Contract.plan opcional/PROTECT, licenças contam inativos. Rotas preservadas.

## Decisões vigentes para as próximas etapas

- Provisionamento: 1ª organização + admin (perfil essencial), só em contrato sem
  usuários. Senha temporária uma vez, no-store, sem log/auditoria; reset revoga refresh.
- Contract.plan opcional no formulário, options de planos; tela de planos fica para
  o futuro. Seleção de organização para usuários comuns na 6.5; superadmin sem organização.
- Futuro envio assíncrono: tabela de eventos + Celery/Dramatiq, não implementar agora.

## Frontend / pendências

- Frontend GIS: Angular/PrimeNG 21, Node 24 Docker; lint/format/build OK na 6.2a.
  Bundle 1,25 MB (~257 KB gzip), aviso 1,3 MB aprovado. Não alterado na 6.4.
- Telas: login, primeiro acesso, seleção de organização, contratos, home KPI fictícia
  e erros. Demais comentadas DESABILITADO. Services/types ainda API Spatial (id/PT),
  adaptar na 6.5/6.8. Environments homol/prod sem URL. Referências: datasync-spatial/GIS.
- OrganizationViewSet/ADR 0032 = rascunho Proposto em contracts, /admin/organizations;
  rota/comportamento preservados na 6.3 por router separado. Revisar após Bloco 6.
- 5.3, 5.4 e 5.5 (OpenAPI) pendentes. Não iniciar a próxima etapa sem confirmação.

## Avisos

- Superadmin local datasync_admin; senha só com o usuário. .env nunca versionado.
- Banco até users.0004, contracts.0003 e audit.0006; não regenerar initials. Reverter plan obrigatório
  exige resolver contratos sem plano antes de NOT NULL; não inventar plano padrão.
- Performance GLOBAL; managers exigem tenant, global só unscoped/system_context.
- AuditEvent imutável; AccessLog só autenticação, adequação jurídica não confirmada.
- Antes de produção: cache compartilhado, borda/MFA, limpeza de tokens, expurgo/LegalHold,
  proxy, criptografia/backups/NTP. Push só quando pedido. Validador backend via Git Bash.
