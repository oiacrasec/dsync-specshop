# 0012 — Exceções ao escopo declarado

- **Status:** Aceito
- **Data:** 2026-10-03
- **Complementa:** ADR 0006 §1.1

## Contexto

O ADR 0006 §1.1 exige que **todo** model dos nossos apps herde um dos quatro tipos de
escopo (`SharedModel`, `HybridScopedModel`, `ContractScopedModel`,
`OrganizationScopedModel`), barrando por system check o model sem tipo.

Dois models não cabem em nenhum dos quatro:

- **`Contract`** é o próprio tenant: um cliente novo entra no sistema **pelo contrato**.
  Ele não pertence a um contrato; ele **é** o contrato. `SharedModel` permitiria que
  qualquer usuário lesse todos os contratos.
- **`User`** pertence a um contrato, mas o superadmin não pertence a nenhum (ADR 0010).

## Decisão

Lista **fechada** de exceções:

| Model | Herda | Visibilidade |
|---|---|---|
| `Contract` | `BaseModel` (raiz do tenant) | superadmin: todos · usuário comum: só o próprio contrato |
| `User` | `AbstractUser` + campos do `BaseModel` (ADR 0007 §1.2), com campo `contract` vazio para superadmin | superadmin: todos · admin do contrato: os usuários do próprio contrato |

- O system check do ADR 0006 continua valendo e aceita **somente** os models desta lista.
- A visibilidade de cada exceção é aplicada pelo mesmo mecanismo central de proteção
  (ADR 0006 §1.3) e coberta por testes de isolamento.
- Qualquer nova exceção exige um ADR novo.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| `Contract` como `SharedModel` | todo usuário autenticado leria todos os contratos |
| Criar um quinto tipo de escopo genérico | abriria espaço para novos models fora das regras; a lista fechada é mais restrita |
| `User` como `ContractScopedModel` | o contrato é obrigatório nesse tipo, e o superadmin não tem contrato |

## Consequências

- A lista de exceções fica no código do system check e neste ADR, sempre sincronizados.
- Teste obrigatório: usuário comum não lê outro contrato nem usuários de outro contrato.
