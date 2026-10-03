# 0006 — Multi-tenancy por Contrato e Organização

- **Status:** Aceito
- **Data:** 2026-10-03

## Contexto

O sistema atende vários clientes (B2B e B2C) com mensalidade por **plano**. Requisitos
levantados:

- os dados de um cliente nunca podem ser vistos por outro;
- um cliente não deve pagar pelo processamento gerado por outro;
- alguns clientes querem rodar o **sistema inteiro** no próprio servidor;
- a quantidade futura de clientes é desconhecida.

O projeto `datasync-spatial` foi usado como **referência de conceito** (não de código):
`Contrato` → `Organização` → `Setor`, contexto por header e banco único.

## Decisão

### 1. Banco único com isolamento lógico por coluna

Um único banco PostgreSQL por implantação. O isolamento entre clientes é feito por
colunas de contexto (`contract_id`, `organization_id`) nos models de negócio.

#### 1.1 Escopo sempre declarado

Todo model dos nossos apps herda **um** dos tipos abaixo. A ausência de campo nunca
define o escopo: model sem tipo declarado é barrado por system check.

| Tipo | `contract` | `organization` | Exemplo | Leitura (usuário comum) | Escrita |
|---|---|---|---|---|---|
| `OrganizationScopedModel` 🥇 | obrigatório | obrigatório | entradas e saídas de estoque | só a própria organização | só a própria organização |
| `ContractScopedModel` | obrigatório | — | produtos | todo o contrato | o próprio contrato |
| `HybridScopedModel` | vazio = sistema · preenchido = cliente | — | categorias, perfis | do sistema + do próprio contrato | só os do próprio contrato; os do sistema só o superadmin |
| `SharedModel` | — | — | país, cidade, plano | todos os autenticados | só o superadmin |

- **`OrganizationScopedModel` é o padrão**: a grande maioria das tabelas guarda
  `contract` **e** `organization`, inclusive tabelas filhas (ex.: item de uma entrada).
  A coluna de contexto fica **sempre na própria tabela**, nunca é inferida pelo pai.
- Índices compostos começam pelo contexto: `(contract_id, organization_id, …)`.
- O superadmin vê todos os registros de todos os tipos.

#### 1.2 Regras do `HybridScopedModel`

| Situação | Regra |
|---|---|
| Cliente cria registro com nome igual a um **do sistema** | 🚫 bloqueado |
| Cliente cria registro com nome igual a um **de outro cliente** | ✅ permitido |
| Cliente cria registro com nome repetido **no próprio contrato** | 🚫 bloqueado |
| Superadmin cria registro do sistema com nome já usado por clientes | ✅ permitido, **avisando** quais contratos ficaram com nome duplicado |
| Cliente quer variação de um registro do sistema | cria um **registro novo**, com outro nome (sem duplicar nem editar o do sistema) |

#### 1.3 Proteção contra vazamento entre contratos

Referência analisada: no `datasync-spatial` o filtro é aplicado só na camada de view,
por heurística de nome de campo, sem testes. Aqui a proteção é **obrigatória e em camadas**:

| Camada | Mecanismo | Entrega |
|---|---|---|
| A. Model | tipo de escopo declarado (1.1) | agora |
| B. Manager | **fail closed**: sem contexto, a query falha; acesso global só por `.unscoped()` explícito (superadmin, comandos) | agora |
| C. Contexto | middleware grava o contexto validado num `contextvar`; tarefas e comandos definem o seu explicitamente | agora |
| D. View | mixin injeta `contract`/`organization` no create/update a partir do contexto | agora |
| E. Serializer | FKs restritas automaticamente ao contexto (anti-IDOR) | agora |
| F. Testes + check | teste de isolamento genérico para todo model com escopo + system check de escopo declarado | agora |
| G. Row-Level Security | política no PostgreSQL bloqueando linhas fora do contexto | **depois** |

### 2. Hierarquia de contexto

```text
Contract       (cliente: ex. prefeitura, empresa)
└── Organization  (unidade interna: ex. secretaria, filial)
    └── Sector    (fase futura: só dimensão de negócio, não restringe acesso)
```

| Regra | |
|---|---|
| Usuário comum | pertence a **exatamente 1** `Contract` ativo (garantido no banco) |
| | acessa as `Organization` do seu contrato em que tiver **atribuição** (perfil ou permissão, ADR 0009) e pode trocar entre elas |
| | atribuição no escopo do **contrato** = acesso a todas as organizações; no escopo da **organização** = só àquela |
| | sem atribuição = sem acesso (a organização nem aparece para troca) |
| Contrato | tem **N** usuários e **N** organizações |
| Superusuário (`is_superuser`) | administra o sistema pela **administração própria** (ADR 0008); pode operar sem contexto |

### 2.1 Dados do contrato

| Campo | Descrição |
|---|---|
| `name` | nome do cliente |
| `start_date` / `end_date` | vigência (`end_date` opcional) |
| `licenses` | quantidade de licenças (usuários) contratadas |
| `plan` | plano contratado (compartilhado, dedicado ou servidor próprio) |
| `is_active` | situação |

**Vigência e licenças:**

| Situação | Comportamento |
|---|---|
| Contrato vencido (`end_date` passou) ou desativado (`is_active = false`) | usuários **bloqueados no login** |
| Usuário já logado quando o contrato vence ou é desativado | a validação de contexto checa o contrato a **cada requisição**: as próximas são negadas e o usuário é **deslogado** |
| Cadastro de usuário além de `licenses` | **bloqueado com aviso** ("limite de licenças atingido") |

O plano é uma **entidade própria** (`Plan`), com nome, modalidade e limites, editável
pela administração sem deploy. Os campos de limite serão detalhados na implementação.

### 3. Contexto por requisição (stateless)

