# 0016 — Domínio próprio para gestão de acesso

- **Status:** Aceito
- **Data:** 2026-10-03

## Contexto

A etapa 3.2 materializa os perfis e as atribuições do ADR 0009. Autenticação
pertence a users, enquanto o catálogo de permissões é compartilhado entre domínios.
O usuário aprovou criar um app próprio para a gestão de acesso.

## Decisão

Criar `apps/rbac` para Profile, ProfilePermission, Assignment e AssignmentExclusion,
com seus selectors, services e testes. Manter o registry compartilhado em
`apps/core/permission_registry.py` e a autenticação em `apps/users`.

Este ADR complementa o ADR 0009, preservando perfis vinculados, permissões avulsas,
escopos e exceções de organização.

## Alternativas consideradas

- Colocar em users: mistura autenticação e gestão de acesso.
- Colocar em core: transforma uma infraestrutura compartilhada em domínio de negócio.

## Consequências

A gestão de acesso tem um app dono. Não duplicar códigos em auth_permission.
As futuras views devem usar os services para escrever e os selectors para ler.
O cálculo puro de permissões e a integração DRF seguem na etapa 3.3.
