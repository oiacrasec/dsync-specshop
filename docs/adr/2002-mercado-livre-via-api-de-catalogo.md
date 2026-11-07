# 2002 — Mercado Livre via API de catálogo

- **Status:** Aceito
- **Data:** 2026-11-07

## Contexto

A DT-02 pede preços atuais reais da Epson L3250 no Mercado Livre sem credenciais do
cliente (D-31), dentro das regras de coleta do [ADR 2001](2001-regras-de-coleta-nas-fontes.md).
A etapa 0.2 testou a API oficial e a página pública de busca com um app de
desenvolvimento criado na conta pessoal do usuário (fluxo `client_credentials`).

### Evidência (2026-11-07)

| Acesso | Resultado |
|---|---|
| `POST /oauth/token` (`client_credentials`) | 200; token de 6 h (`expires_in` 21600), ligado ao dono do app |
| `GET /products/search?site_id=MLB&q=epson l3250` | 200; 6.373 produtos de catálogo, inclusive peças, tintas e capas. Com `domain_id=MLB-PRINTERS` e paginação, 895 impressoras; a L3250 está espalhada em **vários produtos de catálogo** (variações de título, voltagem e kit) |
| `GET /products/{id}/items` | 200 em ~0,3 s. Primeiro teste olhou só 2 produtos (4 ofertas); o reteste com 7 produtos L3250 achou **240 ofertas** (6, 19, 6, 141, 21, 34 e 13), de vendedores em várias UFs, inclusive SC |
| `GET /products/{id}` | 200; `buy_box_winner` nulo |
| `GET /sites/MLB/search` (texto ou categoria) | 403 `forbidden` |
| `GET /items/{id}` e `/items?ids=` | 403 `access_denied` (sem token: 403 `PolicyAgent`) |
| App recriado com todas as permissões | mesmos 403: o bloqueio é política do Mercado Livre, não escopo do app |
| Página pública `lista.mercadolivre.com.br/epson-l3250` | `robots.txt` (`User-agent: *`) libera a busca simples, mas a requisição foi redirecionada para `/gz/account-verification` |

Campos de cada oferta em `/products/{id}/items`: `item_id`, `price`, `original_price`,
`currency_id`, `condition`, `seller_id`, `seller_address` (cidade, UF, bairro),
`shipping` (inclui `free_shipping`), `official_store_id`, `listing_type_id`, `warranty`,
`sale_terms`, `tags`, `category_id`.

Acessos complementares testados no mesmo dia:

| Acesso | Resultado |
|---|---|
| `GET /items/{id}/shipping_options?zip_code=88010000` | 200; opções de entrega para o CEP com custo, custo de lista e data estimada (ex.: R$ 0 com frete grátis, R$ 84,99 sem) |
| `GET /users/{seller_id}` | 200; apelido do vendedor (`nickname`), além de reputação e endereço, que não guardamos |
| `GET /products/{id}` | 200; atributos `BRAND` e `MODEL` (ex.: "EPSON L3250 Ecotank"); sem GTIN nos 2 produtos testados |
| `GET /items/{id}/prices` e `/sale_price` | 403 `access_denied` (preços por meio de pagamento indisponíveis) |
| `GET /products/{id}/shipping_options` | 500 |
| `GET /items/{id}/shipping_options` com IDs tirados da página de busca | 200 para os 6 anúncios testados |

Página pública de busca aberta no navegador real do usuário (Chrome, sem login):
carregou sem verificação, **238 resultados**, 60 por página. Cada card traz ID do
anúncio e do produto de catálogo, `domain_id`, preço atual e anterior, desconto,
parcelamento, "no Pix" (19 de 60 cards), texto de frete/prazo para a localização do
navegador e nome da loja quando oficial; também há JSON-LD com nome, preço e link de 48
produtos. **Não traz** UF do vendedor nem condição por card (condição só pelo filtro
"Novo"). Nos 17 cards cujo vínculo foi lido, todos tinham produto de catálogo.

### O que a especificação pede × o que o Mercado Livre entrega

