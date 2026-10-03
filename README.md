# datasync-core

Monorepo fullstack com backend e frontend autônomos.

| Parte | Stack | Estado |
|---|---|---|
| `backend/` | Django + DRF + PostgreSQL | pendente |
| `frontend/` | Angular | pendente |
| Infra | Docker / Docker Compose | pendente |

## Estrutura

```text
datasync-core/
├── backend/       → aplicação Django autônoma
├── frontend/      → aplicação Angular autônoma
├── docs/          → documentação oficial (arquitetura, domínio, API, ADRs)
├── .ai/           → memória e procedimentos (skills) para agentes de IA
├── .claude/       → integração com o Claude Code
├── .github/       → CI/CD
├── AGENTS.md      → regras globais para agentes de IA
└── README.md      → este arquivo
```

## Como rodar

Cada projeto roda isoladamente:

```bash
cd backend && docker compose up
cd frontend && docker compose up
```

> Os projetos ainda serão criados — veja o estado atual em
> [`docs/architecture/overview.md`](docs/architecture/overview.md).

## Contribuindo

- Arquitetura: [`docs/architecture/overview.md`](docs/architecture/overview.md)
- Commits: Conventional Commits + commits atômicos — [`.ai/skills/git-commit/SKILL.md`](.ai/skills/git-commit/SKILL.md)
- Agentes de IA: [`AGENTS.md`](AGENTS.md)
