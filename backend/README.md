# datasync-core — backend

API Django autônoma do monorepo.

Não usa Django Admin, sessões nem messages (ADR 0008). A administração própria será
implementada na API e no frontend; por enquanto, a manutenção usa management commands,
como `createsuperuser`. As rotas versionadas usam `/api/v1/`, sem endpoints de negócio
publicados nesta etapa. JWT e `IsAuthenticated` são globais. Login, refresh e
logout ficam sob `/api/v1/auth/`; veja o [contrato de autenticação](../docs/api/authentication.md).

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
│   ├── core/          → BaseModel, tipos de escopo, checks, erros e correlação
│   ├── users/         → usuário customizado
│   ├── contracts/     → planos, contratos e organizações
│   └── rbac/          → perfis, permissões, atribuições e exceções
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

A etapa 1.1 foi concluída antes do JWT: a migration inicial do usuário foi regenerada
para `dsc_user` e os campos do `BaseModel`, após confirmar que o banco estava vazio.
Ela e as migrations da blacklist foram aplicadas ao banco de desenvolvimento
na etapa 0.3, com autorização do usuário.

Configurar `DJANGO_JWT_SIGNING_KEY` com uma chave aleatória de pelo menos 32 bytes,
independente de `DJANGO_SECRET_KEY`. Configuração curta ou igual à chave Django
impede a inicialização. Para gerar uma chave sem definir valor fixo no código:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Guardar o resultado apenas no ambiente local ou no gerenciador de segredos.
Não publicar senhas nem tokens em logs. A limpeza de tokens expirados usa
`python manage.py flushexpiredtokens`; o agendamento diário depende da infraestrutura.
Licenças adicionadas: [dependências de autenticação](docs/standards/dependencies.md).

`DJANGO_AUTH_LOGIN_RATE=5/min` conta falhas de login por conta, não logins
bem-sucedidos. Na quinta falha, a conta espera 60 segundos antes de tentar de
novo (429 com `Retry-After`). O cache local precisa ser substituído por cache
compartilhado e atômico antes de executar com múltiplos workers em produção.

## Persistência comum

Estilo obrigatório de models: [padrão Django](docs/standards/django-style.md) e
[exemplo de referência](docs/examples/model.md).

Models próprios herdam um dos quatro [tipos de escopo](docs/architecture/model-scopes.md),
que derivam de `apps.core.models.BaseModel` (ADR 0007). Exceções: `User` e `Contract`
(ADR 0012). System checks rejeitam escopo ausente, múltiplo ou campos incompatíveis.
Os tipos ainda não filtram queries por tenant; contexto e autorização seguem pendentes.
`Plan`, `Contract` e `Organization` estão em `apps/contracts`,
com `PROTECT` nas relações de contexto e plano (ADR 0013). O `id`
BIGINT é interno; `public_id` UUID v7 é o identificador para a API e o JWT.
Tabelas recebem automaticamente `dsc_` + nome da classe em snake_case; as relações
N:N automáticas seguem a tabela de origem.

`objects` exclui registros com `deleted_at`, mas mantém os inativos. `all_objects`
inclui excluídos para acesso explícito de auditoria. No `User`, o `is_active` original
do Django continua bloqueando autenticação; usuários excluídos também não autenticam.

Autoria é passada explicitamente por `save(actor=user)` e `delete(actor=user)`.
Operações de sistema, como o bootstrap por `createsuperuser`, podem não ter autor.
`QuerySet.delete(actor=user)` faz soft delete em lote, com uma única atualização;
até pelo `all_objects`, `delete()` preserva os dados. Não há cascata de soft delete:
as regras de relações devem ser implementadas no service de cada domínio.
`update()`, `bulk_create()` e `bulk_update()` não chamam `save()`; o chamador deve
preencher autoria e datas de alteração explicitamente nessas operações.

Soft delete não equivale à eliminação legal dos dados. Expurgo, retenções e
`LegalHold` permanecem na entrega própria definida no plano; nenhum endpoint de
exclusão nem rotina de eliminação foi publicado nesta etapa.

## Planos e contratos

Etapa 2.1 concluída: tabelas `dsc_plan`, `dsc_contract` e `dsc_organization`, com
migration aplicada ao banco local. Ver [campos e regras](../docs/domain/contracts.md).
O plano tem nome e quotas opcionais de organizações, bytes, integrações e operações
mensais; somente o schema está pronto, sem contadores ou bloqueios por quota.
Modalidade é definida pela implantação, sem campo no plano (ADR 0014).
O contrato guarda vigência, licenças e retenção pós-contrato (90 dias, máximo 365).
Datas e limites contratuais são protegidos por constraints. A organização pertence
obrigatoriamente a um contrato. Quotas do plano, contexto e isolamento
de consultas continuam nas etapas correspondentes; nenhum endpoint novo foi criado.

Etapa 2.2: `User.contract` vincula usuário comum ao contrato; superadmin fica sem
contrato, garantido por constraint. Licenças contam ativos e inativos não excluídos;
soft delete libera vaga. Escritas usam `apps.users.services.save_user`, com
transação/lock e disponibilidade no cadastro, transferência ou restauração.
O manager delega a esse serviço, inclusive versões async; `createsuperuser`
continua disponível. Sem novos endpoints; validação do contrato em login/contexto
e autorização de gestão continuam nas próximas etapas.

## RBAC

Etapa 3.1 antecipada antes do contexto por decisão do usuário. O
[registry de permissões](docs/architecture/permission-registry.md) fica em
`apps/core/permission_registry.py`, sem Django ou banco. Declara códigos,
escopos permitidos e reservadas; rejeita atribuições inválidas e não expande
`manage` em outras ações.

Etapa 3.2 concluída: `apps/rbac` guarda Profile, ProfilePermission, Assignment e
AssignmentExclusion. Selectors fazem leituras; services validam e gravam em
transações, com proteção contra vínculos entre contratos e códigos inválidos.
Somente superadmin ativo pode escrever nesta etapa. Perfil atribuído não pode
ser excluído; soft delete de perfil/atribuição trata seus filhos com autoria.
Transferência de usuário exige remover suas atribuições primeiro.
Migration inicial aplicada localmente, sem seeds. Ver [domínio RBAC](../docs/domain/rbac.md).
Autorização da API (3.3): toda view nega por padrão e declara `required_permission`
(ou `AllowAuthenticated`); a permissão efetiva é calculada para a organização do header
`X-Organization-Id`. Etapa 3.4: migration rbac.0002 cria o perfil essencial; o contrato
nunca fica sem Administrador ativo (409). `user.save()` delega a `save_user`;
`user.delete()` e o lote, a `delete_user` (um a um).
Etapa 3.5: `GET /api/v1/me/organizations/` lista as organizações acessíveis (sem header);
a busca contrato → organização do superadmin fica em `apps/contracts/selectors.py`.
Auditoria de eventos em 3.6. Ainda não há endpoints de gestão.

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
