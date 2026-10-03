# 0002 — Arquitetura do backend

- **Status:** Aceito
- **Data:** 2026-10-03

## Contexto

O backend precisa ser previsível para humanos e agentes de IA, seguro por padrão,
aderente às leis brasileiras (skills legais) e fácil de manter por muitos anos.

## Decisão

### Stack e versões

| Item | Escolha |
|---|---|
| Linguagem | Python 3.14 |
| Framework | **Django 5.2 LTS** (sempre a última LTS) + Django REST Framework |
| Banco | PostgreSQL |
| Versões | `~=` nos requirements (patches automáticos com `pip install -U`) |
| Requirements | por ambiente: `base`, `development`, `production`, `testing` |
| Ambiente virtual | `.venv` na raiz do monorepo |

### Organização

- Projeto criado com `django-admin startproject`; apps com `startapp` em `apps/<dominio>/`.
- `config/` contém **só** configuração global; settings por ambiente em `config/settings/`.
- Segredos e valores de ambiente **só** por variável de ambiente (`.env`, não versionado).
- `apps/core/` guarda apenas o que é compartilhado por vários domínios.

### Camadas de um app

```text
Leitura: View → Selector → Model
Escrita: Serializer → View → Service → Model
```

- Views e serializers finos; regra de negócio em `services.py`, leituras em `selectors.py`.
- Um app nasce com o mínimo do `startapp`; as demais camadas são criadas **sob demanda**.

### Padrões obrigatórios

- Usuário customizado (`AUTH_USER_MODEL = 'users.User'`) desde a primeira migration.
- API **autenticada por padrão** (`IsAuthenticated` global).
- Senhas com Argon2; HTTPS, HSTS e cookies seguros em produção.
- Datas gravadas em UTC (`USE_TZ`), exibidas em `America/Sao_Paulo`.
- Qualidade: `pytest`, `ruff` (lint e formatação), `check --deploy`.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Versão mais recente não-LTS (6.x) | ciclo de suporte curto para um sistema de longa duração |
| Regra de negócio em views/serializers | dificulta testes e reuso |
| Settings único com `if DEBUG` | mistura ambientes e facilita erro em produção |

## Consequências

- Atualização de LTS (ex.: 6.2) é uma decisão planejada, registrada em novo ADR.
- Todo app segue as camadas; desvios precisam de justificativa.
- Decisões relacionadas: multi-tenancy (0006), identificadores (0007), administração (0008).
