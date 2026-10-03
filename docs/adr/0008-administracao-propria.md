# 0008 — Administração própria, sem o Django Admin

- **Status:** Aceito (trecho sobre criação de superadmin substituído pelo ADR 0010)
- **Data:** 2026-10-03

## Contexto

O Django Admin (`django.contrib.admin`) é uma interface pronta, mas:

- personalizar telas e fluxos além do básico exige contornar o framework;
- o visual e o comportamento ficam presos às mudanças de cada versão do Django;
- não segue o design, a acessibilidade e o fluxo de contexto do nosso frontend.

O sistema precisa de uma área administrativa com opções próprias, separada da área
do usuário comum (ADR 0006).

## Decisão

- **Não usar** o `django.contrib.admin`: ele sai do `INSTALLED_APPS` e das URLs.
- A administração é uma **funcionalidade nossa**:
  - **backend:** endpoints administrativos sob um **prefixo próprio**
    (ex.: `/api/v1/admin/contracts/`), separados das rotas de negócio
    (ex.: `/api/v1/products/`; versionamento no ADR 0004); o prefixo inteiro exige superadmin e não usa contexto de
    organização (ADR 0006);
  - **frontend:** área administrativa separada no Angular, com o mesmo design system
    e as mesmas regras de acessibilidade (skill `acessibilidade`).
- A área administrativa é **exclusiva do superadmin**. O **admin do contrato** gerencia
  organizações, usuários, perfis e atribuições na **área comum**, dentro do contexto e
  com as permissões do RBAC (ADR 0009).
- Módulos do Django:

  | Módulo | Situação |
  |---|---|
  | `django.contrib.admin` | **removido** |
  | `django.contrib.sessions` | **removido** (autenticação é JWT, ADR 0006) |
  | `django.contrib.messages` | **removido** (só servia ao admin) |
  | `django.contrib.auth` | mantido (usuário, senha, `is_superuser`) |
  | `django.contrib.contenttypes` | mantido (exigido pelo `auth`) |

  Menos módulos ativos, menos superfície de ataque (skill `owasp-top-10`, A02).
- Operações de manutenção sem interface são feitas por **management commands**:

  | Comando | Origem |
  |---|---|
  | `createsuperuser` | nativo do Django (`auth`, funciona sem o admin) |
  | expurgo, eliminação a pedido, reaplicar eliminações | ADR 0007 §4 |
  | carregar perfis de sistema (fixtures) | ADR 0009 |

- ~~Superadmin só é criado ou promovido por comando no servidor; nenhuma rota da API
  cria superadmin nem altera `is_superuser`.~~ **Substituído pelo ADR 0010.**
- **MFA para o superadmin:** fica para uma entrega futura (skill `owasp-top-10`, A07,
  recomenda).

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Django Admin padrão | difícil de customizar; visual e fluxo presos à versão do Django |
| Django Admin com tema de terceiros | soma a dependência do Django à de outra biblioteca |

## Consequências

**Ganhos**
- Controle total de telas, fluxos e permissões administrativas.
- Atualizar o Django não quebra a administração.
- Uma única experiência de interface (design, acessibilidade, auditoria).

**Custos**
- Cada tela administrativa precisa ser **construída** (backend + frontend).
- Até a área administrativa existir, a manutenção depende de management commands.

**Impacto no código atual**
- Remover do `INSTALLED_APPS`: `admin`, `sessions` e `messages`, com seus middlewares
  e context processors.
- Remover a rota `admin/` de `config/urls.py` e o `apps/users/admin.py`.
- Trocar a `SessionAuthentication` do DRF por autenticação **JWT** (ADR 0006).
