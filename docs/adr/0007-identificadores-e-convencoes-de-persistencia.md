# 0007 — Identificadores e convenções de persistência

- **Status:** Aceito
- **Data:** 2026-10-03

## Contexto

Com o multi-tenancy por coluna (ADR 0006), identificadores de contratos e
organizações circulam em headers, URLs e JSON. IDs sequenciais expostos permitem
**enumerar** clientes e registros (skill `crimes-ciberneticos`). Ao mesmo tempo, chaves
grandes ou aleatórias degradam índices e joins.

Também é preciso padronizar nomes de tabelas, idioma do código e exclusão de dados.

## Decisão

### 1. Dois identificadores

```text
id         BIGINT  PK              → interno: FKs, joins, índices. NUNCA exposto na API
public_id  UUID v7 UNIQUE NOT NULL → externo: URLs, headers, payloads
```

- `public_id` em **UUID v7**: começa pelo timestamp, então é inserido em ordem no
  índice (desempenho próximo de sequencial).
- Gerado na aplicação com `uuid.uuid7()` (nativo no Python 3.14). O PostgreSQL 17 em
  uso não tem `uuidv7()` nativo.
- **Toda** tabela dos nossos apps tem `public_id`, sem exceção, via `BaseModel`
  (evita a tabela "interna" que um dia passa a ser exposta sem ele).

#### 1.1 `BaseModel`

Base abstrata de todos os models dos nossos apps. Os quatro tipos de escopo do
ADR 0006 (`SharedModel`, `HybridScopedModel`, `ContractScopedModel`,
`OrganizationScopedModel`) herdam dela.

| Campo / recurso | Descrição |
|---|---|
| `id` | BIGINT, chave primária interna |
| `public_id` | UUID v7, único, gerado automaticamente, não editável |
| `created_at` / `updated_at` | obrigatórios (não nulos), em UTC |
| `created_by` / `updated_by` | usuário que criou / alterou por último |
| `is_active` | situação de negócio: **inativo continua visível** (ex.: produto fora de linha) |
| `deleted_at` / `deleted_by` | soft delete: **excluído some** das consultas padrão (§4) |
| `objects` | gerenciador padrão, sem os excluídos, filtrado pelo contexto de tenant (ADR 0006 §1.3, etapa 2.4) |
| `all_objects` | inclusive excluídos, também filtrado pelo contexto (uso explícito: auditoria, expurgo); acesso global só por `.unscoped()` (decisão do usuário na etapa 2.4) |

"Inativo" e "excluído" são estados diferentes e têm campos diferentes.

#### 1.2 Usuário

O `User` herda do `AbstractUser` do Django e recebe `public_id`, datas e soft delete
do `BaseModel`, mas **mantém o `is_active` do Django** (que bloqueia o login), sem
duplicar o campo.

Referência: o `BaseModel` do `datasync-spatial` tem campos de auditoria, soft delete e
expurgo, mas **não tem `public_id`** (expõe IDs inteiros).

### 2. Prefixo de tabela `dsc_`

- Tabelas dos **nossos** apps: `dsc_<nome>` no **singular**, em snake_case
  (ex.: `dsc_contract`, `dsc_organization`, `dsc_stock_movement`, `dsc_user`).
- O nome é gerado **automaticamente** pelo `BaseModel` a partir do nome da classe
  (`StockMovement` → `dsc_stock_movement`). Declarar `db_table` manualmente só em
  casos especiais, com justificativa.
- Tabelas de relação N:N criadas pelo Django seguem a tabela de origem
  (ex.: `dsc_profile_permissions`).
- Tabelas do Django e de bibliotecas (`auth_*`, `django_*`) mantêm o nome padrão.

### 3. Idioma

| Onde | Idioma |
|---|---|
| Código: classes, campos, tabelas, headers, rotas da API | inglês |
| Valores armazenados de listas fixas (choices) | inglês (ex.: `CONTRACT`, `ORGANIZATION`) |
| Textos para o usuário: rótulos, mensagens, erros | português |
| Documentação (`docs/`, ADRs, skills) | português |
| Mensagens de commit | inglês (skill `git-commit`) |

Textos para o usuário ficam **prontos para tradução**: sempre com `gettext_lazy`
(`_('contrato')`), nunca string literal.

### 4. Soft delete com expurgo

Soft delete **não é** eliminação (skill `lgpd`, arts. 15 e 16). Por isso a exclusão
tem duas etapas, e a definitiva é sempre controlada.

#### 4.1 Exclusão

