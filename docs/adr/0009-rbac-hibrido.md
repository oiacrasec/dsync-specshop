# 0009 — RBAC híbrido: perfis vinculados + permissões avulsas

- **Status:** Aceito (§3.1, no trecho de organizações, substituído pelo ADR 0037; exceções de
  permissão na atribuição no ADR 0038)
- **Data:** 2026-10-03

## Contexto

Com o multi-tenancy por Contrato e Organização (ADR 0006), cada cliente precisa
controlar o que seus usuários podem fazer, com:

- perfis prontos para começar rápido;
- liberdade para o cliente criar os próprios perfis;
- exceções individuais sem precisar criar um perfil para cada caso;
- separação clara entre o **superadmin** (nós) e o **admin do contrato** (cliente).

No `datasync-spatial` (referência), os perfis são presets fixos no código que apenas
**expandem** permissões gravadas individualmente por usuário. Alterar um preset não
afeta quem já o recebeu, e o cliente não cria perfis.

## Decisão

### 1. Permissões: whitelist no código

- Toda permissão existe num **registry** versionado no código, no formato `recurso:ação`
  (ex.: `organization:create`, `report:export`).
- Ações padrão: `view`, `create`, `update`, `delete`, `manage`, `export`.
- `manage` é uma **ação própria** (ex.: `user:manage`) e **não implica** as outras:
  quem tem `user:manage` não ganha `user:delete` automaticamente.
- É proibido criar permissão fora do registry; o catálogo da UI vem da API.
- **Não** se usa a tabela de permissões do Django (`auth_permission`): a fonte é só o
  registry + as nossas tabelas (`dsc_*`).
- O registry e o cálculo da permissão efetiva ficam em **Python puro**, sem dependência
  do Django, para que o RBAC seja portável (ex.: uma futura migração de framework).
  Só a leitura do banco e a checagem nas views usam o framework.

Referência: o `datasync-spatial` espelha o registry no `auth_permission` (comando
`sync_rbac_permissions`), útil para o Django Admin, que aqui não é usado (ADR 0008).

### 2. Perfis no banco, vinculados

O perfil é um `HybridScopedModel` (ADR 0006 §1.1): `contract` vazio = perfil de
sistema; preenchido = perfil do cliente. Valem as regras de nome do ADR 0006 §1.2.

| Tipo | Origem | Quem edita |
|---|---|---|
| **De sistema essencial** | fixtures (ex.: "Administrador do contrato") | ninguém pela UI: protegido contra edição e exclusão; muda só por fixture/migration |
| **De sistema** | criado pelo superadmin na área administrativa (ADR 0008) | o superadmin |
| **Do cliente** | criado pelo admin do contrato, só com permissões do registry | o admin do contrato |

- O usuário **aponta** para o perfil: alterar o perfil altera a permissão de todos que o têm.
- Excluir um perfil **atribuído** a usuários é **bloqueado**, com aviso
  ("perfil em uso por N usuários"); primeiro removem-se as atribuições.

### 3. Atribuição com escopo

```text
usuário + perfil   + escopo (CONTRACT ou ORGANIZATION)
usuário + permissão avulsa + escopo
```

- Escopo `CONTRACT`: vale para o contrato inteiro.
- Escopo `ORGANIZATION`: vale só para aquela organização.
- O registry declara, para cada permissão, os **escopos permitidos**
  (ex.: `organization:create` → só `CONTRACT`; `stock:create` → `CONTRACT` ou
  `ORGANIZATION`). Atribuição avulsa em escopo não permitido é **rejeitada**.
- **Atribuição no contrato com exceções:** uma atribuição no escopo `CONTRACT` pode
  listar organizações **excluídas** (ex.: "todas as filiais, exceto a Matriz"). Cobre a
  empresa pequena em que uma pessoa trabalha em todas as filiais, sem liberar acesso
  por padrão. Organizações criadas depois entram automaticamente, salvo se excluídas.

- Fora as reservadas (§3.1), **toda permissão vale em qualquer escopo**. O que ela
  alcança é sempre limitado às organizações a que o usuário tem acesso.

#### 3.1 Permissões reservadas ao admin do contrato

O registry marca como **reservadas** as permissões de:

| Recurso | Exemplos |
|---|---|
| Organizações | criar, editar, excluir |
| Usuários | cadastrar, editar, desativar |
| Perfis e atribuições | criar perfis do cliente, atribuir e remover acesso |

Permissões reservadas existem **só** no perfil essencial "Administrador do contrato"
(fixture). Não podem entrar em perfis criados pelo cliente nem ser dadas como avulsas.

Referência: no `datasync-spatial`, qualquer permissão no escopo contrato torna o usuário
"admin do contrato" (acesso a todas as organizações), e a gestão de organizações e
usuários é atribuível como permissão comum, inclusive no escopo organização. Aqui o
admin do contrato é um perfil explícito e essas ações são reservadas.

