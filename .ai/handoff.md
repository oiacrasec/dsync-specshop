# Handoff

- **Atualizado em:** 2026-10-03
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Última alteração:** `feat(rbac): add profiles and scoped assignments` (inclui este handoff; consultar `git log -1` para o hash)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 3.2 perfis e atribuições RBAC — ✅ concluída (antecipada antes do contexto) |
| Próximo passo exato | etapa 3.3: cálculo puro de permissão efetiva e proteção DRF que nega por padrão; concluir RBAC antes de retomar 2.3 |
| Aguardando o usuário? | sim — confirmação para iniciar a etapa 3.3 |

## Feito nesta etapa: 3.2

- Usuário autorizou 3.2 e apps/rbac, registrado no ADR 0016. App gerado por
  startapp, com name apps.rbac e sem admin/views vazios. Registry permanece core.
- Profile e ProfilePermission híbridos; Assignment e AssignmentExclusion de
  contrato. FKs PROTECT, tabelas dsc_, UUIDs v7, autoria e exclusão lógica.
  scope_organization/excluded_organization são alvos da concessão/exceção,
  distintos do contexto de persistência de contrato exigido pelo check core.
- Constraints: nomes únicos por contexto, incluindo sistema com NULLS NOT
  DISTINCT; chave essencial única e somente no sistema; atribuição XOR perfil/
  código, scope consistente, unicidade de atribuição/permissão/exceção. Índice
  contract/user. Nomes com comparação exata, sem normalização de caixa.
- Selectors consultam nomes, contratos duplicados para aviso lazy/paginável em
  UUIDs e perfil em uso. Services validam registry/escopos/reservadas, vínculos
  de contexto, exclusões e perfis essenciais, com transações e autoria.
  Atualmente só superadmin ativo/não excluído pode escrever, verificado no banco.
- Advisory lock transacional global serializa configuração RBAC, inclusive nome
  de perfil híbrido. Custo de concorrência apenas nas escritas administrativas;
  reavaliar se houver contenção. Assignment bloqueia usuário, coordenando com
  save_user, que agora bloqueia troca de contrato enquanto houver atribuições.
- Perfil atribuído inclusive por grants inativos gera ProfileInUse (409).
  Exclusão lógica trata permissões/exceções em lote, na mesma transação.
  Não usar save/update/bulk direto em gestão: constraints não validam tudo entre
  tabelas. Fixtures/migrations controladas mantêm perfil essencial.
- system_key contract_admin identifica perfil essencial, sem seed nesta etapa.
  Serviços negam criação/edição/exclusão do perfil e suas permissões; atribuição
  exige CONTRACT sem exceções. Edição/remoção da atribuição essencial bloqueada
  até a proteção específica de 3.4, incluindo troca de usuário/perfil/desativação.
- 39 testes novos, incluindo isolamento de vínculos, reservas, autoria,
  cascatas lógicas, constraints, proteção essencial, transferências e atores.
  Concorrência de nomes PostgreSQL provada; 22 queries constantes na criação
  de atribuição com 1/30 permissões (inclui full_clean e savepoints).
  Validador completo: 227 testes, lint, formatação, migrations e checks de
  desenvolvimento/produção passaram. rbac.0001 aplicada localmente, sem seeds.
- OWASP A01/A06/A10 revisados: escrita administrativa fechada, vínculos
  intercontratos negados, reservas/escopos validados e transações/concorrência
  testadas. Bypass de revogação do admin por edição corrigido com testes.
  A02/A05/A08: configuração mínima, SQL fixo parametrizado, ORM/constraints,
  sem entrada HTTP/desserialização nova. A03/A04/A07: sem dependências, crypto
  ou autenticação alteradas. A09: autoria presente, eventos completos em 3.6;
  nenhum novo endpoint publicado antes dessa proteção. Sem achados residuais
  no escopo desta etapa, sem declarar RBAC/isolamento completos.
