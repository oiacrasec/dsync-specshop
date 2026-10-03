# Padrão de Commits

## 1. Objetivo

Este documento define o padrão oficial de commits do projeto.

O objetivo é manter um histórico Git:

- legível;
- previsível;
- fácil de revisar;
- adequado para `git log`, `git blame`, `git bisect` e `revert`;
- compatível com automações de CI/CD;
- adequado para geração de changelog;
- compreensível por humanos e agentes de IA.

O projeto adota **commits atômicos** e a convenção **Conventional Commits**.

---

# 2. Formato padrão

Todo commit deve seguir preferencialmente este formato:

```text
<type>(<scope>): <description>
```

Exemplo:

```text
feat(auth): add JWT authentication
```

O `scope` pode ser omitido quando não agregar valor:

```text
docs: update project architecture
```

---

# 3. Tipos permitidos

| Tipo | Uso |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem alteração funcional esperada |
| `perf` | Melhoria de performance |
| `test` | Criação ou alteração de testes |
| `docs` | Documentação |
| `style` | Formatação ou estilo sem alteração de lógica |
| `build` | Build, dependências ou empacotamento |
| `ci` | Pipelines e automações de CI/CD |
| `chore` | Manutenção geral |
| `revert` | Reversão de commit anterior |

---

# 4. Scopes

Scopes indicam a área afetada pela mudança.

Scopes iniciais sugeridos:

```text
backend
frontend
api
auth
users
db
docker
docs
ai
ci
```

Outros scopes podem ser adicionados conforme novos domínios surgirem.

Exemplos:

```text
feat(auth): add refresh token support
fix(frontend): handle expired session
refactor(users): move queries to selectors
test(backend): add service coverage
docs(api): document authentication endpoints
ci(frontend): add Angular build workflow
```

Evitar scopes vagos:

```text
app
code
stuff
misc
```

---

# 5. Commit atômico

Um commit deve representar **uma única mudança lógica**.

Bom:

```text
feat(auth): add password reset flow
```

Esse commit pode alterar vários arquivos se todos fizerem parte da mesma funcionalidade.

Ruim:

```text
feat: add authentication, fix sidebar and update README
```

O correto seria separar:

```text
feat(auth): add authentication flow
fix(frontend): correct sidebar behavior
docs: update development setup
```

A regra não é:

```text
1 arquivo = 1 commit
```

A regra correta é:

```text
1 mudança lógica = 1 commit
```

---

# 6. Descrição do commit

A descrição deve:

- ser curta;
- ser objetiva;
- explicar a mudança principal;
- usar verbo no imperativo;
- começar com letra minúscula;
- não terminar com ponto.

Preferir:

```text
feat(auth): add refresh token rotation
```

Evitar:

```text
feat(auth): added refresh token rotation
```

Evitar:

```text
feat(auth): changes
```

---

# 7. Corpo do commit

Para alterações simples, apenas o título é suficiente.

Exemplo:

```text
fix(auth): reject expired refresh tokens
```

Quando a motivação não for óbvia, adicionar um corpo:

```text
refactor(users): move user queries to selectors

Move read-only database queries out of views to keep the HTTP
layer thin and follow the backend architecture standard.
```

O corpo deve explicar principalmente:

- por que a mudança foi feita;
- contexto importante;
- impactos relevantes;
- decisões que não estão evidentes no diff.

---

# 8. Breaking Changes

Mudanças incompatíveis devem ser explicitamente marcadas.

Formato curto:

```text
feat(api)!: change user response structure
```

Ou:

```text
feat(api): change user response structure

BREAKING CHANGE: user.name was replaced by user.full_name.
```

---

# 9. Commits em monorepo

O projeto é um monorepo com backend e frontend autônomos.

Commits devem ser organizados por mudança lógica, e não obrigatoriamente por diretório.

Exemplos:

```text
feat(auth): add login API
```

```text
feat(auth): add login page
```

Uma alteração fullstack pode permanecer em um único commit quando backend, frontend e documentação fizerem parte inseparável da mesma mudança lógica.

Exemplo:

```text
feat(auth): support refresh token rotation
```

Esse commit pode alterar:

```text
backend/
frontend/
docs/
.ai/knowledge/
```

desde que todas as mudanças representem a mesma funcionalidade.

---

