# datasync-core — frontend

Aplicação Angular autônoma do monorepo. Base copiada do **datasync-gis** (template
Poseidon da PrimeTek, ajustado; licença confirmada pelo usuário) na etapa 6.1 do plano
da Entrega 1. Comunica-se com o backend **só pela API HTTP** (`/api/v1/`).

| Item | Versão |
|---|---|
| Angular | 21 (LTS) |
| PrimeNG | 21 |
| Node (build) | 24 LTS |

## Como rodar

```bash
npm ci
npm start          # http://localhost:4200; /api/v1 via proxy para 127.0.0.1:8000
npm run lint          # ESLint (código ativo; telas desabilitadas ficam fora até reativar)
npm run format:check  # Prettier
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

## Ambientes

| Arquivo | Uso |
|---|---|
| `src/environments/environment.ts` | desenvolvimento (API local) |
| `src/environments/environment.homol.ts` | homologação (URL a definir) |
| `src/environments/environment.prod.ts` | produção (URL a definir) |

## Autenticação e contexto (etapa 6.5)

Login, refresh, logout, troca de senha e organizações usam o contrato do Core.
Access/refresh e resumo do usuário ficam no **localStorage**, por decisão explícita
do usuário; a API recebe Bearer JWT. A organização UUID também é compartilhada:
trocar em uma aba recarrega o conteúdo de todas as abas da mesma origem/perfil.
Formulários abertos podem ser descartados. Logout limpa sessão/contexto e tenta
revogar o refresh no servidor; uma falha de revogação é informada.

Refresh sob demanda, coordenado entre abas por Web Locks (HTTPS/localhost e navegador
compatível). Sem polling. Primeiro acesso obrigatório redireciona à troca de senha;
superadmin vai direto à home sem organização. Campos de senha não são persistidos.
Erros seguem RFC 9457. Detalhes e limites: [autenticação](docs/architecture/authentication.md).

## Locale

`LOCALE_ID` é `pt-BR` (`registerLocaleData` no `app.config.ts`) e o `index.html` declara
`lang="pt-BR"`. Pipes de data, número e moeda seguem o padrão brasileiro. O `ui-table` formata
colunas `date` com `shortDate` (`01/10/2026`); a coluna só define `format` em exceções. O backend
informa apenas o tipo semântico da coluna, nunca a máscara.

## Administração de contratos (etapa 6.8)

Tela do superadmin na API do Core (`/api/v1/admin/contracts/`, `public_id`):
lista paginada com schema do backend (colunas, busca geral `search`, filtros e plano via
`options`), formulário com plano opcional e retenção pós-contrato (0–365, padrão 90),
provisionamento do primeiro acesso (organização + admin com `username` e nome), lista de
admins e redefinição de senha com confirmação. Senhas temporárias aparecem uma única vez
e não são persistidas. Listagens usam `BaseCrudService.listTable`/`lookupOptions`, com o adaptador
único `core/utils/table-schema.ts` (schema por recurso, `total_records`, tipos de coluna); o
`ui-filter` resolve opções por `public_id` (ADR 0004/0011). `ui-table` usa 20 linhas e `public_id`
como padrão, e `ui-autocomplete` busca 20 opções: telas não repetem esses valores. O cache ETag
global continua desabilitado; telas fora do escopo seguem desabilitadas.

## Ícones

| Biblioteca | Uso | Licença |
|---|---|---|
| PrimeIcons | componentes do PrimeNG e telas herdadas (`pi pi-*`) | MIT |
| [Font Awesome Free](https://fontawesome.com) 7.3 (`@fortawesome/fontawesome-free`) | ícones próprios por classe (`fa-solid fa-*`, `fa-regular fa-*`) | ícones CC BY 4.0, fontes SIL OFL 1.1, código MIT |

Font Awesome entra pelo CSS em `angular.json` (núcleo + solid + regular; brands fora). A
atribuição exigida pela CC BY fica no cabeçalho do CSS distribuído e nesta seção:
*Icons by Font Awesome Free (https://fontawesome.com), licensed under CC BY 4.0.*
Custo: ~80 KB a mais no CSS inicial (~13 KB comprimido); as fontes só baixam quando usadas.
O aviso de orçamento do bundle inicial é 2 MB (decisão do usuário; erro em 5 MB).
Os prefixos não colidem com o PrimeIcons.

## Perfil (etapa 9.2)

Menu do avatar → **Perfil** (`/perfil`): aba Principal (foto, nome, usuário só leitura, fuso
horário) num `PUT /api/v1/me/profile/` multipart e aba Senha no `POST /auth/change-password/`.
`ProfileService` carrega o perfil ao entrar: foto (ou iniciais) no topo e fuso nas datas.
Colunas de data e hora (`zoned`) usam o pipe `zonedDate` (deslocamento calculado por instante,
`core/utils/time-zone.ts`); data pura não muda de dia.

## Documentações (etapa 5.5)

Menu do avatar → **Documentações** → **API** (`/documentacoes/api`): Swagger UI do schema
`GET /api/v1/schema/`, buscado com a sessão. O "Try it out" executa com o token e a organização
ativa, enviados só para a origem e o prefixo da API (mesma regra do `authInterceptor`, em
`needsOrganizationHeader`). O pacote e o CSS só carregam nesta tela (chunk sob demanda).

| Biblioteca | Uso | Licença |
|---|---|---|
| [swagger-ui-dist](https://github.com/swagger-api/swagger-ui) 5.33.1 | tela de documentação da API | Apache-2.0 |

## Configurações (etapa 8.5)

Menu do avatar → **Configurações** (`/configuracoes`): cor principal, estilo dos componentes,
modo claro/escuro e tipo de menu, guardados no usuário (`/api/v1/me/preferences/`). A aplicação
do tema fica no `ThemeService` (`layout/service/theme.service.ts`); o painel de engrenagem do
template foi removido. Login e telas sem sessão usam a aparência padrão.

## Usuários (etapa 8.1)

Menu "Usuários" (`user:view`, reservado ao admin do contrato): lista, criação (senha temporária
exibida uma vez pelo componente `app-temporary-password`), edição, exclusão e redefinição de senha
com confirmação. Aba Permissões (8.3): organizações à esquerda, perfis vinculados, avulsas e exceções.

## Organizações (etapa 7.4)

Menu "Organizações" da área do cliente (ADR 0037): lista, criação, edição e exclusão em
`/api/v1/organizations/`. `PermissionContextService` busca `GET /api/v1/me/permissions/` uma vez
por sessão e organização ativa (nega por padrão enquanto não carregou) e alimenta o menu, os
guards e os botões (`resolveCrudPermissions`). Só reflete: o backend autoriza cada chamada.
O formulário tem só nome e situação; renomear a organização ativa atualiza o nome do contexto.

## Docker

```bash
docker build -t datasync-core-frontend .
```

Telas ativas (etapa 6.2): login, primeiro acesso, seleção de organização, administração
de contratos, home **Dashboards** (`/dashboards`, em branco no core:
cada projeto derivado implementa os seus) e páginas de erro. As demais ficam
comentadas nas rotas e no menu com `DESABILITADO: fora do escopo atual`
(`grep -rn DESABILITADO src`). Padrões herdados: [docs/standards/patterns-frontend.md](docs/standards/patterns-frontend.md).
Regras para agentes: [AGENTS.md](AGENTS.md). `LICENSE.md` mantém o aviso da PrimeTek.
