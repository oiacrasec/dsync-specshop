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
`ui-filter` resolve opções por `public_id` (ADR 0004/0011). O resumo de permissões legado e o
cache ETag global continuam desabilitados; telas fora do escopo seguem desabilitadas.

## Docker

```bash
docker build -t datasync-core-frontend .
```

Telas ativas (etapa 6.2): login, primeiro acesso, seleção de organização, administração
de contratos, home KPI (dados fictícios do template) e páginas de erro. As demais ficam
comentadas nas rotas e no menu com `DESABILITADO: fora do escopo atual`
(`grep -rn DESABILITADO src`). Padrões herdados: [docs/standards/patterns-frontend.md](docs/standards/patterns-frontend.md).
Regras para agentes: [AGENTS.md](AGENTS.md). `LICENSE.md` mantém o aviso da PrimeTek.
