# Handoff

- **Atualizado em:** 2026-10-04
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Último commit funcional:** 6991ea8 — refactor(api): standardize custom action responses

## Situação

| Item | Estado |
|---|---|
| Etapa atual | Revisão da 5.2: OrganizationViewSet — em andamento, NÃO commitada |
| Próximo passo exato | Retomar a última orientação de rota/acesso e explicar never_cache antes de fechar a revisão |
| Aguardando o usuário? | Sessão encerrada para handoff; confirmar retomada, sem iniciar 5.3 |

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

## Trabalho NÃO commitado

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

## Última orientação — AINDA NÃO aplicada

- Usuário: "o admin nao ira ver as organizacoes, pode colocar ele fora da url do admin".
  Mover organizations para fora de /admin/. Esclarecer a abrangência de "admin"
  (superadmin global ou área administrativa) antes de decidir a regra de acesso.
- Pergunta pendente: por que @method_decorator(never_cache, name='dispatch')?
  Ele acrescenta headers contra cache de respostas dependentes do usuário/permissões;
  não filtra dados nem concede acesso. Explicar ao retomar; usuário não pediu sua remoção.
- Docs/ADR 0032 atuais ainda descrevem /admin/organizations e acesso global: são
  rascunho da revisão, NÃO decisão final. Corrigir com código/testes, validar e commitar.

## Avisos

- Não iniciar 5.3/CRUD de organizações (5.4) sem confirmação. Push só quando solicitado.
- Performance GLOBAL; managers exigem tenant; global só unscoped/system_context explícitos.
- AuditEvent imutável; AccessLog só autenticação (ADR 0019), sem afirmar suficiência jurídica.
- Banco local até audit.0005; não versionar .env/regenerar initials. Validador via Git Bash.