#### 3.2 Endpoints consolidados

Complementa o ADR 0006 §4 (leitura filtrada pela organização ativa). Endpoints
**consolidados** (ex.: relatório de várias organizações) são uma exceção **explícita e
marcada** no código: em vez da organização ativa, filtram pelo **conjunto de
organizações acessíveis** ao usuário, nunca além dele.

```text
Maria: acesso a Obras e Saúde → relatório consolidado = Obras + Saúde (Educação fora)
```

### 4. Permissão efetiva

```text
permissões efetivas = permissões dos perfis atribuídos ∪ permissões avulsas
```

- Avulsas **só concedem**. Não existe negação de **permissão**; a única restrição é a
  **exceção de organização** numa atribuição no contrato (§3).
- **Nega por padrão**: sem permissão explícita, acesso negado.
- Avaliada para a organização ativa (header `X-Organization-Id`, ADR 0006):
  atribuições no contrato (menos as exceções) ∪ atribuições na organização ativa.
- **View sem permissão declarada é negada.** Endpoint aberto a qualquer autenticado
  só com marcação explícita (ex.: `AllowAuthenticated`).
- O frontend apenas reflete as permissões (esconde e bloqueia rotas); quem decide é
  sempre o backend.

```text
Maria
  perfis: Leitor (contrato, exceto Educação) + Editor (Obras)
  avulsa: report:export (Obras)

  em Obras     → view + create + update + report:export
  em Saúde     → view
  em Educação  → sem acesso (exceção)
```

Referência: no `datasync-spatial`, uma view sem permissão declarada é **liberada** para
qualquer autenticado (falha aberta); aqui é negada.

### 5. Atores

| Ator | Como é definido | Alcance |
|---|---|---|
| 👑 **Superadmin** | `is_superuser` do Django | tudo, pela administração própria (ADR 0008) |
| 🏢 **Admin do contrato** | perfil de sistema "Administrador do contrato" com escopo `CONTRACT` | gerencia organizações, usuários, perfis e atribuições **do próprio contrato** |
| 👤 **Usuário comum** | perfis e avulsas atribuídos | conforme as permissões efetivas |

- O perfil "Administrador do contrato" dá **acesso a tudo** do contrato: as reservadas
  (§3.1) e as de negócio. Não é uma lista fixa: equivale a **todas** as permissões do
  registry, inclusive as que forem criadas depois. Não pode ser editado.
- O **superadmin** cria os usuários admins dos contratos (ADR 0010).
- Um contrato pode ter **vários** admins. Remover o **último** admin do contrato é
  **bloqueado**: o contrato nunca fica sem gestor.
- O admin do contrato **nunca** concede permissões que ele mesmo não tem nem atua
  fora do próprio contrato.

### 6. A atribuição é o acesso

Não existe tabela separada de vínculo usuário × organização. O usuário acessa uma
organização **se e somente se** tiver alguma atribuição (perfil ou avulsa) no escopo
dela ou no escopo do contrato, **salvo exceção** (§3). A lista de organizações para
troca de contexto é derivada das atribuições.

**Superadmin atuando como cliente** (ADR 0006 §3.1): escolhe primeiro o **contrato** e
depois a **organização** (busca por contrato, não lista única). Toda entrada do
superadmin numa organização de cliente é **registrada** (quem, quando, qual), por estar
vendo dados do cliente (skill `lgpd` art. 37; skill `owasp-top-10` A09).

Dados da pessoa na organização (setor, cargo, matrícula), se surgirem, terão tabela
própria, sem dar acesso.

### 7. Entrega

Faz parte da **1ª entrega** do ADR 0006, porque define o acesso às organizações.
A auditoria das **mudanças de permissão** (quem concedeu ou removeu acesso, quando e o
quê) e das alterações de superadmin também entra na 1ª entrega; a auditoria completa
dos demais registros fica na 2ª.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Só permissões avulsas (como o spatial) | mudar um perfil exige reaplicar usuário por usuário; o cliente não cria perfis |
| Só perfis | toda exceção vira um perfil novo, multiplicando perfis |
| Avulsas que também negam | "negar vence" complica a avaliação e a explicação de por que um acesso falha |

## Consequências

- Alterar um perfil tem efeito imediato em todos os usuários: a UI deve deixar isso claro.
- Toda concessão, revogação e mudança de perfil gera evento de auditoria.
- Perfis de sistema **essenciais** (ex.: "Administrador do contrato") mudam só por
  fixture ou migration versionada; os demais perfis de sistema, pelo superadmin na área
  administrativa.
- Testes obrigatórios: isolamento entre contratos, escopo por organização, exceções de
  organização, permissões reservadas, último admin do contrato e view sem permissão
  declarada (deve negar).
