# 0001 — Monorepo com projetos autônomos

- **Status:** Aceito
- **Data:** 2026-10-03

## Contexto

O sistema tem backend (Django), frontend (Angular), documentação e uma camada de
conhecimento para agentes de IA. Separar tudo em repositórios dificulta manter código,
documentação e decisões sincronizados; juntar tudo num projeto único acopla
dependências e deploys.

## Decisão

Um **único repositório Git** com projetos **autônomos**:

```text
datasync-core/
├── backend/    → Django (dependências, ambiente, Dockerfile próprios)
├── frontend/   → Angular (idem)
├── docs/       → documentação oficial compartilhada
├── .ai/        → conhecimento e skills para agentes (ADR 0005)
└── .github/    → CI/CD separado por projeto
```

- Backend e frontend **nunca** dependem de arquivos um do outro; comunicação só pela API.
- Cada projeto pode ser extraído para outro repositório sem refatoração estrutural.
- Configuração do Git (`.gitignore`, `.gitattributes`) **só na raiz**.
- Fim de linha padronizado em LF (`.gitattributes`).
- Commits atômicos em Conventional Commits (skill `git-commit`).

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Repositórios separados | documentação e decisões se dessincronizam; mudanças fullstack viram vários PRs |
| Projeto único acoplado | dependências e deploys amarrados entre backend e frontend |

## Consequências

- Uma mudança fullstack pode ser um único commit, quando for uma única mudança lógica.
- Pipelines de CI devem rodar só para o projeto alterado (`backend-*`, `frontend-*`).
- Regras de Git valem para todo o monorepo; um projeto extraído recebe as próprias.
