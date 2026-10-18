# Handoff

- **Atualizado em:** 2026-10-18
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md (Bloco 6 = prioridade)
- **Último commit:** 9ea7662 docs: align documentation with delivered stages

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 6.6 provisionamento do contrato — ✅ concluída e commitada |
| Próximo passo exato | 6.7: listar admins do contrato e resetar senha (nova temporária + flag + revogar refresh) |
| Aguardando o usuário? | sim — confirmação para iniciar 6.7; commits só após revisão do usuário |

## Concluído

0.1–0.3 · 1.1–1.2 · 2.1–2.5 · 3.1–3.6 · 4.1 · 5.1–5.2 · 6.1 · 6.2 · 6.2a · 6.3 · 6.4 · 6.5 · 6.6.
Ordem seguinte: 6.7 → 6.8.

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
- 6.7: reset gera nova senha (reutilizar generate_temporary_password), marca a flag e revoga
  refresh do admin (decisão 40). Listar admins do contrato.
- 6.8: frontend contratos ainda GIS/id/PT; adaptar Core/public_id, plan opcional/options e
  provisionamento. Não reativar telas DESABILITADO. KPI fictícia preservada por pedido.
- OrganizationViewSet/ADR 0032 Proposto; revisar após Bloco 6. 5.3/5.4/5.5 pendentes.
- JWT localStorage (ADR 0035); HTTPS/CSP, cache compartilhado/borda/MFA e expurgo antes de produção.
- npm audit (88 vulns) adiado pelo usuário até o front ficar mais redondo.
- Push só quando pedido. Commit só após revisão do usuário.
