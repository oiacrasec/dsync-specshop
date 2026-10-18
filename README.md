# datasync-core

Monorepo fullstack com backend e frontend autônomos.

| Parte | Stack | Estado |
|---|---|---|
| `backend/` | Django 5.2 LTS + DRF + PostgreSQL | em desenvolvimento (Entrega 1) |
| `frontend/` | Angular 21 + PrimeNG 21 | em desenvolvimento (Entrega 1) |
| Infra | Docker / Docker Compose | pendente (só o `Dockerfile` do frontend existe) |

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

Cada projeto roda isoladamente. O Docker Compose ainda não existe; por enquanto,
siga [`backend/README.md`](backend/README.md) e [`frontend/README.md`](frontend/README.md).
Estado de cada parte: [`docs/architecture/overview.md`](docs/architecture/overview.md).

## Contribuindo

- Arquitetura: [`docs/architecture/overview.md`](docs/architecture/overview.md)
- Commits: Conventional Commits + commits atômicos — [`.ai/skills/git-commit/SKILL.md`](.ai/skills/git-commit/SKILL.md)
- Agentes de IA: [`AGENTS.md`](AGENTS.md)
