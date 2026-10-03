# 0003 — Arquitetura do frontend

- **Status:** Proposto
- **Data:** 2026-10-03

## Contexto

O frontend é o cliente principal da API. Ele precisa organizar o código por
funcionalidade, gerenciar o contexto de contrato/organização (ADR 0006) e oferecer
uma área administrativa própria (ADR 0008), sempre acessível (skill `acessibilidade`).

Um projeto de referência será analisado antes da implementação; este ADR registra
apenas o que já está definido no overview.

## Decisão

- **Angular**, projeto autônomo em `frontend/` (ADR 0001).
- Organização por **funcionalidade**, não por tipo de arquivo:

```text
src/app/
├── core/       → infraestrutura global e singletons (auth, guards, interceptors, config)
├── layout/     → estrutura visual global (header, sidebar, footer)
├── shared/     → só o que é reutilizado por várias features
└── features/   → cada funcionalidade com suas pages, components, services, models e rotas
```

- Componente usado por uma única feature fica **dentro** dela.
- Acessibilidade obrigatória: WCAG 2.2 AA.

## Pontos em aberto

- Versão (última LTS do Angular no momento da implementação) e biblioteca de componentes.
- Gerenciamento de estado.
- Fluxo de seleção e troca de organização (header `X-Organization-Id`) e entrada direta do superadmin na área administrativa.
- Armazenamento do token JWT (a referência usa `localStorage`, exposto a XSS; skill `owasp-top-10`, A07).
- Estrutura da área administrativa (ADR 0008).
- Componentes de seleção (referência `datasync-gis`): `ui-autocomplete` com padrão de 20 linhas e `public_id`; novo **autocomplete múltiplo**; contrato no ADR 0011.
- Revisão após análise do projeto de referência.
- Componente `ui-table` (referência `datasync-gis`): padrão de **20** linhas (opções 10/20/50); o serviço converte `total_records` → `totalRecords`; esquema buscado em `…/schema/` (ADR 0004).

## Consequências

- Nenhum serviço de feature entra em `core/`; nenhum componente de uma só feature entra em `shared/`.
- O frontend não guarda regra de autorização própria: só reflete o que a API autoriza.
