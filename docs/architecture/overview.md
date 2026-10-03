# Arquitetura Fullstack — datasync-core

> **Documento:** baseline arquitetural oficial do projeto
> **Escopo:** monorepo completo (backend, frontend, documentação e camada de IA)
> **Localização canônica:** `docs/architecture/overview.md`
> **Última atualização:** 2026-10-03

## 0. Estado atual da implementação

Este documento descreve a arquitetura-alvo completa. A estrutura foi materializada
parcialmente — o restante deve ser criado seguindo exatamente este baseline.

| Caminho | Estado |
|---|---|
| `docs/` (`architecture/`, `domain/`, `api/`, `adr/`) | criado |
| `.ai/` (`knowledge/*`, `skills/`, `queries/`) | criado |
| `.ai/skills/` (processo: 10 · conformidade legal: 14) | criado |
| `.claude/skills/project-skills/` | criado |
| `.github/workflows/` | criado |
| `AGENTS.md`, `README.md` (raiz) | criado |
| `.claude/settings.json` (hook que carrega `AGENTS.md`) | criado |
| `.gitignore`, `.gitattributes` | criado |
| `backend/` (Django 5.2 LTS: `config/settings/*`, `apps/core`, `apps/users`, `requirements/*`, `AGENTS.md`, `README.md`) | criado |
| `backend/` (`Dockerfile`, `docker-compose.yml`, `Makefile`, docs com conteúdo) | **pendente** |
| `frontend/` | **pendente** |
| `AGENTS.md` (frontend) | **pendente** |

Diretórios ainda sem conteúdo contêm `.gitkeep` apenas para preservar a estrutura
no versionamento. Esses arquivos devem ser removidos quando o diretório receber
conteúdo real.

---

## 1. Objetivo

Este documento define a arquitetura-base do projeto fullstack utilizando:

- **Backend:** Django + Django REST Framework
- **Frontend:** Angular
- **Arquitetura do repositório:** Monorepo
- **Banco de dados:** PostgreSQL
- **Infraestrutura:** Docker / Docker Compose
- **Desenvolvimento assistido por IA:** `AGENTS.md`, documentação estruturada, memória persistente e contexto arquitetural
- **Multi-tenancy:** clientes isolados por **Contrato** e **Organização** num banco único (ADR 0006)

O objetivo principal é manter **backend e frontend independentes em execução e dependências**, porém dentro do mesmo repositório Git para facilitar versionamento, documentação, integração, CI/CD e desenvolvimento assistido por agentes de IA.

---

# 2. Princípios arquiteturais

## 2.1 Monorepo com projetos autônomos

O projeto utiliza um único repositório Git:

```text
datasync-core/
├── backend/
├── frontend/
├── docs/
├── .ai/
├── .claude/
├── .github/
├── AGENTS.md
├── README.md
├── .gitignore
└── .gitattributes
```

Apesar de estarem no mesmo repositório:

- o backend não depende de arquivos do frontend;
- o frontend não depende de arquivos do backend;
- cada projeto possui suas próprias dependências;
- cada projeto possui sua própria configuração de ambiente;
- cada projeto possui seu próprio `Dockerfile`;
- cada projeto pode possuir seu próprio `docker-compose.yml`;
- cada projeto possui sua própria documentação técnica;
- cada projeto pode ser movido futuramente para outro repositório sem refatoração estrutural significativa.

A configuração do Git (`.gitignore`, `.gitattributes`) fica **somente na raiz**, por
ser um monorepo. Se um projeto for extraído para outro repositório, ele recebe sua
própria configuração nesse momento.

A comunicação entre frontend e backend ocorre exclusivamente através de contratos bem definidos, normalmente via API HTTP/REST.

## 2.2 Multi-tenancy por Contrato e Organização

```text
Contract (cliente)  →  Organization (unidade)  →  Sector (futuro)
```

- Um banco por implantação; isolamento por colunas de contexto, com escopo **declarado**
  em todo model e proteção em camadas contra vazamento (ADR 0006).
- Contexto por requisição no header `X-Organization-Id`; o contrato vem do usuário.
- Acesso e permissões pelo **RBAC híbrido** (ADR 0009).
- Isolamento físico, quando necessário, por **implantação** própria (dedicada ou no
  servidor do cliente).
- Decisões completas: `docs/adr/` (índice em `docs/adr/README.md`).