- Performance: sem N+1, queries constantes provadas, exists para existência,
  códigos em uma consulta e exclusão de filhos em lote. Avisos lazy, sem carregar
  todos os contratos. Lock global documentado; leituras de acesso não o usam.
- Checklist legal base: vínculos para administração do acesso ao serviço, sem
  dados cadastrais adicionais, UI, dados sensíveis, logs pessoais, terceiros ou
  novas dependências. Retenções/expurgo seguem ADR 0007 e entrega própria;
  soft delete não é eliminação. Não é declaração de conformidade do produto.
- Docs domínio/registry/erro, ADR/índice, AGENTS/README, overview/plano e memória
  atualizados. Próxima etapa 3.3 exige confirmação. Depois 3.4–3.6 e 2.3–2.5.

## Etapa 3.1 anterior: registry

- Usuário pediu 2.3. Verificada dependência do contexto nas atribuições de 3.2;
  o usuário escolheu antecipar RBAC antes do contexto. Nova ordem no plano:
  3.1 → 3.2 → demais etapas RBAC → 2.3 → 2.4 → 2.5, com validação por etapa.
- Registry em apps/core/permission_registry.py, Python puro sem Django/DRF/SQL:
  PermissionScope CONTRACT/ORGANIZATION; PermissionDefinition frozen/slotted
  com código explícito, frozenset de escopos e flag reserved; PermissionRegistry
  rejeita códigos inválidos/duplicados e protege mapa com MappingProxyType.
- Catálogo inicial de 11 operações de gestão do ADR 0009 (organização, usuário,
  perfil e atribuição), reservadas em CONTRACT. Não registrar recursos futuros
  sem necessidade. Manage continua ação independente, sem implicações.
- require_assignable exige código/escopo permitido e rejeita reservadas por
  padrão. Essential_profile é opção exclusivamente interna após verificar
  identidade do perfil essencial; não aceitar do payload ou tratá-la como
  autorização do ator. Serviços futuros traduzem erros internos para domínio.
- 28 testes novos sem banco: códigos, duplicados, desconhecidos, escopos,
  reservas, tipos de flags, imutabilidade e imports sem framework/runtime.
  Validador completo passou: 188 testes, lint, formatação, migrations e checks
  desenvolvimento/produção. Sem novas migrations ou alterações no banco.
- OWASP A01/A06/A10: catálogo fechado, reservas explícitas, desconhecido/escopo
  inválido negado, sem defaults de concessão. Ainda não há RBAC de endpoints,
  atribuições nem perfil essencial; proteção DRF entra na etapa 3.3. Sem nova
  API pública/privilegiada ou input de request neste módulo. A02/A03/A04/A05/
  A07/A08/A09 sem alterações relevantes em configuração/dependências/crypto/
  SQL/auth/desserialização/logs. Sem achados novos neste diff.
- Performance sem achados: zero acesso ao banco, busca por código em mapa,
  nenhuma listagem/endpoint/N+1; testes puros sem pytest.mark.django_db.
- Checklist legal base no escopo: sem dados novos, retenção, UI, terceiros,
  dependências ou logging. Não equivale a conformidade global do produto.
- Docs do registry, AGENTS/README, overview/plano, memória/handoff sincronizados.
  Etapa 2.3 não iniciada no código; autenticação por contrato/contexto ainda
  pendente. Próxima etapa 3.2 exige confirmação.

## Etapa 2.2 anterior: vínculo e licenças

- Usuário autorizou 2.2 e escolheu contar também inativos nas licenças.
  Decisão em ADR 0015; soft delete libera, cadastro/restauração/transferência
  precisam de vaga no destino. Reativar/editar já contado não consome outra vaga.
- User.contract FK PROTECT, índice, nullable; constraint dsc_user_contract_by_role
  exige vínculo para usuário comum e proíbe para superadmin, inclusive em bulk/SQL.
