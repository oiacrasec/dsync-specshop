# AGENTS.md — backend

Regras específicas do backend Django. Complementam o `AGENTS.md` da raiz e
prevalecem dentro de `backend/`.

## Stack

Python 3.14 · Django 5.2 LTS · Django REST Framework · PostgreSQL. Versões sempre
na última LTS, com `~=` nos requirements (patches automáticos).

## Organização

- `config/` contém **apenas** configuração global (settings, URLs raiz, ASGI/WSGI). Nada de regra de negócio.
- Cada domínio é um Django App em `apps/<dominio>/`, criado com `django-admin startapp` e com `name = 'apps.<dominio>'` no `apps.py`.
- `apps/core/` guarda só o que é compartilhado por vários domínios. Não vira depósito genérico.
- Fixtures ficam dentro do app dono do dado (`apps/<dominio>/fixtures/`).

## Camadas de um app

| Arquivo | Responsabilidade |
|---|---|
| `models.py` | persistência e comportamento da entidade |
| `serializers.py` | validação, entrada e saída da API |
| `selectors.py` | **leituras** |
| `services.py` | **escritas** e regras de negócio |
| `views.py` | camada HTTP, sempre fina |
| `urls.py` | rotas do app |
| `permissions.py` | autorização |
| `tests/` | testes do app (`test_*.py`) |

Leitura: `View → Selector → Model`. Escrita: `Serializer → View → Service → Model`.
Crie cada arquivo só quando ele for necessário.

## Estilo dos models

Seguir [docs/standards/django-style.md](docs/standards/django-style.md) e o
[exemplo de model](docs/examples/model.md): campos compactos, argumentos agrupados
e continuação alinhada. A preferência do usuário vale para todos os models.
`models.py` tem formatação manual preservada, com limite obrigatório de **120
caracteres** (`E501` ativo); demais regras de lint continuam ativas.

## Regras

- Settings por ambiente em `config/settings/`. Segredos e valores de ambiente **só** por variável de ambiente (`.env.example` documenta todas).
- `AUTH_USER_MODEL = 'users.User'`: sempre use `get_user_model()` ou `settings.AUTH_USER_MODEL`.
- API segura por padrão: `IsAuthenticated` global; libere rotas públicas explicitamente na view.
- Rotas da API em `config/api/v1.py`, sob `/api/v1/`. Erros via exceções e handler
  global RFC 9457 (`apps.core.exceptions`), nunca corpo de erro manual na view.
- Usar `serializer.is_valid(raise_exception=True)`; validação retorna 422. Mensagens
  de validação não devem incluir dados pessoais ou detalhes internos.
- `RequestIdMiddleware` vem antes dos demais middlewares; `X-Request-Id` é gerado
  pelo servidor e correlaciona logs e erros (contrato em `docs/api/errors.md`).
- Não usar Django Admin, sessões ou messages (ADR 0008). Não registrar `admin.py`,
  `SessionAuthentication` nem middlewares de sessão/autenticação do Django.
- Administração própria pela API e pelo frontend; manutenção por management commands
  (`createsuperuser` continua disponível). JWT e `IsAuthenticated` são globais;
  login/refresh/logout em `/api/v1/auth/` são públicos e usam JSON. Contrato em
  `../docs/api/authentication.md`; tokens identificam pelo `public_id` do usuário.
- Escritas de autenticação ficam em `apps/users/services.py`. Refresh/logout
  mantêm a transação e o lock da blacklist, incluindo nova verificação após o lock.
- Chave JWT independente via `DJANGO_JWT_SIGNING_KEY`; nunca versionar seu valor,
  logar tokens ou retornar respostas de autenticação cacheáveis.
- Limite de login conta apenas falhas por conta: `DJANGO_AUTH_LOGIN_RATE=5/min`,
  com bloqueio temporário de 60 s. Sucesso e validação não consomem o contador.
  Preservar normalização do username, HMAC da chave e operações atômicas de cache;
  cache compartilhado e proteção da borda são requisitos antes de produção.
- Todos os models próprios herdam `apps.core.models.BaseModel`: UUID v7 externo,
  datas, autoria e soft delete (ADR 0007). Tabelas `dsc_` são geradas automaticamente.
- `objects` oculta excluídos, mas mantém inativos; `all_objects` é acesso explícito
  para auditoria. No `User`, `is_active` mantém a semântica de autenticação do Django.
- Autoria explícita: `save(actor=user)` e `delete(actor=user)`; operações de sistema
  sem usuário deixam autoria nula. Em `update`/operações bulk, preencher auditoria
  explicitamente. Soft delete não faz cascata; relações são tratadas no service.
- Nunca logar dados pessoais em claro.
- Novo campo pessoal → finalidade e base legal definidas (skill `lgpd`). Toda funcionalidade passa pela skill `conformidade-legal`.

## Antes de entregar

```bash
pytest
ruff check . && ruff format --check .
python manage.py makemigrations --check --dry-run
python manage.py check --deploy --settings=config.settings.production
```
