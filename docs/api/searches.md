# API de pesquisas de preços (SPECSHOP)

Pesquisa sob demanda (D-16, RF-25, RF-29), no app `apps/pricing`, com uma requisição por
produto e sem fila (ADR 2003 §4). Contrato completo em [openapi-v1.yaml](openapi-v1.yaml).

| Rota | Permissão | O que faz |
|---|---|---|
| `GET /api/v1/searches/` · `GET /api/v1/searches/{id}/` | `search:view` | pesquisas da organização ativa, com as linhas (`items`) |
| `POST /api/v1/searches/` | `search:create` | cria a pesquisa e uma linha **pendente** por produto × fonte; não coleta nada |
| `POST /api/v1/searches/{id}/items/{item}/run/` | `search:create` | executa uma linha pendente |
| `POST /api/v1/searches/{id}/items/{item}/retry/` | `search:update` ("Tentar de novo") | refaz linha indisponível, com erro ou presa em "pesquisando" há mais de 2 minutos |

**Criação** (`POST /searches/`): `products` (1 a 10 `public_id` de produtos do contrato;
11 ou mais → 422 "Você pode pesquisar até 10 produtos por vez."), `sources` (hoje
`mercado_livre`), `seller_states` (UFs; vazio = todas) e `destination_zip` (CEP com ou sem
hífen; guarda 8 dígitos). Escopo: organização ativa (ADR 2003 §1); auditoria `search.created`.

**Filtros da lista** (`GET /searches/`), combinados com AND e aplicados antes da paginação:

| Parâmetro | Semântica |
|---|---|
| `search` | trecho do nome **ou** modelo dos produtos usados na pesquisa, sem diferenciar maiúsculas; não repete pesquisas que contenham vários produtos correspondentes |
| `date_from` | data inicial inclusiva, `AAAA-MM-DD`, desde o início do dia no fuso do usuário (ou fuso do sistema se o perfil não definir) |
| `date_to` | data final inclusiva, `AAAA-MM-DD`, até o fim do dia no mesmo fuso |
| `ordering` | `created_at` ou `-created_at`; padrão: mais recentes primeiro, com desempate por `public_id` |

Datas inválidas ou período invertido retornam 422 RFC 9457 (`validation-error`, `errors`
por campo). O schema expõe produto na busca geral e datas com `type: date`,
`placement: general`; o frontend apresenta De/Até sem hora. A busca usa `EXISTS` dos itens
correlacionados à pesquisa e o período filtra o timestamp por limites, sem cast de data.
O escopo da organização/contrato permanece aplicado pelo core.

**Execução de uma linha** (`run`/`retry`): a tela dispara até 3 em paralelo.

1. Reserva a linha sob lock como `running`; outra execução da mesma linha → 409
   `search-item-not-runnable`.
2. Chama o conector da fonte **fora de transação** (view sem `ATOMIC_REQUESTS`).
3. Grava numa transação curta: ofertas (`SearchOffer`), fotografia dos indicadores
   (mínimo, mediana, média, máximo e quantidade de ofertas elegíveis) e observações na base
   global (`record_observations`).

Situações da linha: `pending`, `running`, `done`, `no_results`, `unavailable` (fonte sem
conector ou recusou o acesso; nunca vale zero), `error` (falha inesperada da fonte).

**Elegibilidade básica** (2.2): produto novo e preço positivo. Ofertas inelegíveis ficam
gravadas com o motivo (`not_new`, `invalid_price`) para a auditoria e não entram nos
indicadores nem na base global. Correspondência, kits e quarentena por valor vêm na 3.2.

**Conectores**: `apps/pricing/sources.py` (`SourceConnector`, registro `CONNECTORS`). Fonte
sem conector responde `unavailable` ("O conector desta fonte ainda não está disponível.");
o do Mercado Livre entra na etapa 3.1.