| Pedido (ID) | Situação | Observação |
|---|---|---|
| Pesquisar sem conta do cliente (D-31, RF-03) | ✅ dá | token da aplicação |
| Achar o produto pelo nome/modelo, sem EAN (D-24) | ✅ dá | `/products/search`; filtrar `domain_id` e conferir `BRAND`/`MODEL` (DT-04) |
| Todas as ofertas do Mercado Livre | ⚠️ quase todas | anúncios vinculados ao catálogo (240 da L3250 em 7 produtos); anúncios fora do catálogo só pela página; busca geral da API bloqueada |
| Preço da oferta e preço "de" (D-27) | ✅ dá | `price`, `original_price` |
| Menor preço por pagamento: Pix, parcelado, cupom (D-27, RF-19) | ❌ não dá | `/prices` bloqueado; registrar condição de pagamento como desconhecida |
| Só produto novo (D-21, RF-27) | ✅ dá | `condition` = `new` |
| Nota fiscal declarada (RF-26) | ❌ não vem | registrar como "não informada" |
| Vendedor (RF-06) | ✅ dá | `seller_id` e apelido via `/users/{id}` |
| Localização do vendedor por UF (D-22, RF-04, RF-24) | ✅ dá | cidade/UF em `seller_address` |
| Destino de entrega e frete para SC (D-22, RF-04) | ✅ dá | custo e prazo por CEP via `shipping_options`; o CEP de SC do piloto está em aberto |
| Link da oferta na auditoria (RF-06) | ⚠️ a confirmar | a API não devolve `permalink`; montar o link a partir do ID precisa ser validado |
| Mín., máx., média, mediana (RF-22) | ✅ dá | centenas de ofertas por produto; tratar duplicatas entre produtos de catálogo |
| Kits e acessórios fora da comparação (DT-04) | ✅ dá | `domain_id`; a tag `kit_component` aparece em oferta e precisa de critério |
| Histórico de 3 meses (D-26, RF-30) | ❌ não dá | a API não oferece histórico; depende do 0.3 (Buscapé) |
| Até 10 produtos sob demanda (D-25, RQ-05) | ✅ dá | ~0,3 s por chamada; cerca de 3 chamadas por produto |

## Decisão

1. **Mecanismo:** o conector do Mercado Livre usa só a API oficial de catálogo:
   `/products/search` para achar o produto (filtrado por `domain_id` compatível) e
   `/products/{id}/items` para as ofertas. Token da aplicação via `client_credentials`,
   renovado antes de expirar.
   A busca usa `domain_id` compatível e paginação, porque o mesmo modelo aparece em
   vários produtos de catálogo. **A API é a fonte principal** (decisão do usuário,
   2026-11-07): condição, UF do vendedor e frete por CEP vêm dela.
2. **Cobertura declarada:** sem o plugin, o resultado cobre os anúncios vinculados ao
   catálogo, e a tela informa isso; não se apresenta como "todos os anúncios".
3. **Sem raspagem da busca do Mercado Livre:** a verificação de conta é proteção técnica;
   contorná-la viola a regra 3 do ADR 2001 (risco CP 154-A) e a D-31.
4. **Dados guardados do vendedor:** `seller_id`, apelido e cidade/UF (ADR 2001 §2). Bairro,
   endereço e reputação vêm nas respostas e são descartados.
5. **Frete:** consultado por CEP de destino via `shipping_options`; componente ausente
   não vale zero.
6. **Credenciais** em `ML_CLIENT_ID` e `ML_CLIENT_SECRET` (`backend/.env`, ADR 2000 item 7);
   o código do conector só faz leitura.
7. **Extensão do navegador como complemento** (decisão do usuário, 2026-11-07): ela
   acrescenta Pix, parcelamento e anúncios fora do catálogo; os IDs que ela devolve são
   enriquecidos pela API (condição, UF do vendedor, frete por CEP), e oferta sem esses
   dados fica com o campo desconhecido. Ao
   pesquisar o Mercado Livre, a página do SPECSHOP aciona sozinha a extensão do SPECSHOP
   instalada no navegador do usuário; a extensão carrega a busca pública de cada produto
   no próprio navegador, sem login, extrai as ofertas e devolve ao SPECSHOP. Se o Mercado
   Livre responder com verificação, CAPTCHA ou bloqueio, a extensão para e a fonte fica
   indisponível (ADR 2001, regra 3). Sem a extensão, vale só o catálogo da API.
   **Instalação:** navegadores não permitem que um site instale extensão sozinho. Ao
   escolher o Mercado Livre sem a extensão, o SPECSHOP detecta a ausência, pede
   confirmação ao usuário e abre a página da extensão na loja oficial (Chrome Web Store
   / Edge Add-ons), onde ele clica em adicionar; na volta, a pesquisa segue.
