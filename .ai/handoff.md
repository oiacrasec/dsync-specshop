# Handoff

- **Atualizado em:** 2026-10-18
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md (Bloco 6 = prioridade)
- **Último commit:** 658018a feat(administration): list contract admins and reset their passwords

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 6.8 frontend de contratos — ✅ concluída e commitada; Bloco 6 concluído |
| Próximo passo exato | usuário escolher a prioridade: revisão do ADR 0032 (Proposto), 5.3, 5.4 ou 5.5 |
| Aguardando o usuário? | sim — próxima prioridade; commits só após revisão do usuário |

## Concluído

0.1–0.3 · 1.1–1.2 · 2.1–2.5 · 3.1–3.6 · 4.1 · 5.1–5.2 · 6.1 · 6.2 · 6.2a · 6.3 · 6.4 · 6.5 · 6.6 · 6.7 · 6.8.
Bloco 6 concluído; pendentes do plano: 5.3, 5.4, 5.5 e revisão do ADR 0032.

- 6.6/decisão 42: POST /api/v1/admin/contracts/{public_id}/provision/ cria 1ª organização +
  admin (perfil essencial, escopo contrato, must_change_password). Dados mínimos: username +
  name. Só contrato disponível sem usuários/organizações não excluídos (inclusive inativos);
  senão 409 contract-not-provisionable (não usa contract-inactive, que desloga o cliente).
- Senha temporária: users.utils.generate_temporary_password (CSPRNG, 16, validadores Django),
  só na resposta no-store; nunca em log/auditoria. Eventos assignment.created + contract.provisioned.
- Locks: rbac.services.begin_write (antes _begin_write) → contrato. Concorrência testada.
- Migration audit.0007 (choices, sem SQL) aplicada ao banco local dsync_core com autorização.

## Avisos

- validar.sh procura `.venv` na raiz; o venv local é `~/Virtual/datasync-core-3.14`.
  Usuário pediu para não mexer em config/docs de ambiente: rodar os passos à mão.
- 6.7/decisão 43: GET admin/contracts/{id}/admins/ (inclui inativos) e POST
  …/admins/{user}/reset-password/ (temporária + flag + revoga todos os refresh, user.password_reset).
  Refresh agora trava usuário → token (mesma ordem do reset). audit.0008 aplicada ao banco local com autorização.
- 6.8/decisão 44: contratos do superadmin no Core (public_id, schema adaptado, plano por
  options, retenção 0–365, provisionamento, admins e reset com confirmação). ui-filter resolve
  options por public_id. Rotas mantêm permissionGuard (superadmin passa; códigos contrato:* sem uso).
  Não reativar telas DESABILITADO. KPI fictícia preservada por pedido.
- OrganizationViewSet/ADR 0032 Proposto; revisar após Bloco 6. 5.3/5.4/5.5 pendentes.
- JWT localStorage (ADR 0035); HTTPS/CSP, cache compartilhado/borda/MFA e expurgo antes de produção.
- npm audit (88 vulns) adiado pelo usuário até o front ficar mais redondo.
- Push só quando pedido. Commit só após revisão do usuário.