# 10. Código e documentação sincronizados

Sempre que uma mudança alterar comportamento, arquitetura, API ou conhecimento relevante do sistema, a documentação associada deve ser atualizada no mesmo commit quando possível.

Exemplo:

```text
feat(auth): add refresh token rotation
```

Pode incluir:

```text
backend/apps/users/services.py
docs/api/authentication.md
.ai/knowledge/flows/authentication.md
```

Isso garante que cada ponto do histórico Git represente um estado coerente do projeto.

---

# 11. Commits gerados por IA

Agentes de IA devem seguir exatamente as mesmas regras aplicadas a desenvolvedores humanos.

Antes de criar um commit, o agente deve:

1. analisar o diff;
2. verificar se existe mais de uma mudança lógica;
3. separar commits quando necessário;
4. identificar o `type`;
5. identificar o `scope`;
6. escrever descrição clara no imperativo;
7. atualizar documentação e memória relacionadas;
8. garantir que testes relevantes foram executados.

Agentes não devem criar commits genéricos como:

```text
update
changes
fix
misc
wip
adjustments
final
final2
fix again
```

---

# 12. Exemplos recomendados

## Nova funcionalidade

```text
feat(users): add user registration
```

## Correção de bug

```text
fix(auth): prevent reuse of revoked tokens
```

## Refatoração

```text
refactor(users): move read queries to selectors
```

## Performance

```text
perf(api): reduce duplicated database queries
```

## Testes

```text
test(users): add registration service tests
```

## Documentação

```text
docs(backend): document service layer pattern
```

## Infraestrutura

```text
build(backend): update Django dependencies
```

## CI/CD

```text
ci(frontend): add production build pipeline
```

## IA

```text
docs(ai): update authentication knowledge
```

## Banco de dados

```text
feat(db): add user profile migration
```

---

# 13. Exemplos que devem ser evitados

```text
update
fix
changes
misc
chore: stuff
feat: final version
fix: fix bug
wip
```

Essas mensagens não explicam o que realmente mudou.

---

# 14. Relação com Pull Requests

Um PR pode conter vários commits pequenos e coerentes.

Exemplo:

```text
feat(auth): add login endpoint
feat(auth): add login page
test(auth): add authentication tests
docs(auth): document authentication flow
```

Evitar um único commit gigantesco que misture implementação, correções paralelas e mudanças sem relação.

---

# 15. Rebase e histórico limpo

Antes de integrar mudanças, pode ser utilizado rebase interativo para:

- juntar commits temporários;
- corrigir mensagens;
- separar mudanças indevidamente agrupadas;
- remover commits intermediários sem valor histórico.

Exemplos de commits temporários que devem ser reorganizados antes do merge:

```text
wip
fix typo
try again
fix test
now works
```

O histórico principal deve registrar mudanças relevantes, não o caminho acidental percorrido durante o desenvolvimento.

---

# 16. Squash

Squash pode ser utilizado quando vários commits intermediários representam uma única mudança lógica.

Exemplo durante o desenvolvimento:

```text
feat(auth): start refresh token flow
fix(auth): fix refresh logic
test(auth): fix failing test
```

Se esses commits forem apenas etapas intermediárias da mesma implementação, eles podem ser consolidados antes do merge.

---

# 17. Referência a issues

Quando aplicável, issues podem ser referenciadas no corpo ou footer do commit.

Exemplo:

```text
fix(auth): reject revoked refresh tokens

Refs: #142
```

Ou:

```text
Closes: #142
```

---

# 18. Validação automática

O projeto pode utilizar ferramentas como `commitlint` para validar mensagens automaticamente.

Exemplo válido:

```text
feat(auth): add refresh token support
```

Exemplo inválido:

```text
Added refresh token
```

A validação pode ser integrada a:

- hooks locais;
- CI;
- Pull Requests.

---

# 19. Regra resumida

Todo commit deve responder claramente:

```text
O que mudou?
Onde mudou?
Por que esta mudança existe?
```

Formato padrão:

```text
<type>(<scope>): <imperative description>
```

Exemplo ideal:

```text
feat(auth): add refresh token rotation
```

Princípio central:

> **Um commit deve representar uma mudança lógica, clara e reversível.**

Esse padrão deve ser seguido por desenvolvedores humanos, agentes de IA e automações do projeto.
