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
npm start          # http://localhost:4200, API em http://localhost:8000/api/v1
npm run lint
npm run build
```

## Ambientes

| Arquivo | Uso |
|---|---|
| `src/environments/environment.ts` | desenvolvimento (API local) |
| `src/environments/environment.homol.ts` | homologação (URL a definir) |
| `src/environments/environment.prod.ts` | produção (URL a definir) |

## Docker

```bash
docker build -t datasync-core-frontend .
```

Telas fora do escopo atual ficam desabilitadas por comentário nas rotas e no menu
(etapa 6.2). Padrões herdados: [docs/standards/patterns-frontend.md](docs/standards/patterns-frontend.md).
Regras para agentes: [AGENTS.md](AGENTS.md). `LICENSE.md` mantém o aviso da PrimeTek.