- Service save_user interno, transacional, com lock no usuário existente e no
  contrato de destino. Valida papel, contrato disponível/ativo/vigência, conta
  não excluídos (inclusive inativos) só quando consumirá vaga e grava autoria.
  LicenseLimitReached existente 409; ContractInactive 403; ValidationError 422.
  A contagem agregada não é constraint: não consumir/restaurar vagas por save,
  update/bulk/SQL direto. Endpoints futuros devem usar o serviço com autorização.
- Manager create_user/create_superuser e versões async delegam ao serviço,
  preservando _create_user_object do Django (normalização/email/hash). Bootstrap
  createsuperuser sem contrato preservado. Sem novos endpoints ou promoção HTTP.
- Verificado banco local com 0 usuários antes da migration; users.0002 revisada
  e aplicada com autorização persistente. Sem regenerar initial ou backfill.
- 14 novos testes de regras, banco, erro, rollback, restauração, transferência,
  datas inclusivas, actor e async. Concorrência PostgreSQL: dois cadastros com
  uma vaga geram um sucesso e um LicenseLimitReached. Criação com 1/30 usuários
  existentes constante em 5 queries incluindo savepoints.
- Fixtures anteriores adaptadas: usuário comum com contrato explícito; testes
  de infraestrutura/BaseModel usam superadmin sem contrato. Sem mock de regras
  nem contrato padrão implícito no runtime. Queries JWT anteriores preservadas.
- Validador completo passou: 160 testes, lint, formatação, migrations, checks
  desenvolvimento/produção. Documentação e memória sincronizadas.
- Segurança OWASP: A01/A06/A10 revisados — constraint por papel, serviço interno,
  erro sem dados pessoais, operações atômicas e concorrência testada. Permissões
  dos endpoints, auditoria completa de promoção e isolamento ainda nas etapas
  de RBAC/contexto; não houve nova API privilegiada neste diff.
  A02/A05/A08 revisados — configuração preservada, ORM parametrizado, sem
  desserialização nova. A03/A04/A07/A09 sem dependências/crypto/auth/logs novos.
  Validação contratual no login/refresh/contexto continua em 2.3.
- Performance sem achados: contagem no banco, FK indexada, consultas constantes,
  locks apenas dentro de atomic, sem N+1 ou novos endpoints/listagens.
- Checklist legal base + CDC no escopo: vínculo com finalidade de prestação
  de serviço/isolamento, sem novos dados de perfil, retenções ou cobrança;
  sem UI, dependências, transmissão a terceiros ou log pessoal. Soft delete
  permanece preservação, não eliminação. Políticas/expurgo continuam pendentes;
  não é declaração de conformidade do produto.

## Etapa 2.1 anterior: planos e contratos

- Usuário autorizou avançar à etapa 2.1.
- App apps/contracts gerado com django startapp e instalado; sem admin/rotas vazias.
  Plan SharedModel, Contract raiz BaseModel, Organization ContractScopedModel.
  Estilo compacto e exemplos práticos nas docstrings; __str__ usa somente nome.
- Usuário definiu modalidade como característica da implantação, sem campo em
  Plan/Contract. Depois aprovou somente a tabela para as quatro quotas sugeridas.
  ADR 0014 registra as decisões e complementa o ADR 0006, sem editar ADR aceito.
- Plan: nome, max_organizations, max_storage_bytes, max_integrations e
  max_operations_per_month opcionais. Null = sem limite definido, zero = zero;
  negativos rejeitados, sem contadores/bloqueios/enforcement nesta etapa.
- Contract: nome, plano PROTECT, datas de vigência, licenças >= 1 e retenção
  pós-contrato 90/faixa 0–365. Constraints no banco para datas/licenças/retenção.
  Organization: nome e contrato obrigatório PROTECT, com índice da FK.
- Migration contracts.0001_initial revisada e aplicada ao banco local autorizado.
  Tabelas dsc_plan/contract/organization, sem seeds ou mudanças em registros existentes.