8. **Preço por forma de pagamento** (decisão do usuário, 2026-11-07): a extensão captura
   Pix e parcelamento quando a página de busca os exibir (a confirmar na etapa 3.4);
   ofertas só da API, ou sem essa informação na página, ficam com condição de pagamento
   **desconhecida** e preço identificado como "preço do anúncio", sem desconto inventado.
   Abrir a página de cada anúncio para ler Pix e cupom fica fora do MVP (lento e com
   mais risco de bloqueio).
9. **Nota fiscal** (decisão do usuário, 2026-11-07): nem a API nem a página de busca
   trazem a declaração; ofertas do Mercado Livre ficam com nota fiscal **"não
   informada"**, exibida como ausência de informação, nunca como "não emite" nem
   deduzida da loja ou da plataforma (RF-26). Verificar a declaração na página do
   anúncio, sob demanda na auditoria, fica como melhoria futura.
10. **Histórico** (decisão do usuário, 2026-11-07): o Mercado Livre não fornece histórico;
    o histórico vem da **base própria do SPECSHOP**. Cada pesquisa de qualquer cliente
    grava as observações de preço numa base **global**, compartilhada entre as empresas,
    e o histórico de um produto reúne as observações de todas elas. Consequências para
    DT-05/DT-06: a observação de oferta pública não pertence a uma empresa, mas **quais
    produtos cada empresa pesquisa e quando** é dado dela e não aparece para as outras
    (RQ-02); a série global se ancora no anúncio/produto de catálogo da fonte, e o
    produto cadastrado por cada empresa se liga a ela pela correspondência (DT-04); o
    frete fica ligado ao CEP de destino da pesquisa que o observou. A coleta continua só
    por ação do usuário (D-16), então a série tem lacunas onde ninguém pesquisou.
11. **Ordem:** o Mercado Livre é a primeira fonte implementada (decisão do usuário); as
   demais seguem o modelo híbrido do ADR 2001, cada fonte pelo meio que suas regras permitem.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Busca geral `/sites/MLB/search` | 403 para token da aplicação, mesmo com todas as permissões |
| Raspar a página pública de busca | redireciona para verificação de conta; passar por ela contorna proteção técnica |
| Robô no servidor se passando por pessoa (proxy residencial, navegador disfarçado) | o Mercado Livre já recusa o acesso do servidor; passar por cima disso viola mecanismo de segurança (CP 154-A, ADR 2001 regra 3) |
| OAuth com conta de usuário (Authorization Code) | não muda os 403 testados e aproxima a coleta de uma conta, contra a D-31 |

## Consequências

- O menor preço do Mercado Livre pode estar fora do catálogo; o MVP compensa somando
  outras fontes (0.4/6.1).
- **Pendência:** pedir ao suporte de developers do Mercado Livre o acesso a
  `/sites/MLB/search`; se liberado, revisar este ADR.
- **Pendência antes da produção:** app do Mercado Livre na conta da empresa, com
  permissões mínimas de leitura; o app atual é da conta pessoal do usuário, só para
  desenvolvimento.
- **Pendência antes da produção:** os termos do Mercado Livre sobre extensão que lê a
  página entram na auditoria jurídica. A extensão depende do layout da página e precisa
  de manutenção quando ele mudar.
- **Pendência de produto:** a base global de histórico compartilhada entre empresas muda
  o alcance da D-26/RF-08 (série do produto da empresa); levar ao idealizador.
- **Pendência antes da produção:** auditoria jurídica de manter base própria com dados
  coletados das fontes (Lei 9.610, art. 7º XIII; termos da API do Mercado Livre sobre
  armazenamento).
- A correspondência de produto (DT-04, etapa 3.2) precisa descartar peças e acessórios
  que o catálogo devolve na mesma busca.
