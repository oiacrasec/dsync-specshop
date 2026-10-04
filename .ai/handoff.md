# Handoff

- **Atualizado em:** 2026-10-04
- **Agente:** Claude (retomou do Codex)
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Último commit funcional:** 6991ea8 — refactor(api): standardize custom action responses

## Situação

| Item | Estado |
|---|---|
| Etapa atual | Prioridade redefinida: área administrativa; revisão de organizações NÃO commitada |
| Próximo passo exato | Retomar pelos fluxos administrativos do Spatial/GIS e planejar login, contrato e admin do contrato |
| Aguardando o usuário? | Só handoff solicitado agora; confirmar retomada antes de implementar |

## Concluído e commitado

0.1 · 0.2 · 1.1 · 0.3 · 1.2 · 2.1 · 2.2 · 3.1–3.6 · 2.3–2.5 · 4.1 · 5.1–5.2.

- dcf1106: BaseModelSerializer/BaseAdminModelSerializer usam super().create/update
  do DRF, autoria/auditoria atômica, create_extra/update_extra; validate próprio.
  Usuário dispensou full_clean genérico e model_validation_fields/exclude.
  get_audit_contract_id centralizado na base. Services próprios users/RBAC preservados.
- ATOMIC_REQUESTS cobre is_valid/save; view trava update/delete antes de validar;
  uso direto exige atomic externo. Licenças incluem inativos não excluídos; concorrência
  protegida pelo lock do contrato. FK histórica de plano excluído permanece válida.
- 6991ea8: core/responses.py, build_result_response e build_exception_response.
  Actions próprias usam try/except; erro recebe exception/request e delega ao handler
  RFC 9457, com rollback, headers, request_id e logging seguro. options/schema adaptados.
- Login sem style HTML; write_only/espaços preservados. OpenAPI na 5.5.
- Views: queryset, serializer_class, filterset_class, demais; selectors só leitura própria.
  Models com verbose_name explícito e limite 120. Cabeçalhos compactos/audit_events
  multiline preservados localmente por fmt off/on; Ruff não configura esse estilo.

## Organizações: commitado como rascunho (revisão pendente)

Usuário autorizou commitar para seguir com a área administrativa; ADR 0032 = Proposto.

- OrganizationViewSet próprio e BaseReadOnlyModelViewSet, com OrganizationSerializer
  (nome solicitado), django-filter, paginação, options/schema. Action do contrato removida.
- Estado ATUAL do código: mesmo router de plans/contracts, /api/v1/admin/organizations/;
  usuário comum via accessible_organizations/RBAC; superadmin com queryset global.
  Somente leitura/organizações ativas; filtro contract na lista; /me/organizations mantido.
- Arquivos: contracts/{views,serializers,filters,urls,tests/test_admin_api}.py,
  contracts/tests/test_organizations_api.py e core/views.py. Config/api/v1 voltou ao original.
  Docs alteradas: AGENTS/README/standards, API admin-contracts/organizations, overview,
  plano, índice/ADR 0032 e knowledge architecture/log. Consultar git status/diff completo.
- Último validador passou: 507 testes, lint/formato, migrations sem alterações,
  checks desenvolvimento/produção. 68 testes dirigidos também passaram após router único.
  List/options: cinco SELECTs com perfil em 1/30 itens, sem writes/locks/N+1;
  limites de 100 e campos mínimos. Sem JWT real/carga nova; não garante capacidade.

## Prioridade definida pelo usuário — AINDA NÃO implementada

- Focar PRIMEIRO na área administrativa do admin/superadmin, seguindo Spatial e GIS:
  login, criação de contrato e criação do administrador do contrato.
- Fluxo de primeiro acesso com troca de senha NÃO se aplica ao superadmin.
  Desenvolver o fluxo do administrador do contrato conforme as referências, sem
  presumir detalhes de senha/provisionamento ainda não verificados no Spatial/GIS.
- Não avançar organizações agora. Usuário disse que o superadmin, por enquanto,
  terá apenas acesso à criação de contratos. Possível aba de organizações no contrato
  ainda não decidida e não é o mesmo recurso de organizações da área do usuário.
- Usuário cogitou apps/administration para regras da área do superadmin. Renomear
  contracts inteiro ou separar a camada administrativa NÃO foi decidido/implementado.
- A revisão pendente ainda expõe /admin/organizations ao usuário comum e acesso
  global ao superadmin: NÃO representa o escopo final. Não commitar como concluída.
  Docs/ADR 0032 também são rascunho antigo. Preservar trabalho para revisão posterior.
- Orientação anterior: organizações do usuário ficam fora de /admin/. Pergunta sobre
  never_cache pendente: controla headers de cache, não autorização; remoção não pedida.

## Avisos

- Reavaliar sequência do plano para a prioridade administrativa; não iniciar CRUD
  de organizações (5.4) nem implementar agora. Push só quando solicitado.
- Performance GLOBAL; managers exigem tenant; global só unscoped/system_context explícitos.
- AuditEvent imutável; AccessLog só autenticação (ADR 0019), sem afirmar suficiência jurídica.
- Banco local até audit.0005; não versionar .env/regenerar initials. Validador via Git Bash.