---

# 3. Estrutura oficial do repositório

```text
datasync-core/
│
├── AGENTS.md
├── README.md
├── .gitignore
├── .gitattributes
│
├── .claude/
│   ├── settings.json      → hook SessionStart: carrega AGENTS.md
│   └── skills/
│       └── project-skills/
│           └── SKILL.md   → descobre e carrega as skills de .ai/skills/
│
├── .ai/
│   ├── README.md
│   ├── handoff.md         → estado atual do trabalho (skill handoff)
│   ├── schema.md
│   │
│   ├── knowledge/
│   │   ├── index.md
│   │   ├── log.md
│   │   │
│   │   ├── architecture/
│   │   │   ├── overview.md
│   │   │   ├── backend.md
│   │   │   ├── frontend.md
│   │   │   └── integrations.md
│   │   │
│   │   ├── domains/
│   │   │   └── ...
│   │   │
│   │   ├── concepts/
│   │   │   └── ...
│   │   │
│   │   ├── flows/
│   │   │   └── ...
│   │   │
│   │   └── components/
│   │       ├── backend.md
│   │       └── frontend.md
│   │
│   ├── skills/
│   │   ├── git-commit/
│   │   │   ├── SKILL.md
│   │   │   └── reference.md
│   │   ├── explicacao-eficiente/
│   │   │   └── SKILL.md
│   │   ├── questionador/
│   │   │   └── SKILL.md
│   │   ├── verificar-ambiente/
│   │   │   ├── SKILL.md
│   │   │   └── check.sh
│   │   ├── owasp-top-10/
│   │   │   └── SKILL.md
│   │   ├── erros-api-rfc9457/
│   │   │   └── SKILL.md
│   │   ├── revisao-performance/
│   │   │   └── SKILL.md
│   │   ├── validar-etapa/
│   │   │   ├── SKILL.md
│   │   │   └── validar.sh
│   │   ├── modo-de-trabalho/
│   │   │   └── SKILL.md
│   │   ├── handoff/
│   │   │   └── SKILL.md
│   │   ├── lgpd/
│   │   │   └── SKILL.md
│   │   ├── marco-civil/
│   │   │   └── SKILL.md
│   │   ├── conformidade-legal/
│   │   │   └── SKILL.md
│   │   ├── cdc/
│   │   │   └── SKILL.md
│   │   ├── acessibilidade/
│   │   │   └── SKILL.md
│   │   ├── propriedade-intelectual/
│   │   │   └── SKILL.md
│   │   ├── crimes-ciberneticos/
│   │   │   └── SKILL.md
│   │   ├── eca-digital/
│   │   │   └── SKILL.md
│   │   ├── assinatura-eletronica/
│   │   │   └── SKILL.md
│   │   ├── lai/
│   │   │   └── SKILL.md
│   │   ├── cadastro-positivo/
│   │   │   └── SKILL.md
│   │   ├── saude-digital/
│   │   │   └── SKILL.md
│   │   ├── financeiro-bacen/
│   │   │   └── SKILL.md
│   │   ├── inteligencia-artificial/
│   │   │   └── SKILL.md
│   │   ├── ingest-change/
│   │   ├── update-knowledge/
│   │   ├── impact-analysis/
│   │   ├── review-change/
│   │   └── lint-knowledge/
│   │
│   └── queries/
│       ├── architecture.md
│       ├── dependencies.md
│       └── impact.md
│
├── backend/
│   ├── AGENTS.md
│   ├── README.md
│   ├── .env.example
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── Makefile
│   ├── manage.py
│   ├── pyproject.toml     → pytest, coverage, ruff
│   │
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── development.txt
│   │   ├── production.txt
│   │   └── testing.txt
│   │
│   ├── config/
│   │   ├── __init__.py
│   │   │
│   │   ├── settings/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   ├── production.py
│   │   │   └── testing.py
│   │   │
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   │
│   ├── apps/
│   │   ├── __init__.py
│   │   │
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── apps.py
│   │   │   ├── models.py          → BaseModel e tipos de escopo
│   │   │   ├── context.py         → contexto de organização
│   │   │   ├── exceptions.py      → erros RFC 9457
│   │   │   ├── permissions.py
│   │   │   ├── pagination.py
│   │   │   ├── utils.py
│   │   │   │
│   │   │   ├── migrations/
│   │   │   │   └── __init__.py
│   │   │   │
│   │   │   └── tests/
│   │   │       └── __init__.py
│   │   │
│   │   └── users/
│   │       ├── __init__.py
│   │       ├── apps.py
│   │       ├── models.py
│   │       ├── serializers.py
│   │       ├── selectors.py
│   │       ├── services.py
│   │       ├── views.py
│   │       ├── urls.py
│   │       ├── permissions.py
│   │       │
│   │       ├── fixtures/
│   │       │   └── ...
│   │       │
│   │       ├── migrations/
│   │       │   └── __init__.py
│   │       │
│   │       └── tests/
│   │           ├── __init__.py
│   │           ├── factories.py
│   │           ├── test_models.py
│   │           ├── test_selectors.py
│   │           ├── test_services.py
│   │           └── test_views.py
│   │
│   ├── static/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   │
│   ├── media/
│   │
│   ├── templates/         → HTML dos relatórios em PDF (WeasyPrint, futuro)
│   │
│   ├── scripts/
│   │
│   └── docs/
│       ├── architecture/
│       │   ├── overview.md
│       │   ├── apps.md
│       │   ├── data-flow.md
│       │   └── testing.md
│       │
│       ├── standards/
│       │   ├── python-style.md
│       │   ├── django-style.md
│       │   ├── api-style.md
│       │   ├── testing-style.md
│       │   └── naming-conventions.md
│       │
│       ├── patterns/
│       │   ├── service-layer.md
│       │   ├── selector-pattern.md
│       │   ├── permissions.md
│       │   ├── transactions.md
│       │   ├── soft-delete.md
│       │   ├── audit-log.md
│       │   └── background-jobs.md
│       │
│       └── examples/
│           ├── model.md
│           ├── selector.md
│           ├── service.md
│           ├── serializer.md
│           ├── viewset.md
│           ├── permission.md
│           ├── urls.md
│           ├── fixture.md
│           ├── test.md
│           └── complete-feature.md
│
├── frontend/
│   ├── AGENTS.md
│   ├── README.md
│   ├── .env.example
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── Makefile
│   │
│   ├── angular.json
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.spec.json
│   ├── eslint.config.js
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── auth/
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   ├── services/
│   │   │   │   └── config/
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── main-layout/
│   │   │   │   ├── header/
│   │   │   │   ├── sidebar/
│   │   │   │   └── footer/
│   │   │   │
│   │   │   ├── shared/
│   │   │   │   ├── ui/
│   │   │   │   ├── directives/
│   │   │   │   ├── pipes/
│   │   │   │   ├── validators/
│   │   │   │   ├── models/
│   │   │   │   └── utils/
│   │   │   │
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login/
│   │   │   │   │   ├── forgot-password/
│   │   │   │   │   ├── services/
│   │   │   │   │   └── auth.routes.ts
│   │   │   │   │
│   │   │   │   └── users/
│   │   │   │       ├── pages/
│   │   │   │       ├── components/
│   │   │   │       ├── services/
│   │   │   │       ├── models/
│   │   │   │       └── users.routes.ts
│   │   │   │
│   │   │   ├── app.component.ts
│   │   │   ├── app.component.html
│   │   │   ├── app.component.scss
│   │   │   ├── app.config.ts
│   │   │   └── app.routes.ts
│   │   │
│   │   ├── environments/
│   │   │   ├── environment.ts
│   │   │   └── environment.production.ts
│   │   │
│   │   ├── styles/
│   │   │   ├── _variables.scss
│   │   │   ├── _mixins.scss
│   │   │   └── global.scss
│   │   │
│   │   ├── index.html
│   │   └── main.ts
│   │
│   ├── public/
│   │   ├── images/
│   │   ├── icons/
│   │   └── i18n/
│   │
│   └── docs/
│       ├── architecture/
│       │   ├── overview.md
│       │   ├── features.md
│       │   ├── routing.md
│       │   ├── state-management.md
│       │   └── testing.md
│       │
│       ├── standards/
│       │   ├── typescript-style.md
│       │   ├── angular-style.md
│       │   ├── component-style.md
│       │   ├── service-style.md
│       │   ├── testing-style.md
│       │   └── naming-conventions.md
│       │
│       ├── patterns/
│       │   ├── feature-structure.md
│       │   ├── component-pattern.md
│       │   ├── service-pattern.md
│       │   ├── api-access.md
│       │   ├── forms.md
│       │   ├── error-handling.md
│       │   └── state-management.md
│       │
│       └── examples/
│           ├── component.md
│           ├── page.md
│           ├── service.md
│           ├── model.md
│           ├── route.md
│           ├── form.md
│           ├── interceptor.md
│           ├── guard.md
│           ├── test.md
│           └── complete-feature.md
│
├── docs/
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── backend-frontend.md
│   │   ├── deployment.md
│   │   └── security.md
│   │
│   ├── domain/
│   │   ├── glossary.md
│   │   ├── business-rules.md
│   │   └── entities.md
│   │
│   ├── api/
│   │   ├── overview.md
│   │   ├── authentication.md
│   │   ├── errors.md
│   │   └── versioning.md
│   │
│   ├── plans/
│   │   └── entrega-1-fundacao-tenancy-rbac.md   → plano da 1ª entrega
│   │
│   └── adr/
│       ├── README.md                                       → índice e modelo
│       ├── 0001-monorepo.md
│       ├── 0002-arquitetura-do-backend.md
│       ├── 0003-arquitetura-do-frontend.md
│       ├── 0004-contrato-de-api.md
│       ├── 0005-memoria-de-ia.md
│       ├── 0006-multi-tenancy-contrato-organizacao.md
│       ├── 0007-identificadores-e-convencoes-de-persistencia.md
│       ├── 0008-administracao-propria.md
│       ├── 0009-rbac-hibrido.md
│       ├── 0010-gestao-de-usuarios-pelo-superadmin.md
│       ├── 0011-endpoint-de-opcoes.md
│       └── 0012-excecoes-ao-escopo-declarado.md
│
└── .github/
    └── workflows/
        ├── backend-ci.yml
        ├── backend-deploy.yml
        ├── frontend-ci.yml
        └── frontend-deploy.yml
```

