# SPECSHOP — DE-PARA dos pedidos por loja

O que cada loja permite atender dos pedidos da especificação, com base em testes reais
feitos em **2026-11-07**. Regras de coleta: [ADR 2001](../../adr/2001-regras-de-coleta-nas-fontes.md);
evidência do Mercado Livre: [ADR 2002](../../adr/2002-mercado-livre-via-api-de-catalogo.md).

**Legenda:** ✅ dá para fazer · ❌ não dá · ⚠️ a validar (ainda não testado ou depende de
regra a definir).

Os testes foram feitos com acesso simples e identificado, sem login, sem navegador
automatizado e sem contornar bloqueio. Termos de uso de cada loja ainda passam pela
auditoria jurídica antes da produção.

## Resumo

| Loja | Situação | Meio |
|---|---|---|
| Mercado Livre | ✅ viável, com cobertura parcial | API oficial de catálogo |
| KaBuM! | ✅ viável, a validar termos e frete | página pública de busca |
| OLX | ⚠️ acesso técnico ok, dados e termos a validar | página pública de busca |
| Buscapé | ⚠️ a validar (candidata a histórico, etapa 0.3) | página pública de produto |
| Magazine Luiza | ❌ bloqueado | — |
| MegaMamute | ❌ indisponível | — |
| Facebook Marketplace e lojas Facebook/Instagram | ❌ bloqueado | — |

## Mercado Livre

| Pedido | Dá? | Detalhe |
|---|---|---|
| Pesquisar sem conta do cliente (D-31) | ✅ | Token da própria aplicação (`client_credentials`) |
| Achar o produto por nome/modelo, sem EAN (D-24) | ✅ | Busca no catálogo; marca e modelo vêm como atributos ("EPSON L3250 Ecotank"); peças e tintas separadas pelo tipo de produto |
| Todas as ofertas da loja | ⚠️ | Pela API, os anúncios vinculados ao catálogo: **240 ofertas** da L3250 em 7 produtos de catálogo (o primeiro teste, com 4, olhou só 2 produtos). Anúncios fora do catálogo só pela página de busca, que abre no navegador do usuário (238 resultados) mas pede verificação ao servidor; busca geral da API dá 403 |
| Preço da oferta (D-27) | ✅ | Preço atual e preço "de" (`original_price`) |
| Menor preço por pagamento: Pix, parcelado, cupom (D-27, RF-19) | ❌ | O endpoint de preços por meio de pagamento dá 403; a condição fica como desconhecida |
| Só produto novo (D-21) | ✅ | Campo `condition` = `new` |
| Nota fiscal declarada (RF-26) | ❌ | A API não traz o campo; fica "não informada" |
| Vendedor identificado (RF-06) | ✅ | ID e apelido (ex.: "MEGABYTE MAGAZINE") |
| Localização do vendedor por UF (D-22) | ✅ | Cidade e UF |
| Frete e prazo para SC (D-22) | ✅ | Custo e data estimada por CEP (testado com Florianópolis) |
| Link da oferta na auditoria (RF-06) | ⚠️ | A API não devolve o link; montar a partir do ID precisa ser validado |
| Histórico de 3 meses (D-26) | ❌ | A API não oferece histórico de preços |
| Até 10 produtos sob demanda (D-25) | ✅ | ~0,3 s por chamada, cerca de 3 chamadas por produto |

## KaBuM!

| Pedido | Dá? | Detalhe |
|---|---|---|
| Pesquisar sem conta do cliente (D-31) | ✅ | Página pública de busca respondeu 200, sem login |
| Achar o produto por nome/modelo, sem EAN (D-24) | ✅ | `kabum.com.br/busca/epson-l3250`: 8 impressoras L3250 entre os 60 itens da 1ª página, misturadas com tintas e refis |
| Todas as ofertas da loja | ❌ | Só a 1ª página (60 de 115 itens): o `robots.txt` proíbe busca com parâmetros, e a paginação usa parâmetros |
| Preço da oferta (D-27) | ✅ | Preço cheio e preço antigo |
| Menor preço por pagamento (D-27, RF-19) | ✅ | Preço com desconto à vista/Pix (ex.: R$ 1.079,99 contra R$ 1.136,83) e parcelamento (ex.: 10x de R$ 113,68) |
| Só produto novo (D-21) | ⚠️ | Existe a marcação "open box"; definir se só a ausência dela basta para considerar novo |
| Nota fiscal declarada (RF-26) | ❌ | Não vem na página de busca; fica "não informada" |
| Vendedor identificado (RF-06) | ✅ | Nome do vendedor do marketplace (ex.: KaBuM!, Magalu, Carrefour, NegociuN) |
| Localização do vendedor por UF (D-22) | ❌ | Não vem na página de busca; página do produto não testada |
| Frete e prazo para SC (D-22) | ⚠️ | Não vem na busca; cálculo por CEP não testado |
| Link da oferta na auditoria (RF-06) | ✅ | Código e nome do produto formam o link `/produto/`, liberado pelo `robots.txt` |
| Histórico de 3 meses (D-26) | ❌ | A loja não exibe histórico |
| Até 10 produtos sob demanda (D-25) | ✅ | Uma página por produto |
| Termos de uso | ⚠️ | Ainda não conferidos |

