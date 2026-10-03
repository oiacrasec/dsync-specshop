# datasync-core — backend

API Django autônoma do monorepo.

| Item | Versão |
|---|---|
| Python | 3.14 |
| Django | 5.2 LTS (suporte até abr/2028) |
| Django REST Framework | 3.18 |
| Banco | PostgreSQL |

## Estrutura

```text
backend/
├── config/
│   └── settings/      → base, development, production, testing
├── apps/
│   ├── core/          → recursos compartilhados (TimeStampedModel)
│   └── users/         → usuário customizado
├── requirements/      → base, development, production, testing
├── static/ templates/ scripts/
├── docs/              → architecture, standards, patterns, examples
├── manage.py
└── pyproject.toml     → pytest, coverage, ruff
```

## Como rodar (desenvolvimento)

Na raiz do monorepo, com o `.venv` ativo:

```bash
pip install -U -r backend/requirements/development.txt
cd backend
cp .env.example .env        # ajuste DJANGO_SECRET_KEY e DATABASE_URL
python manage.py migrate
python manage.py runserver
```

## Dependências

As versões usam `~=` (*compatible release*): `Django~=5.2.17` aceita qualquer
patch `5.2.x` a partir de `5.2.17`, mas nunca `6.0`.

> Use sempre `pip install -U -r ...`. Sem o `-U`, o pip não atualiza pacotes
> já instalados que ainda atendem ao requisito.

## Settings

| Módulo | Uso | Onde é padrão |
|---|---|---|
| `config.settings.development` | local | `manage.py` |
| `config.settings.production` | deploy | `wsgi.py`, `asgi.py` |
| `config.settings.testing` | testes | `pyproject.toml` (pytest) |

Variáveis de ambiente documentadas em `.env.example`.

## Qualidade

```bash
pytest                 # testes
coverage run -m pytest && coverage report
ruff check . && ruff format --check .
python manage.py check --deploy --settings=config.settings.production
```

Regras para agentes de IA: [`AGENTS.md`](AGENTS.md).
