# ADRs — Architecture Decision Records

Registram decisões arquiteturais relevantes e, principalmente, **por que** foram
tomadas. Um ADR aprovado não é editado para mudar a decisão: uma decisão nova gera
um ADR novo que **substitui** o anterior.

## Status

| Status | Significado |
|---|---|
| Proposto | em discussão, ainda não vale |
| Aceito | decisão vigente |
| Substituído por NNNN | trocado por outro ADR |
| Rejeitado | discutido e descartado (fica registrado o motivo) |

## Índice

| Nº | Título | Status |
|---|---|---|
| [0001](0001-monorepo.md) | Monorepo com projetos autônomos | Aceito |
| [0002](0002-arquitetura-do-backend.md) | Arquitetura do backend | Aceito |
| [0003](0003-arquitetura-do-frontend.md) | Arquitetura do frontend | Proposto |
| [0004](0004-contrato-de-api.md) | Contrato de API | Aceito |
| [0005](0005-memoria-de-ia.md) | Memória e procedimentos para agentes de IA | Aceito |
| [0006](0006-multi-tenancy-contrato-organizacao.md) | Multi-tenancy por Contrato e Organização | Aceito |
| [0007](0007-identificadores-e-convencoes-de-persistencia.md) | Identificadores e convenções de persistência | Aceito |
| [0008](0008-administracao-propria.md) | Administração própria, sem o Django Admin | Aceito (trecho substituído por 0010) |
| [0009](0009-rbac-hibrido.md) | RBAC híbrido: perfis vinculados + permissões avulsas | Aceito |
| [0010](0010-gestao-de-usuarios-pelo-superadmin.md) | Gestão de usuários e superadmins pela área administrativa | Aceito |
| [0011](0011-endpoint-de-opcoes.md) | Endpoint de opções (autocomplete e seleção) | Aceito |
| [0012](0012-excecoes-ao-escopo-declarado.md) | Exceções ao escopo declarado (`Contract` e `User`) | Aceito |
| [0013](0013-dominio-de-contratos-e-relacoes-de-contexto.md) | Domínio de contratos e relações de contexto | Aceito |
| [0014](0014-modalidade-definida-pela-implantacao.md) | Modalidade definida pela implantação, sem campo no plano | Aceito |
| [0015](0015-contagem-de-licencas-de-usuarios.md) | Contagem de licenças, incluindo usuários inativos | Aceito |
| [0016](0016-dominio-rbac.md) | Domínio próprio para gestão de acesso | Aceito |
| [0017](0017-trilha-de-auditoria.md) | Trilha de auditoria append-only | Aceito |
| [0018](0018-registro-de-acesso.md) | Registro de acesso fora dos tipos de escopo | Aceito |
| [0019](0019-registros-de-autenticacao.md) | Registros de acesso concentrados na autenticação | Aceito (substitui parcialmente 0018) |
| [0020](0020-administracao-de-planos-e-contratos.md) | Administração de planos/contratos e redução segura de licenças | Aceito |
| [0021](0021-views-base-compostas-no-core.md) | Views base compostas, mixins e paginação no core | Aceito |
| [0022](0022-django-filter-nas-listagens.md) | django-filter com FilterSets declarados nas listagens | Aceito |
| [0023](0023-services-nos-serializers-de-escrita.md) | Services nos métodos create/update dos serializers | Substituído por 0030 |
| [0024](0024-classe-base-de-services.md) | Classe base de services e exclusão herdada nas views | Substituído por 0030 |
| [0025](0025-classe-de-service-nos-serializers.md) | Classe de service declarada nos serializers | Substituído por 0030 |
| [0026](0026-schema-automatico-por-campos.md) | Schema por campos, metadados automáticos e overrides | Aceito |
| [0027](0027-classes-base-de-selectors.md) | Classes base de selectors e configuração das views | Aceito |
| [0028](0028-querysets-simples-nas-views.md) | Querysets administrativos simples diretamente nas views; substitui 0027 | Aceito |
| [0029](0029-busca-geral-e-filtros-individuais.md) | Busca geral e filtros individuais no Core | Aceito |
| [0030](0030-crud-auditado-nos-serializers.md) | CRUD auditado com serializers padrão do DRF | Aceito |
| [0031](0031-respostas-de-actions-customizadas.md) | Helpers de resposta para actions customizadas | Aceito |
| [0032](0032-organizacoes-em-viewset-proprio.md) | Organizações acessíveis em ViewSet próprio | Proposto |
| [0033](0033-api-administrativa-separada-do-dominio.md) | API do superadmin em administration, domínio em contracts e plano opcional | Aceito |
| [0034](0034-primeiro-acesso-e-troca-de-senha.md) | Primeiro acesso e troca de senha com bloqueio global por JWT | Aceito |

## Modelo

```markdown
# NNNN — Título

- **Status:** Proposto
- **Data:** AAAA-MM-DD

## Contexto
Problema e forças em jogo.

## Decisão
O que foi decidido.

## Alternativas consideradas
O que foi descartado e por quê.

## Consequências
Ganhos, custos e o que passa a ser obrigatório.
```
