# ADRs — Architecture Decision Records

Registram decisões arquiteturais relevantes e, principalmente, **por que** foram
tomadas. Um ADR aprovado não é editado para mudar a decisão: uma decisão nova gera
um ADR novo que **substitui** o anterior.

## Status

| Status | Significado |
|---|---|
| Proposto | em discussão, ainda não vale |
| Aceito | decisão vigente |
| Substituído por NNNN | trocado por outro ADR |
| Rejeitado | discutido e descartado (fica registrado o motivo) |

## Índice

| Nº | Título | Status |
|---|---|---|
| [0001](0001-monorepo.md) | Monorepo com projetos autônomos | Aceito |
| [0002](0002-arquitetura-do-backend.md) | Arquitetura do backend | Aceito |
| [0003](0003-arquitetura-do-frontend.md) | Arquitetura do frontend | Proposto |
| [0004](0004-contrato-de-api.md) | Contrato de API | Aceito |
| [0005](0005-memoria-de-ia.md) | Memória e procedimentos para agentes de IA | Aceito |
| [0006](0006-multi-tenancy-contrato-organizacao.md) | Multi-tenancy por Contrato e Organização | Aceito |
| [0007](0007-identificadores-e-convencoes-de-persistencia.md) | Identificadores e convenções de persistência | Aceito |
| [0008](0008-administracao-propria.md) | Administração própria, sem o Django Admin | Aceito (trecho substituído por 0010) |
| [0009](0009-rbac-hibrido.md) | RBAC híbrido: perfis vinculados + permissões avulsas | Aceito |
| [0010](0010-gestao-de-usuarios-pelo-superadmin.md) | Gestão de usuários e superadmins pela área administrativa | Aceito |
| [0011](0011-endpoint-de-opcoes.md) | Endpoint de opções (autocomplete e seleção) | Aceito |
| [0012](0012-excecoes-ao-escopo-declarado.md) | Exceções ao escopo declarado (`Contract` e `User`) | Aceito |

## Modelo

```markdown
# NNNN — Título

- **Status:** Proposto
- **Data:** AAAA-MM-DD

## Contexto
Problema e forças em jogo.

## Decisão
O que foi decidido.

## Alternativas consideradas
O que foi descartado e por quê.

## Consequências
Ganhos, custos e o que passa a ser obrigatório.
```