| Etapa | Como |
|---|---|
| Exclusão pela API | sempre **soft delete** (`deleted_at`, `deleted_by`) |
| Exclusão definitiva | só pela **rotina de expurgo** ou pelo **comando de eliminação**; nunca por endpoint comum |
| Prazo na lixeira | **90 dias** por padrão; cada model pode declarar outro prazo |

#### 4.2 Rotina de expurgo

- Management command com `--dry-run`, por contrato ou global, **auditado**, executado
  de forma **agendada**.
- **Pula** todo registro que tiver:
  - **retenção mínima** ainda válida, declarada no model para obrigações fixas da lei
    (ex.: registro de acesso 6 meses, Marco Civil art. 15; prontuário 20 anos,
    Lei 13.787 art. 6º);
  - **`LegalHold`** ativo (§4.4).

#### 4.3 Eliminação a pedido do titular

- **Management command próprio** para o pedido de eliminação (LGPD art. 18 VI): elimina
  na hora, sem esperar os 90 dias, com `--dry-run` e auditado.
- Respeita retenção mínima e `LegalHold`; o que não puder ser eliminado é informado
  com o motivo (LGPD art. 18 §4º II).

#### 4.4 `LegalHold`

Bloqueio de expurgo por obrigação **pontual** (ex.: ordem judicial, requisição
cautelar de autoridade, Marco Civil art. 15 §2º), cadastrado pelo superadmin:

| Campo | Descrição |
|---|---|
| escopo | contrato inteiro, uma tabela ou um registro |
| motivo | texto obrigatório |
| criado por / em | quem cadastrou e quando |
| válido até | data final (ou até ser encerrado) |

#### 4.5 Registro de eliminações e restauração de backup

- Toda exclusão definitiva grava um **registro de eliminação**: tabela, `public_id` e
  data, **sem nenhum dado pessoal**.
- Restaurar um backup pode **ressuscitar** registros apagados depois da data do backup.
  Após qualquer restauração, um comando **reaplica** as eliminações registradas.

#### 4.6 Fim de contrato

- O cliente recebe uma **exportação** dos seus dados (portabilidade, LGPD art. 18 V).
- Os dados ficam retidos pelo **prazo de retenção pós-contrato definido no contrato**:
  **padrão de 90 dias, máximo de 1 ano**. Enquanto o tratamento está dentro do período
  contratado, a retenção é legítima (LGPD art. 15 II).
- O `Contract` (ADR 0006) ganha o campo **`post_termination_retention_days`**
  (padrão 90, máximo 365).
- Dentro do prazo, o cliente pode **voltar** (pagando o plano) e o contrato é reativado
  com os dados intactos.
- No fim do prazo, o sistema **avisa o superadmin**, que escolhe a ação. A eliminação
  **não é automática**.

| Ação | Quando |
|---|---|
| Eliminar os dados | o cliente não voltou |
| Reativar o contrato | o cliente pagou o plano e voltou |
| Criar `LegalHold` | há obrigação legal de guardar (§4.4) |
| Prorrogar | só até completar **1 ano** desde o fim do contrato |

Condições legais da retenção:

- prevista no **contrato** com o cliente; no B2B o cliente é o **controlador** e nós
  guardamos por instrução dele (LGPD art. 39); no B2C, por cláusula clara ou
  consentimento revogável (arts. 7º I e 8º §5º);
- durante a retenção, pedidos de eliminação do titular continuam sendo atendidos (§4.3);
- a segurança dos dados é mantida mesmo com o contrato inativo (art. 47);
- na eliminação, valem as exceções de retenção mínima e `LegalHold`.

#### 4.7 Transparência

Os prazos (lixeira, fim de contrato, retenções) constam da **política de privacidade**
(LGPD art. 9º II).

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Só `BIGINT` exposto | permite enumeração de clientes e registros |
| UUID como PK | FKs e índices com 16 bytes em toda relação |
| UUID **v4** no `public_id` | fragmenta o índice; esconder a data de criação não é requisito |
| Prefixar tabelas do Django | frágil para migrations e bibliotecas |
| Hard delete direto | perde rastreabilidade exigida pela auditoria |

## Consequências

- Serializers e URLs usam `public_id`; o `id` nunca aparece na API (revisar em code review).
- O `public_id` v7 revela o instante de criação do registro, o que foi **aceito**.
- A tabela de usuários existente passa a se chamar `dsc_user` (migration inicial
  regenerada; o banco ainda está vazio).
- Toda nova entidade com dado pessoal precisa declarar retenção e expurgo.