---

# 4. Backend

## 4.1 Organização geral

O backend é um projeto Django autônomo.

```text
backend/
├── config/
├── apps/
├── static/
├── media/
├── templates/
├── requirements/
├── docs/
└── manage.py
```

### `config/`

Contém exclusivamente configurações globais do Django:

- settings;
- URLs raiz;
- ASGI;
- WSGI;
- configurações gerais do projeto.

Não deve conter regras de negócio.

### `apps/`

Contém os domínios funcionais do sistema.

Cada domínio deve ser representado por um Django App.

Exemplo:

```text
apps/
├── core/
└── users/
```

Novos domínios devem ser adicionados no mesmo nível.

---

# 5. Estrutura de um Django App

Um app nasce com o mínimo gerado por `django-admin startapp` (`apps.py`, `models.py`,
`migrations/`, `tests/`); o `admin.py` gerado é removido, porque o Django Admin não é
usado (ADR 0008). As demais camadas são
**criadas sob demanda**, quando a primeira funcionalidade precisar delas, sem
arquivos vazios antecipados (ver §30).

Estrutura completa de um app maduro:

```text
users/
├── apps.py
├── models.py
├── serializers.py
├── selectors.py
├── services.py
├── views.py
├── urls.py
├── permissions.py
├── fixtures/
├── migrations/
└── tests/
```

