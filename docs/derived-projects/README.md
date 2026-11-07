# Criar um projeto a partir do core

Passo a passo para iniciar um projeto derivado (ex.: **SPECSHOP**) e continuar recebendo
as atualizações do core. As regras estão no [ADR 0036](../adr/0036-projetos-derivados-do-core.md).

```text
              core  (evolui a arquitetura; versões marcadas com tags)
            /   |   \
     specshop  proj-b  proj-c       cada um com Git e ritmo próprios
            \   |   /
     git fetch core && git merge core/<versão>   (só do core para os projetos)
```

| Regra | Por quê |
|---|---|
| O projeto nasce com o **histórico do core** e mantém um remote `core` | O histórico em comum é o que permite o merge das atualizações |
| O fluxo é **só do core para o projeto** | Código de um cliente nunca entra no core, nem chega a outro cliente |
| O projeto **só acrescenta** (apps, telas e arquivos novos) | Atualizar o core quase não gera conflito |
| Melhoria do projeto que sirva a todos | Entra no core como commit novo e limpo, nunca por merge do projeto |

## 1. Criar o repositório

Crie no GitHub um repositório **vazio e privado** (`specshop`), sem README nem licença.
Depois:

```bash
git clone git@github.com:<sua-org>/datasync-core.git specshop
cd specshop
git remote rename origin core                          # o core vira o remote "core"
git remote add origin git@github.com:<sua-org>/specshop.git
git push -u origin main
```

Confira com `git remote -v`: `origin` aponta para o projeto e `core` para o core.

**Não** copie os arquivos para um `git init` novo: sem o histórico em comum, cada
atualização vira conflito em quase todos os arquivos. O GitHub não permite fork privado
na mesma conta; por isso o clone com troca de remote.

## 2. Personalizar o que é do projeto

| O quê | Onde |
|---|---|
| Nome do sistema e da empresa | `frontend/src/environments/*.ts` (`appName`, `companyName`) e `DJANGO_APP_NAME` no `backend/.env` |
| Banco local próprio | novo banco (ex.: `specshop`) no `DATABASE_URL` do `backend/.env` |
| Chaves próprias | `DJANGO_SECRET_KEY`, `DJANGO_JWT_SIGNING_KEY` e `DJANGO_MFA_ENCRYPTION_KEY` novas, **nunca** as do core |
| Documentos do projeto | `README.md`, `docs/plans/`, `.ai/handoff.md` e `.ai/knowledge/log.md` passam a falar do projeto |

Gerar as chaves (cada comando gera uma; não reaproveite):

```bash
python -c "import secrets; print(secrets.token_hex(48))"          # SECRET_KEY e JWT_SIGNING_KEY
python -c "import base64, secrets; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())"  # MFA (Fernet)
```

## 3. Preparar o ambiente local

Com um **venv próprio** do projeto (não reaproveite o do core):

```bash
pip install -U -r backend/requirements/development.txt
cd backend
cp .env.example .env              # preencher banco, chaves e nome (passo 2)
python manage.py migrate
python manage.py runserver
```

```bash
cd frontend
npm ci
npm start                         # http://localhost:4200
```

Detalhes: [backend](../../backend/README.md#como-rodar-desenvolvimento) e
[frontend](../../frontend/README.md#como-rodar).

## 4. Desenvolver só acrescentando

| Pode | Não pode |
|---|---|
| Criar apps de domínio novos no backend | Editar arquivos que vêm do core |
| Criar telas, rotas e serviços novos no frontend | Criar migrations em apps do core |
| Criar docs, ADRs (numerados a partir de **2000** e listados em `docs/adr/projeto.md`) e planos do projeto | Fazer merge do projeto no core |

Se o projeto precisar mudar algo do core, a mudança é feita **no core** e chega ao
projeto pela atualização (passo 5).

**Apps e rotas do projeto** (ADR 0036, item 5): liste os apps em
`backend/config/project.py` (`PROJECT_APPS`) e inclua as rotas da API em
`backend/config/api/project.py`. Esses arquivos vêm vazios do core e pertencem ao projeto;
não edite `config/settings/base.py` nem `config/api/v1.py`.

**Menu e páginas do projeto** (frontend): declare as seções do menu em
`frontend/src/app/project/project.menu.ts` (cada item com a `permission` que o torna visível) e
as rotas em `frontend/src/app/project/project.routes.ts`. Os dois vêm vazios do core e pertencem
ao projeto; não edite `app.menu.ts`, `pages.routes.ts` nem `PERMISSION_KEYS`.

**Registros sem escopo do projeto** (padrão do `AccessLog`, ADR 0018): tabela técnica fora dos tipos
de escopo (ex.: grande volume, particionada) é declarada em `PROJECT_UNSCOPED_RECORDS`
(`backend/config/project.py`), não herda `BaseModel` e usa `GlobalOnlyManager`
(`apps.core.managers`): leitura só em `system_context()` ou `unscoped()`. A fábrica do teste de
isolamento vai em `GLOBAL_ONLY` (`apps/<app>/tests/isolation.py`). Justifique em ADR do projeto.

**Isolamento dos models do projeto**: cada model novo precisa de fábrica de isolamento; declare-a
em `apps/<app>/tests/isolation.py` (`FACTORIES` e, se houver, `SHARED`), sem editar
`apps/core/tests/test_isolation.py`.

**Contrato da API gerado**: `docs/api/openapi-v1.yaml` é gerado do código e, no projeto, inclui as
rotas dele. Em conflito no merge do core, não resolva à mão: regenere com
`python manage.py spectacular --validate --fail-on-warn --file ../docs/api/openapi-v1.yaml`
(o teste `test_versioned_schema_file_matches_the_code` confere).

**Permissões do projeto** (ADR 0044): declare-as em `apps/<app>/permission_catalog.py`,
com `PERMISSIONS` (lista de `PermissionDefinition`) e, se quiser, `RESOURCE_LABELS` e
`PERMISSION_LABELS`. O registry do core as carrega na inicialização; não edite
`apps/core/permission_registry.py` nem `apps/rbac/constants.py`.

## 5. Receber atualizações do core

```bash
git fetch core
git merge core/main               # quando o core tiver tags: git merge core/v1.1
```

Rode os testes do backend e do frontend depois de cada atualização. Em conflito num
arquivo que pertence ao projeto (lista do passo 2), mantenha a versão do projeto.

## Limitações atuais do core

| Pendência (ADR 0036) | Efeito enquanto não for resolvida |
|---|---|
| Sem tag de versão (`v1.0`) | O projeto recebe a `main` do core em andamento, não uma versão estável |
| Sem `merge=ours` no `.gitattributes` | Conflitos nos arquivos do projeto a cada atualização, resolvidos à mão |
| Sem lugar para regras de agente do projeto | Dar regras próprias aos agentes exige editar o `AGENTS.md` do core |

## Vender um projeto

O comprador precisa de um core próprio, com histórico. O procedimento (espelhar o core
com `git clone --mirror` e `git push --mirror` e trocar o remote `core`) está no item 6
do [ADR 0036](../adr/0036-projetos-derivados-do-core.md). Revise o histórico antes de entregar.

Para colocar o projeto num servidor: [tutorial de deploy](../deployment/tutorial.md).