- 23 testes novos: campos, quotas sem enforcement, null/zero/negativos,
  validação e constraints mesmo em update direto, obrigatoriedade das FKs,
  PROTECT na exclusão física, autoria/soft delete e contagem de queries.
  Validador completo passou com 146 testes, lint, formatação, migrations,
  checks de desenvolvimento/produção.
- OWASP: A01/A06 revisados — escopos declarados e constraints, sem API publicada;
  isolamento entre tenants ainda pendente nas etapas 2.3–2.5, documentado.
  A02/A05/A08/A10 revisados — configuração mínima, ORM, FK/constraints, sem
  dados do usuário interpolados, sem exceções engolidas. A03/A04/A07/A09 sem
  novas dependências, crypto/auth ou logging neste diff. Nenhum achado novo.
- Performance sem achados: FK contract/plan indexadas, sem índices de quotas
  sem uso; __str__ local; leitura de relações com select_related constante em
  1 query para 1/30 organizações (teste). Sem endpoints ou queries em loops.
- Checklist legal base + CDC: sem cobrança/contratação online ou alteração
  automática de contratos. Somente configuração, sem quotas aplicadas. Nome de
  cliente/unidade para identificar o vínculo de prestação de serviço (ADR 0006),
  minimização sem CPF/CNPJ/contatos. Retenção segue ADR 0007; expurgo/LegalHold,
  políticas e operação comercial continuam pendentes. Sem UI, dependências,
  logs pessoais ou envio a terceiros; não equivale a conformidade do produto.
- Documentação e memória sincronizadas; próxima etapa 2.2 exige confirmação.

## Feito até aqui

- ADRs 0001–0016 revisados; 0003 continua Proposto para discussão do frontend.
- Backend Django 5.2 LTS, sem Admin, sessões ou messages; etapas 0.1/0.2 concluídas.
- API versionada, handler RFC 9457, request ID e log_filters; logs de conclusão
  apenas para erros (4xx WARNING / 5xx ERROR), por decisão do usuário.
- Etapa 1.1 antecipada ao JWT por aprovação do usuário: a configuração padrão
  de SimpleJWT usa a PK interna, que o ADR 0007 proíbe expor.

## Etapa 1.2 anterior: escopos

- Usuário autorizou a etapa 1.2 e confirmou apps/contracts para Plan, Contract
  e Organization, com PROTECT nas relações de contexto. Decisão no ADR 0013.
- Criados SharedModel, HybridScopedModel, ContractScopedModel e
  OrganizationScopedModel abstratos em core/models.py, derivados de BaseModel.
  Exemplos práticos nas quatro docstrings por pedido do usuário. FKs lazy para
  contracts.Contract/Organization, nulabilidade conforme ADR 0006; índice
  composto contract/organization, além dos índices individuais das FKs.
- Check registrado em CoreConfig.ready, sem queries: core.E001 sem escopo,
  E002 múltiplos tipos, E003 contexto incompatível (destino/null/blank/PROTECT).
  Apps próprios incluindo proxies/unmanaged; terceiros e N:N automáticas fora.
  Exceções fechadas users.User/contracts.Contract, exigindo BaseModel sem escopo.
- 24 testes novos: herança, metadados, relações resolvidas, tentativa de remover
  ou alterar contexto, proxies, exceções por label exato, registro e zero queries.
- Validador completo: 123 testes, lint, formatação, migrations e checks
  desenvolvimento/produção passaram. Nenhuma migration criada ou aplicada:
  somente tipos abstratos e checks, sem novos models concretos.
- Revisão OWASP A01/A06/A10: declaração obrigatória, bypass por múltipla herança
  ou campos incompatíveis rejeitado; sem liberação nova de API. Isolamento de
  queries/contexto e testes entre tenants permanecem nas etapas 2.3–2.5.
  A02/A03/A04/A05/A07/A08/A09 sem alterações relevantes de configuração,
  dependências, criptografia, SQL, autenticação, desserialização ou logs.
