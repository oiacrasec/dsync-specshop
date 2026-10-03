# datasync-core — backend

API Django autônoma do monorepo.

Não usa Django Admin, sessões nem messages (ADR 0008). A administração própria será
implementada na API e no frontend; por enquanto, a manutenção usa management commands,
como `createsuperuser`. As rotas versionadas usam `/api/v1/`, sem endpoints de negócio
publicados nesta etapa. A autenticação por
JWT entra na etapa 0.3; até lá, o DRF não tem autenticadores configurados e mantém
`IsAuthenticated` como permissão global.

Erros da API seguem [RFC 9457](../docs/api/errors.md), com
`Content-Type: application/problem+json`. Toda resposta inclui `X-Request-Id`;
o mesmo identificador acompanha o corpo dos erros e os logs. Rotas desconhecidas da
API retornam 404, inclusive em desenvolvimento.

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
python manage.py runserver
```

**Não executar `migrate` antes da etapa 1.1 do plano de entrega:** a migration inicial
do usuário será regenerada para `dsc_user` e os campos do `BaseModel`.

## Configuração do PyCharm

Testado no PyCharm 2026.1 (Professional: o suporte a Django é recurso pago). O
projeto é aberto pela **raiz do monorepo** (`datasync-core/`).

### 1. Interpretador

**Settings** (`Ctrl+Alt+S`) → **Python** → **Interpreter**: usar o `.venv` da raiz
(`.venv/Scripts/python.exe`). Se houver mais de um interpretador apontando para o mesmo
`.venv` (em **Show All**), remover os duplicados.

### 2. Sources Root

Na árvore do projeto: clique direito em **`backend`** → **Mark Directory as** →
**Sources Root**. Sem isso, a IDE não encontra os imports `apps.*` e `config.*`.

### 3. Suporte a Django

**Settings** → **Python** → **Django**:

| Campo | Valor |
|---|---|
| Enable Django Support | ✅ |
| Django project root | `<caminho do repositório>/backend` |
| Settings | `config/settings/development.py` |
| Manage script | `manage.py` |

### 4. Ruff

**Settings** → **Plugins**: procurar **Ruff** (conferir se já vem embutido na versão
instalada) e apontar para o executável do `.venv`. As regras ficam no `pyproject.toml`.

### 5. Configurações de execução

A pasta `.idea/` não é versionada; crie as configurações em **Run** → **Edit
Configurations** → **+**:

**`backend: runserver`** (tipo **Python**)

| Campo | Valor |
|---|---|
| Script | `<caminho do repositório>/backend/manage.py` |
| Script parameters | `runserver 127.0.0.1:8000` |
| Working directory | `<caminho do repositório>/backend` |
| Environment variables | `PYTHONUNBUFFERED=1` |

**`backend: pytest`** (tipo **pytest**)

| Campo | Valor |
|---|---|
| Target | Script path: `<caminho do repositório>/backend` |
| Working directory | `<caminho do repositório>/backend` |

Não é preciso configurar variáveis de ambiente: o settings lê o `backend/.env`, e o
pytest usa `config.settings.testing` (definido no `pyproject.toml`). As duas
configurações aceitam **Debug**, com breakpoints.

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
