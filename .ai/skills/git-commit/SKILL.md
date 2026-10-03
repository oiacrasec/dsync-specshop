---
name: git-commit
description: Cria commits seguindo o padrão do projeto (Conventional Commits + commits atômicos). Use sempre que for criar, dividir, revisar ou reescrever commits, ou quando o usuário pedir "commita", "faz o commit", "separa em commits" ou revisar mensagens de commit.
---

# Padrão de commits do datasync-core

Padrão completo: [reference.md](reference.md). Este arquivo é o procedimento operacional.

## Formato

```text
<type>(<scope>): <description>

[corpo opcional: por quê, contexto, impactos, decisões não evidentes no diff]

[footer opcional: BREAKING CHANGE: ..., Refs: #123, Closes: #123]
```

`scope` pode ser omitido quando não agrega valor (`docs: update project architecture`).

### Types permitidos

`feat` nova funcionalidade · `fix` correção de bug · `refactor` sem mudança funcional · `perf` performance · `test` testes · `docs` documentação · `style` formatação sem lógica · `build` build/dependências · `ci` pipelines · `chore` manutenção · `revert` reversão

### Scopes

Iniciais: `backend`, `frontend`, `api`, `auth`, `users`, `db`, `docker`, `docs`, `ai`, `ci`. Novos scopes podem surgir por domínio. Nunca usar scopes vagos: `app`, `code`, `stuff`, `misc`.

### Descrição

- curta e objetiva, em inglês;
- verbo no imperativo (`add`, não `added`/`adds`);
- começa com minúscula;
- sem ponto final.

### Breaking changes

`feat(api)!: change user response structure` ou footer `BREAKING CHANGE: user.name was replaced by user.full_name.`

## Procedimento obrigatório antes de commitar

1. **Analisar o diff**: `git status` e `git diff` (incluindo staged: `git diff --cached`).
2. **Contar mudanças lógicas.** Regra: 1 mudança lógica = 1 commit (não 1 arquivo = 1 commit). Se houver mais de uma, separar em commits distintos, adicionando arquivos explicitamente (`git add <paths>`), nunca `git add -A` às cegas.
3. **Monorepo:** agrupar por mudança lógica, não por diretório. Uma mudança fullstack inseparável (backend + frontend + docs + `.ai/knowledge/`) pode ficar em um único commit.
4. **Docs sincronizadas:** se a mudança altera comportamento, arquitetura, API ou conhecimento do sistema, atualizar `docs/` e `.ai/knowledge/` no mesmo commit, quando possível.
5. **Identificar `type` e `scope`.**
6. **Escrever a descrição** no imperativo; adicionar corpo quando a motivação não for óbvia.
7. **Garantir que os testes relevantes rodaram** antes de commitar; se não rodaram, avisar o usuário.
8. Usar heredoc/arquivo para mensagens com corpo, preservando quebras de linha.

## Proibido

Mensagens genéricas: `update`, `changes`, `fix`, `misc`, `wip`, `adjustments`, `final`, `final2`, `fix again`, `chore: stuff`, `feat: final version`, `fix: fix bug`.

Commits que misturam mudanças sem relação, ex.: `feat: add authentication, fix sidebar and update README` → separar em `feat(auth): ...`, `fix(frontend): ...`, `docs: ...`.

## Histórico

Commits temporários (`wip`, `fix typo`, `try again`, `now works`) devem ser consolidados (squash/fixup) antes do merge. Reescrever histórico já publicado só com autorização explícita do usuário.

## Checklist final

Toda mensagem deve responder: **o que mudou? onde mudou? por que existe?** Um commit = uma mudança lógica, clara e reversível.