- Performance sem achados: check percorre metadados sem SQL (teste com 0 queries),
  FKs indexadas e índice composto começando pelo contexto. Sem novos endpoints.
- Checklist legal base no escopo: sem coleta nova, retenção, UI, terceiros ou
  dependências. PROTECT preserva contra remoção acidental, não substitui expurgo
  legal; regras de eliminação continuam na entrega própria. Nenhuma declaração
  de conformidade global do produto.
- AGENTS/README/standard, docs de escopos, overview, plano e memória sincronizados.
  Herdar Meta do tipo escolhido para preservar managers e índices.

## Etapa 0.3 anterior: JWT

- SimpleJWT 5.5.1 (MIT) e PyJWT transitivo 2.15.1 (MIT), metadados PyPI sem
  advisories dessas versões e pip check sem conflitos. Inventário de dependências
  JWT em backend/docs/standards/dependencies.md; avisos MIT preservados nos pacotes.
- JWT/IsAuthenticated globais. POST /api/v1/auth/login/, refresh/ e logout/ públicos,
  JSON, no-store e RFC 9457. Serializers de entrada, views finas e services de escrita.
- Claim public_id UUID v7; access 15 min, refresh 1 dia, rotação e blacklist
  instalada. Chave independente (mínimo 32 bytes) gerada no .env local, sem expor valor.
- Refresh/logout usam transação e lock de OutstandingToken, verificando novamente
  a blacklist após obter lock. Concorrência no PostgreSQL e rollback testados.
- Usuários inativos/excluídos não autenticam nem renovam; tokens e credenciais não
  aparecem nos logs. Logout revoga refresh; access expira normalmente em até 15 min.
- Usuário confirmou 5 tentativas, depois esclareceu e aprovou as boas práticas:
  contar somente falhas por conta. Janela fixa de 60 s, bloqueio de 60 s ao atingir
  5 falhas, HMAC da identidade normalizada, add/incr atômicos no cache local.
  Sucesso e erros 400/422 não consomem limite; requests em andamento podem terminar.
- Migrations de auth/contenttypes/users/blacklist aplicadas ao banco local com
  autorização. dsc_user com 0 usuários; nenhuma migration pendente.
- Validador completo passou: 99 testes, lint, formatação, migrations, checks e
  checks de produção. Queries constantes provadas para 1/30 usuários adicionais:
  login 6, refresh 19, logout 13; leitura de usuário via access em 1 query na probe.
- Revisão OWASP A01–A10: autenticação fechada, erro genérico, segredo fora do Git,
  Argon2 preservado, apenas ORM, claims validados e operações transacionais.
  Sem achados novos de injection/crypto/exception handling. Pendências de produção
  em A07: cache compartilhado/atômico, controles de borda, MFA e recuperação; A09:
  AccessLog na etapa 4.1, logs de sucesso continuam desativados por decisão do usuário.
- Performance sem N+1; public_id/jti únicos e FKs indexadas; cache sem queries SQL.
- Checklist legal base no escopo: autenticação sem novos dados de perfil; HMAC no
  cache, finalidade de segurança e expiração dos contadores/tokens documentadas.
  Sem nova interface visual ou conteúdo/fluxos voltados a menores. Não equivale a
  declaração de conformidade do produto, cujas políticas e AccessLog são pendentes.
- Contrato em docs/api/authentication.md; AGENTS/README/overview/plano/memória atualizados.

## Etapa 1.1 e ajustes de estilo anteriores

- BaseModel substitui TimeStampedModel: PK BIGINT, public_id UUID v7 único,
  timestamps, autoria explícita, is_active e exclusão lógica.
- Metaclasse gera tabelas dsc_ em snake_case antes das relações N:N automáticas.
- objects oculta excluídos e preserva inativos; all_objects permite auditoria.
- save(actor=user) registra autoria; delete(actor=user) e QuerySet.delete(actor=user)
  preservam dados e são idempotentes. Sem cascata; futuras regras ficam no service.