- Autenticação por **JWT**. Após o login, o usuário comum **escolhe a organização**
  (entre as que tem acesso) e pode trocá-la a qualquer momento.
- Toda requisição de negócio envia **um único header**:
  - `X-Organization-Id: <public_id da organização>`
- O **contrato vem do usuário autenticado** (cada usuário pertence a 1 contrato); não há
  header de contrato.
- O backend **não guarda** o contexto em sessão.
- Validação **fail closed**: sem contexto válido, nega.
- A cada requisição, o contrato do usuário é conferido (vigência e situação, seção 2.1).

| Situação | Resposta |
|---|---|
| Header ausente ou malformado (UUID inválido) | **400** |
| Organização inexistente ou fora do contrato do usuário | **403** |
| Usuário sem atribuição na organização nem no contrato (ADR 0009) | **403** |
| Contrato vencido ou desativado | **403** e o usuário é deslogado |

O corpo do erro traz um código identificável (ex.: `context_invalid_request`,
`context_forbidden`) para o frontend limpar o contexto e voltar à seleção; o formato
completo é definido no ADR 0004.

#### 3.1 Superadmin

| Situação | Comportamento |
|---|---|
| **Sem** `X-Organization-Id` (padrão) | entra direto na **área administrativa** (ADR 0008): vê tudo e cadastra os registros comuns a todos os clientes |
| **Com** `X-Organization-Id` (opcional) | atua **dentro** daquela organização, enxergando os dados como o cliente enxerga (ex.: suporte) |

O superadmin não pertence a contrato; ao escolher uma organização, o contrato é o dela.

Endpoints sem contexto obrigatório: autenticação, lista de organizações do usuário e
endpoints da área administrativa.

### 4. Escopo dos dados

| Operação | Regra |
|---|---|
| Leitura | sempre filtrada pelo contexto, conforme o tipo de escopo do model (§1.1) |
| Criação | `contract` e `organization` gravados **a partir do contexto validado**; valores enviados no payload são ignorados |
| Alteração e exclusão | só em registros dentro do contexto ativo |

- Registro **fora do contexto** (de outra organização ou de outro contrato) responde
  **404**, como se não existisse. Não se usa 403 para não revelar a existência do
  registro (skill `owasp-top-10`, A01).
- O 403 fica reservado para falhas do **próprio contexto** (§3) e para falta de
  permissão sobre um registro visível (ADR 0009).

### 5. Isolamento físico por implantação

O mesmo código atende três modalidades:

| Plano | Onde roda | Isolamento de processamento |
|---|---|---|
| Compartilhado | nossa implantação, banco único | compartilhado (com limites por plano) |
| Dedicado | **implantação exclusiva** na nossa infraestrutura | total |
| Servidor próprio | **sistema inteiro** no servidor do cliente | total (custo do cliente) |

Quem precisa de isolamento físico recebe uma **implantação própria**, não um banco
separado dentro da mesma implantação.

Em **qualquer** modalidade, inclusive no servidor do cliente:

| Papel | Quem é |
|---|---|
| 👑 Superadmin | **só nós** (equipe do produto) |
| 🏢 Admin do contrato | o cliente; no servidor próprio, normalmente o **TI do cliente** |

O cliente opera a infraestrutura do servidor dele, mas não tem superadmin no sistema:
não altera registros do sistema, planos nem licenças.

### 6. Entregas

| Entrega | Conteúdo |
|---|---|
| 1ª | `Contract`, `Organization`, `Plan`, resolução de contexto (`X-Organization-Id`), **RBAC híbrido** (ADR 0009, inclui o admin do contrato) e **registro de acesso** (IP, porta, data e hora em UTC, usuário, contrato e organização; guarda de 6 meses, skill `marco-civil` art. 15) |
| 2ª | Auditoria completa de alterações (antes, depois e diff) |
| 3ª | `Sector` e demais dimensões |
| Depois | Row-Level Security (camada G, §1.3) |

O registro de acesso entra na 1ª entrega porque é obrigação legal desde a entrada em
produção.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Schema por cliente (`django-tenants`) | biblioteca de terceiros; migrations por schema; não resolve o cliente que roda no próprio servidor |
| Banco por cliente na mesma implantação | múltiplos pools de conexão, migrations em N bancos e router próprio, sem isolar CPU/RAM se estiver no mesmo servidor |
| Contexto em sessão | acopla o estado ao servidor e dificulta troca de contexto e escala horizontal |

## Consequências

**Ganhos**
- Uma única base de código e de migrations; operação simples.
- Isolamento total disponível a quem paga por ele (implantação dedicada ou própria).
- Contexto explícito em cada requisição, auditável.

**Custos e obrigações**
- **Risco de vazamento por filtro esquecido** → o filtro de contexto deve ser aplicado
  por mecanismo central (queryset/mixin), nunca manualmente em cada view, e coberto por
  testes de isolamento entre contratos.
- Clientes do plano compartilhado dividem processamento; o plano precisa prever limites.
- O frontend precisa gerenciar a seleção e a troca de contexto.

**Conformidade (skills legais)**
- `lgpd`: no SaaS, o cliente é **controlador** e nós somos **operador** (arts. 5º VI-VII
  e 39); em servidor próprio, a responsabilidade pela infraestrutura é do cliente e
  deve constar em contrato.
- `marco-civil`: registros de acesso (art. 15) gravam contrato e organização do contexto.
- `cdc`: mudança de plano não pode ser unilateral (art. 51 X e XIII).

## Decisões relacionadas

- Permissões, perfis, admin do contrato e acesso às organizações: **RBAC híbrido** (ADR 0009), na 1ª entrega.
- Administração própria, sem o Django Admin (ADR 0008).
- Identificadores e convenções de persistência (ADR 0007).