A divisão de responsabilidades é:

| Arquivo | Responsabilidade |
|---|---|
| `models.py` | Persistência e comportamento da entidade |
| `serializers.py` | Validação, entrada e saída da API |
| `selectors.py` | Consultas e operações de leitura |
| `services.py` | Regras de negócio e alterações de estado |
| `views.py` | Camada HTTP/API |
| `urls.py` | Rotas do app |
| `permissions.py` | Regras de autorização |
| `fixtures/` | Fixtures pertencentes ao domínio |
| `migrations/` | Migrações do banco |
| `tests/` | Testes automatizados |

## 5.1 Fluxo de leitura

```text
HTTP Request
      │
      ▼
    View
      │
      ▼
  Selector
      │
      ▼
    Model
```

## 5.2 Fluxo de escrita

```text
HTTP Request
      │
      ▼
 Serializer
      │
      ▼
    View
      │
      ▼
   Service
      │
      ▼
    Model
```

Views e serializers devem permanecer finos.

Regras de negócio não devem ser implementadas diretamente dentro de views.

---

# 6. Core do backend

O app `core` contém apenas recursos compartilhados por múltiplos domínios.

Exemplos válidos:

- `BaseModel` (`public_id` UUID v7, datas, autoria, `is_active`, soft delete; ADR 0007);
- os tipos de escopo `SharedModel`, `HybridScopedModel`, `ContractScopedModel` e
  `OrganizationScopedModel` (ADR 0006);