- User herda AbstractUser e BaseModel, mantém o is_active do Django e o manager
  de criação de usuários/superusuários. Usuários excluídos não autenticam.
- Banco de desenvolvimento consultado: sem tabelas ou migrations aplicadas.
  Migration inicial regenerada para dsc_user; não aplicada ao banco local.
- Validador completo passou: 58 testes, lint, formatação, ausência de migrations
  pendentes e checks de desenvolvimento/produção, sem avisos nesta execução.
- Revisão de segurança do diff sem novos achados: A01/A04/A05/A06/A07/A08/A09/A10;
  A02 sem mudanças de settings; A03 sem dependências novas. Autenticação de
  excluídos testada; nenhuma API ou regra de escopo criada nesta etapa.
- Performance sem achados: exclusão em lote comprovada em uma query para 1/30
  usuários; índice único de public_id e índices de FKs gerados pelo Django.
- Checklist legal base revisado no escopo: autoria para rastreabilidade prevista
  no ADR 0007; sem novos dados de perfil, logs ou dependências. Soft delete não
  equivale à eliminação; expurgo, LegalHold e política de retenção continuam
  pendentes na entrega própria. AccessLog continua na etapa 4.1.
- Atualizados AGENTS/README do backend, overview, plano e conhecimento da IA.
- Ajuste posterior: usuário definiu estilo compacto para campos dos models,
  registrado em backend/AGENTS.md. BaseModel ajustado; models.py excluído do
  formatter e de E501 para preservar a preferência, mantendo demais regras de lint.
  Lint, check de formatação e verificação de migrations passaram após esse ajuste;
  sem alteração de comportamento e sem novos testes.
- Padrão consolidado em backend/docs/standards/django-style.md, com exemplo em
  backend/docs/examples/model.md; AGENTS e README apontam para esses documentos.
  Models de core/users revisados e itens de update_fields agrupados.
- Usuário confirmou limite de 100 caracteres. Corrigidas as FKs longas mantendo
  argumentos agrupados e continuação alinhada; removida a exceção E501 de models.py.
  Formatação manual permanece preservada; documentação e memória refletem o limite.
  Lint, formatação, migrations e sintaxe dos exemplos validados; todos os models
  têm linhas de até 100 caracteres e AST preservada, sem mudança de comportamento.
- Preferência atual: usuário alterou o limite para **120 caracteres**. Ruff,
  models, exemplos e documentação sincronizados; E501 continua ativo e
  formatação manual dos models preservada. Esta decisão substitui o limite de 100.
  Quatro arquivos ajustados pelo formatter ao novo limite. Validador completo
  passou: 58 testes, lint, formatação, migrations e checks de produção.

## Falta nesta etapa

- Nada.

## Dúvidas abertas

- Nenhuma.

## Avisos

- Banco local migrado com autorização, ainda sem usuários. Não regenerar mais
  migrations iniciais agora que foram aplicadas.
- Autoria pode ser nula em operações de sistema/bootstrap; bulk/update precisam
  de auditoria explícita do chamador. all_objects não dispensa autorização.
- Tipos de escopo, checks e apps/contracts concluídos até 2.1.
  Os tipos não filtram queries: contexto/managers/autorização ainda pendentes.
  Não publicar endpoints de negócio antes das proteções e testes de isolamento.
  Expurgo permanece em entrega própria.
- Antes de produção, configurar cache compartilhado com incrementos atômicos e
  leitura consistente, proteção de borda, MFA/recuperação e agendar diariamente
  manage.py flushexpiredtokens. O cache atual é local a cada processo.
- backend/.env é local e nunca deve ser versionado.
- Push para o GitHub só quando o usuário pedir.
- Validador no Windows: Git Bash com PATH=/usr/bin:/bin:$PATH, conforme histórico.