## OLX

| Pedido | Dá? | Detalhe |
|---|---|---|
| Pesquisar sem conta do cliente (D-31) | ✅ | Busca pública respondeu 200 (em 07/11 o `robots.txt` também respondeu, antes dava 403); o `robots.txt` não proíbe a busca por `?q=` |
| Achar o produto por nome/modelo, sem EAN (D-24) | ⚠️ | A página traz os anúncios (347 menções a "L3250"), mas a extração dos campos ainda não foi feita |
| Todas as ofertas da loja | ⚠️ | Paginação não testada |
| Preço da oferta (D-27) | ⚠️ | Preços aparecem na página; extração a validar |
| Menor preço por pagamento (D-27, RF-19) | ❌ | Classificados: preço único combinado com o vendedor |
| Só produto novo (D-21) | ⚠️ | A OLX tem anúncios usados; confirmar se a condição vem na página |
| Nota fiscal declarada (RF-26) | ⚠️ | Só se o anunciante escrever; não há campo próprio confirmado |
| Vendedor identificado (RF-06) | ⚠️ | Muitos vendedores são pessoa física: guardar só o nome exibido (LGPD, ADR 2001 §2) |
| Localização do vendedor por UF (D-22) | ⚠️ | Anúncios da OLX têm localização; extração a validar |
| Frete e prazo para SC (D-22) | ⚠️ | Nem todo anúncio tem entrega; a validar |
| Link da oferta na auditoria (RF-06) | ⚠️ | A validar |
| Histórico de 3 meses (D-26) | ❌ | Não há histórico |
| Separada das demais fontes (D-20, RF-23) | ✅ | Regra de apresentação do sistema; independe da loja |
| Termos de uso | ⚠️ | Ainda não conferidos |

## Buscapé

| Pedido | Dá? | Detalhe |
|---|---|---|
| Pesquisar sem conta do cliente (D-31) | ✅ | Site respondeu 200, sem login |
| Achar o produto por nome/modelo, sem EAN (D-24) | ⚠️ | O `robots.txt` proíbe a busca (`?q=`); é preciso outro meio de chegar à página do produto |
| Ofertas atuais | ⚠️ | O Buscapé agrega ofertas de outras lojas; risco de duplicar ofertas já coletadas direto (tratar duplicidade) |
| Histórico de 3 meses (D-26) | ⚠️ | O site documenta histórico de 3 meses; acesso e cobertura da L3250 são o teste da etapa 0.3 |
| Termos de uso | ⚠️ | Ainda não conferidos |

## Magazine Luiza

| Pedido | Dá? | Detalhe |
|---|---|---|
| Todos os pedidos | ❌ | Site e `robots.txt` respondem 403 a acesso automatizado (proteção anti-robô); contornar é proibido (ADR 2001, regra 3) |
| Ofertas da Magalu por outro caminho | ⚠️ | A Magalu aparece como **vendedora dentro do KaBuM!** (ex.: L3250 por R$ 1.121,43); cobre parte das ofertas. API de parceiros não avaliada |

## MegaMamute

| Pedido | Dá? | Detalhe |
|---|---|---|
| Todos os pedidos | ❌ | Em 07/11 o site respondeu 403 com a página "Loja em manutenção"; reavaliar depois |

## Facebook Marketplace e lojas Facebook/Instagram

| Pedido | Dá? | Detalhe |
|---|---|---|
| Todos os pedidos | ❌ | Os termos da Meta proíbem coleta automatizada sem permissão escrita, inclusive sem login (ADR 2001); depende de permissão da Meta |

## Conclusões para o produto

- **Histórico de 3 meses (D-26):** nenhuma loja testada fornece; a única candidata é o
  Buscapé (etapa 0.3). Sem ela, o histórico começa na primeira pesquisa (D-28).
- **Menor preço por pagamento (D-27):** só o KaBuM! entrega Pix e parcelamento.
- **Cobertura:** cada loja mostra uma amostra (catálogo no Mercado Livre, 1ª página no
  KaBuM!). As estatísticas informam quantas ofertas e de quais fontes.
- **Conjunto OLX/Facebook (D-20, D-23):** no MVP, só a OLX tem chance; Facebook depende da
  Meta.