- resolução do contexto de organização (ADR 0006);
- paginação, exceções no formato RFC 9457 (skill `erros-api-rfc9457`) e o mixin de
  `options` (ADR 0011);
- utilitários realmente compartilhados.

O `core` não deve se transformar em um depósito genérico de código.

Código relacionado a um domínio específico deve permanecer dentro daquele domínio.

---

# 7. Fixtures

Fixtures pertencentes a uma aplicação devem ficar dentro do próprio app:

```text
apps/users/fixtures/
```

Evitar uma pasta global de fixtures quando os dados pertencem claramente a um domínio.

Isso mantém cada app autocontido.

---

# 8. Requirements

As dependências Python são separadas por ambiente:

```text
requirements/
├── base.txt
├── development.txt
├── production.txt
└── testing.txt
```

### `base.txt`

Dependências comuns a todos os ambientes.

### `development.txt`

Ferramentas utilizadas durante o desenvolvimento.

### `production.txt`

Dependências específicas de produção.

### `testing.txt`

Dependências relacionadas a testes e cobertura.

### Política de versões

- Sempre a **última versão LTS** do framework (hoje: **Django 5.2 LTS**, suporte até abril de 2028).
- Versões declaradas com `~=` (*compatible release*): `Django~=5.2.17` aceita patches `5.2.x`, nunca `6.0`.
- Atualizar com `pip install -U -r requirements/<ambiente>.txt`.

---

# 9. Frontend

O frontend é um projeto Angular autônomo.

A estrutura principal é:

```text
src/app/
├── core/
├── layout/
├── shared/
└── features/
```

---

# 10. Features Angular

A organização deve priorizar funcionalidades e domínio, não tipos globais de arquivo.

Exemplo:

```text
features/
└── users/
    ├── pages/
    ├── components/
    ├── services/
    ├── models/
    └── users.routes.ts
```

Uma feature deve carregar consigo tudo que pertence exclusivamente àquela funcionalidade.

Evitar estruturas globais como:

```text
components/
services/
models/
```

contendo arquivos de vários domínios misturados.

---

# 11. Core Angular

`core/` contém infraestrutura global e singleton da aplicação.

Exemplos:

```text
core/
├── auth/
├── guards/
├── interceptors/
├── services/
└── config/
```

Não devem ser colocados no `core` serviços específicos de features.

---

# 12. Shared Angular

`shared/` contém elementos genuinamente reutilizados entre diferentes features.

```text
shared/
├── ui/
├── directives/
├── pipes/
├── validators/
├── models/
└── utils/
```

Um componente utilizado apenas por uma feature deve permanecer naquela feature.

---

# 13. Layout

A pasta:

```text
layout/
```

representa a estrutura visual global da aplicação.

Exemplo:

```text
layout/
├── main-layout/
├── header/
├── sidebar/
└── footer/
```

---

# 14. Documentação

A documentação é dividida em três níveis.

## 14.1 Documentação global

```text
docs/
```

Contém conhecimento que envolve o sistema como um todo.

```text
docs/
├── architecture/
├── domain/
├── api/
└── adr/
```

### `architecture/`

Arquitetura fullstack.

### `domain/`

Conhecimento do negócio.

### `api/`

Contrato entre consumidores e backend.

### `adr/`

Architecture Decision Records.

ADRs registram decisões arquiteturais relevantes e, principalmente, o motivo pelo qual foram tomadas.

---

# 15. Documentação específica do backend

```text
backend/docs/
├── architecture/
├── standards/
├── patterns/
└── examples/
```

### `architecture/`

Explica como o backend está organizado.

### `standards/`

Define regras obrigatórias de codificação.

### `patterns/`

Documenta soluções aprovadas para problemas recorrentes.

### `examples/`

Contém implementações canônicas que servem de referência para humanos e IA.

---

# 16. Documentação específica do frontend

Segue a mesma filosofia:

```text
frontend/docs/
├── architecture/
├── standards/
├── patterns/
└── examples/
```

---

# 17. Exemplos canônicos

Os arquivos dentro de:

```text
backend/docs/examples/
frontend/docs/examples/
```

não devem ser tutoriais genéricos.

Eles devem representar o padrão oficial do projeto.

Exemplo:

```text
backend/docs/examples/complete-feature.md
```

deve demonstrar uma feature Django completa:

```text
Model
  ↓
Selector / Service
  ↓
Serializer
  ↓
View
  ↓
URL
  ↓
Tests
```

No frontend:

```text
frontend/docs/examples/complete-feature.md
```

deve demonstrar uma feature Angular completa seguindo os padrões oficiais.

Os agentes de IA devem preferir esses exemplos ao inventar novas estruturas.

---

# 18. AGENTS.md

O projeto possui instruções de IA em diferentes níveis.

`AGENTS.md` é o arquivo único de instruções para **todos** os agentes. A raiz não
contém arquivos específicos de um agente (ex.: `CLAUDE.md`); o que é de cada
ferramenta fica na pasta dela:

| Agente | Como carrega o `AGENTS.md` |
|---|---|
| Codex e similares | nativamente |
| Claude Code | hook `SessionStart` em `.claude/settings.json` |

## Raiz

```text
AGENTS.md
```

Define:

- visão geral do projeto;
- princípios arquiteturais;
- regras globais;
- relação entre backend e frontend;
- localização da documentação;
- procedimentos de alteração;
- regras para atualização da memória.

## Backend

```text
backend/AGENTS.md
```

Define regras específicas de:

- Python;
- Django;
- Django REST Framework;
- models;
- services;
- selectors;
- serializers;
- views;
- testes;
- migrations.

## Frontend

```text
frontend/AGENTS.md
```

Define regras específicas de:

- Angular;
- TypeScript;
- componentes;
- services;
- routing;
- state;
- forms;
- testes.

---

# 19. Camada de memória para IA

A pasta:

```text
.ai/
```

é destinada à memória operacional dos agentes de IA.

Ela não substitui a documentação oficial.

```text
.ai/
├── knowledge/
├── skills/
├── queries/
└── schema.md
```

---

# 20. Knowledge

```text
.ai/knowledge/
```

representa conhecimento compilado sobre o projeto.

Esse conhecimento pode ser derivado de:

- código;
- documentação;
- ADRs;
- histórico Git;
- decisões do projeto;
- mudanças recentes.

Exemplo:

```text
knowledge/
├── architecture/
├── domains/
├── concepts/
├── flows/
└── components/
```

---

# 21. Index e Log

## `index.md`

Representa o índice da memória.

Responde:

> O que sabemos sobre o projeto?

## `log.md`

Mantém histórico cronológico das principais mudanças absorvidas pela memória.

Responde:

> O que mudou e quando?

Exemplo:

```markdown
## 2026-10-03 - Autenticação

Implementada autenticação JWT.

Afetados:

- backend/apps/users/
- frontend/src/app/core/auth/

Documentação atualizada:

- architecture/authentication.md
- flows/login.md
```

---

# 22. Skills

```text
.ai/skills/
```

contém procedimentos que agentes devem seguir. É a **única fonte de verdade** das
skills, independente do agente utilizado.

## Formato

Cada skill é um diretório com um `SKILL.md` (frontmatter `name` e `description` +
procedimento) e, opcionalmente, arquivos de apoio:

```text
.ai/skills/<nome>/
├── SKILL.md
└── reference.md   (opcional)
```

O Claude Code não lê `.ai/skills/` diretamente: a skill
`.claude/skills/project-skills/` lista as skills disponíveis e carrega a adequada
à tarefa. Não duplicar skills em `.claude/skills/`.

## Skills existentes

