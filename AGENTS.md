# AGENTS.md — datasync-core

Regras globais para agentes de IA neste repositório. Regras específicas ficam em
`backend/AGENTS.md` e `frontend/AGENTS.md` (quando existirem) e prevalecem dentro
de cada projeto.

## Início de toda sessão (obrigatório, qualquer agente)

1. Ler e seguir a skill **`modo-de-trabalho`** (`.ai/skills/modo-de-trabalho/SKILL.md`).
2. Retomar pelo **`.ai/handoff.md`** e pelo plano ativo em `docs/plans/` (skill `handoff`).
3. Confirmar com o usuário onde parou **antes** de executar qualquer coisa.

## Visão geral

Monorepo fullstack com projetos **autônomos**:

| Parte | Stack |
|---|---|
| `backend/` | Django + Django REST Framework + PostgreSQL |
| `frontend/` | Angular |
| Infra | Docker / Docker Compose (por projeto) |

Princípio central: **código isolado, conhecimento conectado.**

## Regras globais

- Backend e frontend **nunca** dependem de arquivos um do outro; comunicação só via API HTTP/REST.
- Cada projeto tem suas próprias dependências, ambiente, `Dockerfile` e documentação.
- A raiz cuida do repositório e do contexto global, não do runtime das aplicações.
  `scripts/` orquestra setup/deploy (ADR 0042); imagens e dependências continuam
  isoladas em backend/ e frontend/.
- O core é base de projetos derivados (forks com remote `core`). Nunca colocar no core
  código ou dado de um projeto derivado, e nunca fazer merge de um projeto no core. Em
  um projeto derivado, não editar arquivos que vêm do core; só acrescentar (ADR 0036).
- Não criar estruturas profundas antecipadamente; a arquitetura cresce com o domínio.
- Performance é premissa global: revisar impacto de toda mudança em consultas,
  escritas, locks, CPU, memória, tráfego e concorrência, no backend e frontend.
  Fluxos cotidianos devem evitar trabalho repetido, efeitos colaterais de leitura
  e custo crescente por item. Medir os caminhos afetados conforme o risco; número
  constante de queries sozinho não prova eficiência. Não entregar gargalos graves
  conhecidos ou adicionar infraestrutura custosa sem justificar sua necessidade.
- Responder ao usuário em **PT-BR**.

## Onde está cada coisa

| Caminho | Conteúdo |
|---|---|
| `docs/architecture/overview.md` | baseline arquitetural oficial (leia antes de mudanças estruturais) |
| `docs/domain/`, `docs/api/` | domínio e contratos de API |
| `docs/adr/` | decisões arquiteturais |
| `docs/plans/` | planos de entrega, com a situação de cada etapa (`entrega-N-<resumo>.md`) |
| `design/` | design system no FigCraft: biblioteca, telas de referência e `tokens.json` (ADR 0040) |
| `.ai/knowledge/` | memória compilada do projeto para IA |
| `.ai/skills/<nome>/SKILL.md` | procedimentos que agentes devem seguir |
| `.ai/queries/` | consultas reutilizáveis de investigação |
| `.ai/handoff.md` | estado atual do trabalho, para retomar em qualquer agente |

### Fontes de verdade (em caso de conflito)

```text
Código atual → ADRs → Documentação oficial → Standards/Patterns → .ai/knowledge/
```

A memória da IA nunca substitui uma decisão oficial.

## Skills

Antes de uma tarefa, verifique se existe skill em `.ai/skills/` para ela.

### Processo

| Skill | Quando usar |
|---|---|
| `modo-de-trabalho` | **início de toda sessão**: preferências permanentes do usuário |
| `handoff` | início de sessão (retomar) e fim de toda etapa ou troca de LLM (passar o bastão) |
| `git-commit` | **sempre** ao criar, dividir ou revisar commits |
| `explicacao-eficiente` | ao explicar algo ao usuário |
| `questionador` | **sempre**: nunca inferir ou supor; parar e perguntar diante de lacunas ou conflitos entre docs, código, pedidos, regras ou leis |
| `verificar-ambiente` | máquina nova, pedido de checar ambiente/plugins, ou ferramenta (LSP, codegraph, rtk) falhando |
| `erros-api-rfc9457` | **sempre** ao criar ou alterar endpoints, exceções e respostas de erro da API |
| `validar-etapa` | **sempre** ao terminar cada etapa do plano de entrega, antes do commit |
| `revisao-performance` | **sempre** ao projetar, implementar e revisar mudanças: banco, processamento, memória, rede e concorrência; medir conforme o risco |
| `owasp-top-10` | **sempre** em code review e antes de entregar mudanças em auth, permissões, endpoints, queries, dependências ou configuração |
| `leis-do-ux` | **sempre** ao criar, alterar ou revisar telas, componentes, formulários, menus, mensagens e layout (inclusive no FigCraft) |

**Nunca inferir, nunca supor; conflitos não se resolvem em silêncio:** sem fonte
verificada, pergunte; ao encontrar divergência, pare, mostre as
fontes lado a lado e pergunte ao usuário (skill `questionador`).

### Conformidade legal

**Comece sempre por `conformidade-legal`**: o roteador indica quais leis se aplicam
à funcionalidade.

| Escopo | Skills |
|---|---|
| Base (todo software) | `lgpd`, `marco-civil`, `acessibilidade`, `propriedade-intelectual`, `crimes-ciberneticos` |
| Por domínio | `cdc`, `eca-digital`, `assinatura-eletronica`, `lai`, `cadastro-positivo`, `saude-digital`, `financeiro-bacen`, `inteligencia-artificial` |

**Conformidade legal é inegociável:** nenhuma mudança pode violar a legislação
brasileira. Se um pedido conflitar com alguma dessas leis, pare, explique o risco
(citando o artigo) e proponha uma alternativa conforme.

## Procedimento de alteração

1. Entender o impacto: componentes afetados, ADRs e docs relacionadas.
2. Implementar seguindo os padrões do projeto afetado.
3. Adicionar/atualizar testes e executá-los.
4. Atualizar `docs/` e `.ai/knowledge/` **no mesmo commit** quando a mudança alterar comportamento, arquitetura ou API.
5. Commitar seguindo a skill `git-commit`.

## Memória (`.ai/knowledge/`)

- É derivada do projeto: corrija-a quando ficar desatualizada.
- Registre mudanças relevantes em `.ai/knowledge/log.md` (data, o que mudou, arquivos afetados).
- Caches reconstruíveis (code graph, índices) não são versionados.
