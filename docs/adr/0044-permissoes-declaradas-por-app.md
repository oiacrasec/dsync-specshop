# 0044 — Permissões declaradas por app

- **Status:** Aceito
- **Data:** 2026-11-07

## Contexto

O registry de permissões (ADR 0009 §1) era uma lista fixa em
`apps/core/permission_registry.py`, e os rótulos do catálogo ficavam em
`apps/rbac/constants.py`. Um projeto derivado (ADR 0036) que precisa de permissões
próprias, como o primeiro deles, o SPECSHOP, teria de editar esses arquivos do core, o que
o ADR 0036 proíbe e que gera conflito a cada atualização.

## Decisão

- Cada app pode declarar suas permissões num módulo **`permission_catalog.py`**:
  - `PERMISSIONS`: lista de `PermissionDefinition` (`recurso:ação`, escopos, reserva);
  - `RESOURCE_LABELS` e `PERMISSION_LABELS` (opcionais): rótulos da interface.
- Na inicialização, `RbacConfig.ready()` percorre os apps instalados, acrescenta essas
  definições ao registry e os rótulos ao catálogo (`apps/rbac/catalog.py`) e **congela**
  o registry: depois disso ele só é lido.
- Código ou rótulo repetido interrompe a inicialização; um app não sobrescreve permissão
  nem rótulo de outro.
- O registry continua em Python puro (`register` e `freeze` sem dependência do Django);
  só a descoberta dos módulos usa o framework.
- As permissões do próprio core continuam declaradas no registry; o mecanismo serve para
  apps novos, do core ou de projetos derivados.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Projeto derivado edita o registry do core | viola o ADR 0036 e gera conflito em todo merge |
| Lista de módulos em settings | exige editar settings para cada app; a convenção por módulo dispensa configuração |
| Registry mutável a qualquer momento | permissão poderia surgir em tempo de execução; o congelamento mantém o catálogo fechado como pede o ADR 0009 |

## Consequências

- Projeto derivado declara permissões em `apps/<app>/permission_catalog.py`, sem tocar
  em arquivos do core.
- Perfis e atribuições continuam validando códigos no registry; códigos de um app
  removido deixam de existir e são recusados como hoje.
- Complementa o ADR 0009 §1 (whitelist no código), que segue valendo.