| Skill | Uso |
|---|---|
| `git-commit` | padrão de commits (Conventional Commits + commits atômicos) |
| `explicacao-eficiente` | respostas curtas, humanizadas e visuais em PT-BR |
| `questionador` | nunca inferir ou supor; diante de lacunas ou conflitos, parar e perguntar |
| `verificar-ambiente` | checa ferramentas, `.venv`, CodeGraph, LSPs, plugins e hooks (`check.sh`) |
| `owasp-top-10` | checklist de code review de segurança (OWASP Top 10:2025) |
| `erros-api-rfc9457` | formato único de erro da API (Problem Details, RFC 9457) |
| `revisao-performance` | checklist de performance: N+1, agregação, anotação, subquery, CTE, índices, lotes |
| `validar-etapa` | fechamento de cada etapa: verificações automáticas (`validar.sh`), segurança, performance, ADRs, docs e commit |
| `modo-de-trabalho` | preferências permanentes do usuário; lida no início de toda sessão |
| `handoff` | passagem de bastão entre sessões e agentes (`.ai/handoff.md`) |
| `lgpd` | conformidade com a LGPD (Lei 13.709/2018) em tudo que toca dados pessoais |
| `marco-civil` | conformidade com o Marco Civil da Internet (Lei 12.965/2014): registros de acesso, termos, conteúdo de usuários |
| `conformidade-legal` | **roteador**: indica quais skills legais se aplicam a cada funcionalidade |
| `cdc` | CDC + decretos do e-commerce e do SAC: oferta, checkout, arrependimento, cancelamento |
| `acessibilidade` | Lei Brasileira de Inclusão (13.146/2015): WCAG 2.2 AA em telas e conteúdo |
| `propriedade-intelectual` | Leis 9.609/98 e 9.610/98: licenças de dependências, autoria, conteúdo de terceiros |
| `crimes-ciberneticos` | Código Penal (12.737/12, 14.155/21): o que nunca fazer, proteção e evidências |
| `eca-digital` | ECA + ECA Digital (15.211/2025): crianças e adolescentes em ambiente digital |
| `assinatura-eletronica` | MP 2.200-2/2001 + Lei 14.063/2020: níveis de assinatura e ICP-Brasil |
| `lai` | Lei de Acesso à Informação (12.527/2011): transparência ativa e passiva |
| `cadastro-positivo` | Lei 12.414/2011 + CDC art. 43: crédito, score e birôs |
| `saude-digital` | Leis 13.787/18 e 14.510/22: prontuário eletrônico e telessaúde |
| `financeiro-bacen` | Res. CMN 4.893/2021 e BCB 85/2021: segurança cibernética e nuvem |
| `inteligencia-artificial` | regras vigentes sobre IA + preparação para o PL 2.338/2023 |

## Skills planejadas

### `impact-analysis`

Antes de alterar código:

1. identificar componentes afetados;
2. consultar dependências;
3. localizar ADRs relacionadas;
4. consultar documentação;
5. analisar testes;
6. produzir o plano de mudança.

### `review-change`

Antes de considerar uma tarefa concluída:

1. revisar o diff;
2. verificar impacto;
3. executar testes relevantes;
4. conferir standards;
5. conferir ADRs;
6. atualizar documentação e memória quando necessário.

---

# 23. Queries

```text
.ai/queries/
```

contém consultas e procedimentos reutilizáveis para análise do projeto.

Exemplos:

```text
architecture.md
dependencies.md
impact.md
```

Esses arquivos podem orientar agentes em tarefas recorrentes de investigação.

---

# 24. Fontes de verdade

Existe uma hierarquia explícita de confiabilidade.

Em caso de conflito:

```text
Código atual
    ↓
ADRs
    ↓
Documentação oficial
    ↓
Standards / Patterns
    ↓
.ai/knowledge/
```

A memória da IA nunca deve substituir uma decisão arquitetural oficial.

`.ai/knowledge/` é uma representação derivada do projeto e deve ser corrigida quando ficar desatualizada.

---

# 25. Code Graph

O projeto pode utilizar uma camada estrutural de análise do código.

Essa camada pode armazenar relações como:

- imports;
- chamadas entre funções;
- dependências entre classes;
- heranças;
- módulos;
- callers;
- callees;
- referências.

O Code Graph é considerado informação reconstruível.

Portanto bancos e caches locais não devem ser versionados.

Exemplo de `.gitignore`:

```gitignore
.codegraph/
.code-review-graph/
.ai/cache/
.ai/index/
```

---

# 26. Contexto para IA

O contexto ideal fornecido a um agente possui quatro componentes:

```text
                 AI Agent
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    AGENTS.md    Knowledge   Code Graph
        │           │           │
        └───────────┼───────────┘
                    │
                    ▼
                  Skills
                    │
                    ▼
                  Código
```

Cada camada possui uma responsabilidade diferente:

| Camada | Responsabilidade |
|---|---|
| `AGENTS.md` | Como trabalhar |
| `docs/` | O que foi oficialmente definido |
| `.ai/knowledge/` | O que a IA já sabe |
| Code Graph | Como o código está conectado |
| `.ai/skills/` | Como executar procedimentos |
| Git | Histórico real das mudanças |

---

# 27. Independência dos projetos

O backend deve funcionar isoladamente:

```bash
cd backend
docker compose up
```

O frontend também deve poder funcionar isoladamente:

```bash
cd frontend
docker compose up
```

Nenhum dos dois deve depender de arquivos localizados no diretório do outro.

A raiz é responsável pelo repositório e pelo contexto global, não pelo runtime das aplicações.

---

# 28. CI/CD

Os pipelines são separados:

```text
.github/workflows/
├── backend-ci.yml
├── backend-deploy.yml
├── frontend-ci.yml
└── frontend-deploy.yml
```

Mudanças no backend devem, sempre que possível, executar somente pipelines relacionados ao backend.

Mudanças no frontend devem executar somente pipelines relacionados ao frontend.

---

# 29. Regras para novas funcionalidades

Ao criar uma nova funcionalidade:

## Backend

1. identificar o domínio e as leis aplicáveis (skill `conformidade-legal`);
2. criar ou utilizar o Django App correspondente;
3. todo model herda um **tipo de escopo** declarado (ADR 0006), com `BaseModel` e
   tabela `dsc_*` gerada automaticamente (ADR 0007);
4. todo endpoint declara a **permissão** do registry (sem declaração, é negado; ADR 0009);
5. a API expõe só o `public_id`, em snake_case (ADR 0004/0007);
6. seleções usam o endpoint `options` (ADR 0011);
7. erros no formato RFC 9457 (skill `erros-api-rfc9457`);
8. seguir os exemplos em `backend/docs/examples/`;
9. leituras devem preferencialmente utilizar selectors;
10. escritas e regras de negócio devem utilizar services;
11. views devem permanecer finas;
12. adicionar testes, incluindo **isolamento entre contratos**;
13. revisar segurança (skill `owasp-top-10`) e performance (skill `revisao-performance`);
14. atualizar documentação quando necessário.

## Frontend

1. identificar a feature;
2. criar dentro de `src/app/features/`;
3. manter componentes específicos dentro da feature;
4. utilizar `shared/` apenas para código realmente compartilhado;
5. utilizar `core/` apenas para infraestrutura global;
6. seguir os exemplos canônicos;
7. adicionar testes.

---

# 30. Regra para crescimento dos módulos

Arquivos inicialmente devem permanecer simples.

Exemplo:

```text
services.py
selectors.py
models.py
```

Quando crescerem significativamente, podem ser transformados em pacotes:

```text
services/
├── create.py
├── update.py
└── delete.py
```

Não criar estruturas profundas antecipadamente sem necessidade.

A arquitetura deve crescer junto com a complexidade real do domínio.

---

# 31. Filosofia geral

A arquitetura foi desenhada para alcançar simultaneamente:

- baixo acoplamento;
- alta coesão;
- autonomia entre frontend e backend;
- facilidade de manutenção;
- escalabilidade do código;
- facilidade de onboarding;
- desenvolvimento assistido por IA;
- memória arquitetural persistente;
- rastreabilidade das decisões;
- possibilidade futura de múltiplos agentes especializados.

O princípio central é:

> **Código isolado, conhecimento conectado.**

Backend e frontend mantêm suas fronteiras técnicas, enquanto documentação, decisões e memória permitem que humanos e agentes compreendam o sistema como um todo.

---

# 32. Resumo

```text
datasync-core/
│
├── backend/       → aplicação Django autônoma
├── frontend/      → aplicação Angular autônoma
├── docs/          → conhecimento oficial compartilhado
├── .ai/           → memória e procedimentos para IA
├── .claude/       → integração com o Claude Code (carrega AGENTS.md via hook)
├── .github/       → automação e CI/CD
├── AGENTS.md      → regras globais para agentes
├── README.md      → entrada para humanos
├── .gitignore
└── .gitattributes → padroniza fim de linha (LF)
```

Essa estrutura é a baseline arquitetural do projeto e deve ser utilizada como referência para novas implementações, documentação e desenvolvimento assistido por IA.
