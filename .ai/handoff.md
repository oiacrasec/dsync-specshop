# Handoff

- **Atualizado em:** 2026-10-04
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md (Bloco 6 = prioridade)
- **Última alteração:** etapa 6.3, API administrativa separada/plano opcional (consultar git log -1)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 6.3: administration e Contract.plan opcional — concluída |
| Próximo passo exato | 6.4: User.must_change_password, resumo do usuário no login, bloqueio global até trocar senha e endpoint de troca |
| Aguardando o usuário? | sim — confirmar início da 6.4 |

## Concluído

0.1–0.3 · 1.1–1.2 · 2.1–2.5 · 3.1–3.6 · 4.1 · 5.1–5.2 · 6.1 · 6.2 · 6.2a · 6.3.
Ordem seguinte: 6.4 → 6.5 → 6.6 → 6.7 → 6.8 (decisões 37–40 do plano).

- ADR 0033: contracts = domínio (Plan/Contract/Organization, labels/tabelas preservados).
  administration = API do superadmin, sem models próprios. Views/serializers/filters/
  constantes/URLs/testes de planos e contratos movidos; rotas/basenames preservados.
- Contract.plan opcional: omissão/null na criação, null remove vínculo na atualização;
  PROTECT e FK histórica preservados. Sem quotas de plano quando ausente; licenças
  continuam positivas e contando inativos. Auditoria aceita plan=null e permanece atômica.
- contracts.0003_contract_plan_optional aplicada localmente; vínculos existentes intactos.
  Validador: 515 testes, lint/formato, migrations/checks desenvolvimento/produção OK.
  List/options com/sem plano, 1/30 itens: duas consultas de dados e sem writes/N+1.
  Sem ensaio de carga novo; migration padrão requer lock de schema/validação da FK.
- Models usam verbose_name explícito, limite 120, autoria/soft delete herdados.
  CRUD por DRF/BaseModelSerializer, validate próprio, hooks extras, auditoria/locks;
  actions próprias try/except e core/responses (RFC 9457/rollback/logging seguros).

## Decisões vigentes para as próximas etapas

- Primeiro acesso Spatial/GIS: provisionar 1ª organização + admin (perfil essencial)
  somente em contrato sem usuários. Senha temporária devolvida uma vez (no-store,
  nunca em log/auditoria). Bloqueio no backend até trocar (exceto troca/refresh/logout).
  Superadmin isento desse fluxo. Login devolve resumo; reset revoga refresh tokens.
- Contract.plan opcional no formulário, options de planos; tela de planos fica para
  o futuro. Seleção de organização para usuários comuns na 6.5; superadmin sem organização.
- Futuro envio assíncrono: tabela de eventos + Celery/Dramatiq, não implementar agora.

## Frontend / pendências

- Frontend copiado do datasync-gis: Angular/PrimeNG 21, Node 24 Docker; lint/format/build
  passaram na 6.2a. Bundle 1,25 MB (~257 KB gzip), aviso 1,3 MB aprovado. Não alterado na 6.3.
- Telas: login, primeiro acesso, seleção de organização, contratos, home KPI fictícia
  e erros. Demais comentadas DESABILITADO. Services/types ainda API Spatial (id/PT),
  adaptar na 6.5/6.8. Environments homol/prod sem URL. Referências: datasync-spatial/GIS.
- OrganizationViewSet/ADR 0032 = rascunho Proposto em contracts, /admin/organizations;
  rota/comportamento preservados na 6.3 por router separado. Revisar após Bloco 6.
- 5.3, 5.4 e 5.5 (OpenAPI) pendentes. Não iniciar a próxima etapa sem confirmação.

## Avisos

- Superadmin local datasync_admin; senha só com o usuário. .env nunca versionado.
- Banco até contracts.0003 e audit.0005; não regenerar initials. Reverter plan obrigatório
  exige resolver contratos sem plano antes de NOT NULL; não inventar plano padrão.
- Performance GLOBAL; managers exigem tenant, global só unscoped/system_context explícitos.
  AuditEvent imutável; AccessLog só autenticação, adequação jurídica não confirmada.
- Antes de produção: cache compartilhado, borda/MFA, limpeza de tokens, expurgo/LegalHold,
  proxy, criptografia/backups/NTP. Push só quando pedido. Validador backend via Git Bash.
