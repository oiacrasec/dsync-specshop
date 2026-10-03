# 0013 — Domínio de contratos e relações de contexto

- **Status:** Aceito
- **Data:** 2026-10-03
- **Complementa:** ADRs 0006 e 0012

## Contexto

A etapa 1.2 declara relações nos tipos abstratos antes da criação das entidades
na etapa 2.1. O app de destino e a política de exclusão física precisam ser definidos.

## Decisão

O usuário aprovou reunir `Plan`, `Contract` e `Organization` em `apps/contracts`.
As relações de contexto apontam para `contracts.Contract` e `contracts.Organization`
e usam `on_delete=models.PROTECT` para impedir exclusão física acidental de um
contrato ou organização com registros dependentes.

Os quatro tipos continuam em `apps/core/models.py`. A exceção fechada de `Contract`
no system check usa o label completo `contracts.Contract`; `User` usa `users.User`.

## Alternativas consideradas

- `apps/tenancy`: não escolhido; o domínio será organizado em torno dos contratos.
- Cascata física: pode apagar dados dependentes acidentalmente, contrariando a
  preservação inicial prevista no ADR 0007.

## Consequências

- `apps/contracts` e seus models concretos serão criados na etapa 2.1.
- `PROTECT` atua na exclusão física pelo ORM; não altera o soft delete do `BaseModel`.
- Expurgo legal continua exigindo regras próprias, ordem explícita e retenções;
  `PROTECT` não autoriza guardar dados indefinidamente.
