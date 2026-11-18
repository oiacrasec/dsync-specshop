# Entrega 2001 — MVP do SPECSHOP

Plano do MVP (fase 1) descrito em [docs/domain/specshop/](../domain/specshop/README.md).
Planos do SPECSHOP são numerados a partir de 2001 para não colidir com os do core
(ADR 2000). Cada etapa é pequena, fecha com a skill `validar-etapa` (verificações
automáticas, segurança, performance, docs, handoff e commit) e só começa após aprovação
do usuário.

**Legenda:** ⬜ pendente · 🔄 em andamento · ✅ concluída

## Decisões de planejamento

| # | Decisão |
|---|---|
| 1 | Usuário aprovou começar pelas **fontes** (bloco 0): o maior risco do MVP é obter preços reais sem conta do cliente e dentro dos termos das fontes |
| 2 | Testes exploratórios do bloco 0 ficam fora do código do produto; o resultado vira evidência no ADR da DT correspondente |
| 3 | Enquanto uma fonte não for validada, telas e fluxos usam **dados de exemplo identificados** como tais; nunca simular fonte conectada (RF-03, DT-02) |
| 4 | Domínio do SPECSHOP em apps novos, sem migrations em apps do core (ADR 0036) |
| 5 | 0.1 (aprovado): foco em implementar; regras técnicas conservadoras de coleta no ADR 2001 e auditoria jurídica por advogado antes da produção |
| 6 | 0.2: Mercado Livre via API de catálogo (ADR 2002). Usuário decidiu implementar o Mercado Livre primeiro; 0.3 e 0.4 ficam para antes dos blocos 5 e 6, que dependem deles |
| 7 | Ajuste da 2.3 aprovado no FigCraft e aplicado: Shopping lista pesquisas em `ui-table`; ⋯ → Abrir leva ao resultado existente; Nova pesquisa abre o formulário separado. Colunas: Data, Produtos (quantidade), UF e CEP |
| 8 | Revisão da 2.3: busca geral pelo produto usado na pesquisa e período De/Até em Filtros avançados (revisado em 07/11), sem hora; resultado usa botão Nova pesquisa preenchido e ações/paginação padrão do `ui-table` |
| 9 | Revisão da 1.3: Meus produtos substitui o filtro Situação por Arquivado (Não/Sim/Todos), preservando não arquivados por padrão e consulta de arquivados sem ações de escrita |
| 10 | 3.1, escopo (decisões delegadas pelo usuário em 18/11): token, busca de catálogo e ofertas com preço, preço "de", condição, vendedor e cidade/UF. Frete por CEP e apelido do vendedor ficam na 3.3 (uma chamada por oferta/vendedor); correspondência fina, kits, duplicatas e valores inválidos na 3.2; extensão na 3.4 |
| 11 | 3.1, token da aplicação no cache do Django até 5 min antes de expirar; 401 renova uma vez. Credenciais só por variável de ambiente, nunca em log, URL ou mensagem |
| 12 | 3.1, busca: EAN por `product_identifier`; senão marca + modelo no domínio do `domain_discovery`, uma página de 50; ficam só produtos com o modelo no nome ou no MODEL. Resultado em cache 24 h (1 h vazio). Limite medido de ~10 s entre buscas: espera de até 10 s pela vez e, sem vez ou com 429, linha `unavailable` para nova tentativa; nunca segura o worker além disso (timeout 60 s) |
| 13 | 3.1, ofertas: até 20 produtos de catálogo e 3 páginas de 100 por produto; só BRL e com preço; repetidas entre produtos contam uma vez; UF pelo nome do estado; link vazio até validar (ADR 2002) |
| 14 | 3.1, cobertura declarada no `detail` da linha ("anúncios fora do catálogo não entram"); erros de rede/5xx viram `error` e limite/credenciais `unavailable`, ambos com nova tentativa |
| 15 | 3.1, testes com transporte HTTP falso (nenhum teste chama a API real) e verificação manual na API real: 287 ofertas novas da L3250 em 14 produtos de catálogo; S24 SM-S921B sem resultado (anúncios escrevem "S921b") |
| 16 | 3.2, D-24 × busca (decidido pelo usuário, valendo para MVP, Mercado Livre, KaBuM! e demais): cascata EAN → marca + modelo → nome + modelo, parando na primeira com correspondência (ADR 2001); interpretação da D-24 levada ao idealizador |
| 17 | 3.2, ponto 1 (aprovado; revisto em 18/11): marca precisa bater quando conhecida nos dois lados; modelo como palavra inteira. A lista de sufixos de irmão (FE, Plus, Ultra…) foi **removida** a pedido do usuário: não escala por categoria e texto não distingue variação de outro aparelho. Irmãos se separam pelo código de fábrica como modelo (SM-S921B × SM-S721B do S24 FE), pela família da fonte e pela confirmação do usuário (F-1) |
| 18 | 3.2, ponto 2 (aprovado): modelo também pelo núcleo sem prefixo só de letras ("SM-S921B" → "S921B", núcleo com dígito e ≥ 4 caracteres); família do catálogo (`parent_id`) adotada após verificar 3 famílias com variações do mesmo aparelho; irmão de família entra se passar por marca e capacidade |
| 19 | 3.2, ponto 3 (aprovado): capacidade (GB/TB) no nome cadastrado restringe; cor e voltagem não; a variação fica identificada pelo título. Campo próprio de variante fica na F-1 |
| 20 | 3.2, ponto 4 (pelo PO, "unidade/embalagem"): várias unidades num preço → inelegível `multi_unit`. Produto + adicional ("+ Kit Tinta") **aguarda decisão**: o PO diz "identificados", sem dizer se saem das estatísticas |
| 21 | 3.2, pelo PO (`regras.md`): oferta sem evidência de produto novo fica pendente de revisão, fora das estatísticas → motivo `condition_unconfirmed`, separado de `not_new` (usado/recondicionado) |
| 22 | 3.2 (usuário, 18/11): produto + adicional ("L3250 + 01 Kit Tinta") **entra** nos indicadores; fica identificado pelo título da oferta |
| 23 | 3.2 (usuário, 18/11): anúncios do mesmo vendedor contam cada um como oferta. Medido na L3250: 47 de 179 vendedores com mais de um anúncio, 39 deles com preços diferentes (ex.: 16 anúncios de R$ 1.236 a R$ 2.964) |
| 24 | 3.2 (usuário, 18/11): outlier absurdo = preço ≥ 10× a mediana das elegíveis (opção A, só o lado alto, pelo PO); oferta marcada `outlier`, fora dos indicadores e da base global; `outlier_count` na linha para o **alerta na tela, que aguarda desenho no FigCraft** |
| 25 | Usuário, 18/11: tabela de estados (código IBGE, sigla, nome) no **core**, com fixture carregada por migration de dados idempotente (padrão do `rbac.0002`), em etapa própria logo após a 3.2 (3.2b) |

## Etapas

| Etapa | Escopo | DT / requisitos | Estado |
|---|---|---|---|
| **0 — Viabilidade das fontes** | | | |
| 0.1 | Conformidade legal da coleta (skill `conformidade-legal`): termos de uso das fontes candidatas, LGPD para vendedores pessoa física, guarda de evidências; ADR 2001 | D-31, RQ-02 | ✅ |
| 0.2 | Teste exploratório no Mercado Livre com a Epson L3250: mecanismo (API oficial com chave da aplicação ou página pública), campos obtidos, menor preço, vendedor, localização, limites; ADR 2002 | DT-02, D-18 | ✅ |
| 0.3 | Teste exploratório de histórico anterior (Buscapé e outras): período, métrica, acesso e amostra real da L3250 | DT-03, D-26 | ⬜ |
| 0.4 | Levantamento das candidatas (KaBuM!, MegaMamute, Magalu, Facebook Marketplace) e prioridade de integração; ADR das DT-02/DT-03 | DT-02, D-30 | ⬜ |
| **1 — Fundação** | | | |
| 1.1 | ADR das DT-01 e DT-08 apoiado no core: escopo dos dados, base global, confiança na coleta, execução da pesquisa e permissões; ADR 2003 | DT-01, DT-08, RF-15 | ✅ |
| 1.2 | App `catalog`: produto acompanhado (nome e modelo obrigatórios, marca e EAN opcionais, condição novo) e API CRUD; duplicado bloqueado; `docs/api/products.md` | RF-01, D-24 | ✅ |
| 1.3 | Tela "Meus produtos" e navegação inicial do SPECSHOP (lista, formulário, arquivar; menu e rotas do projeto pelo core, ADR 0036 item 5); roxo pendente | RF-01, D-14 | ✅ |
| **2 — Pesquisa** | | | |
| 2.1 | Modelo de pesquisa, oferta e observação de preço, com identidade estável do produto e datas de referência/obtenção; app `pricing` e base global particionada medida (ADR 2003) | DT-06, RF-08 | ✅ |
| 2.2 | Pesquisa sob demanda de até 10 produtos: estado por produto/fonte, falha parcial, limite explícito, nova tentativa manual; API `/api/v1/searches/` com run/retry por linha, conector por fonte (`docs/api/searches.md`) | DT-07, RF-25, RF-29 | ✅ |
| 2.3 | Tela "Shopping": grid de pesquisas (`ui-table`), formulário em `shopping/nova`, seleção de produtos/fontes/região, progresso e resultado | RF-10, RF-29 | ✅ |
| **3 — Primeiro preço real** | | | |
| 3.1 | Conector do Mercado Livre conforme o 0.2 (decisões 10–15; revisão do ADR 2002 em 18/11) | DT-02, RF-03 | ✅ |
| 3.2 | Correspondência de produto, menor preço disponível, condições, kits, duplicatas e valores inválidos (decisões 16–24; falta o alerta de outlier na tela, após o FigCraft) | DT-04, RF-05, RF-19, RF-27 | 🔄 |
| 3.2b | Tabela de estados no core: código IBGE, sigla e nome (fonte: API de localidades do IBGE), fixture + migration de dados idempotente; SPECSHOP valida UFs, mapeia nome→UF do Mercado Livre e lista as opções da tela pela tabela (decisão 25) | RF-04, RF-24 | ⬜ |
| 3.3 | Filtros de localização do vendedor e destino de entrega (SC primeiro) | RF-04, RF-24 | ⬜ |
| 3.4 | Extensão do navegador acionada pelo SPECSHOP para a busca completa do Mercado Livre (ADR 2002, item 7) | DT-02, RF-03 | ⬜ |
| **4 — Indicadores e auditoria** | | | |
| 4.1 | Estatísticas por produto e conjunto de fontes (mín., máx., média, mediana, faixa, quantidade) | RF-22, RF-28 | ⬜ |
| 4.2 | Dashboard sem URLs, com conjunto ativo e horário da pesquisa | DT-09, RF-10, D-32 | ⬜ |
| 4.3 | Área de auditoria com acesso contextual a partir de produto, pesquisa e indicador | DT-09, RF-06, RF-31 | ⬜ |
| **5 — Histórico** | | | |
| 5.1 | Série própria acumulada e agrupamento por dia/semana/mês/ano, com lacunas | DT-05, RF-08, RF-09 | ⬜ |
| 5.2 | Importação do histórico externo, se o 0.3 confirmar fonte | DT-03, RF-30 | ⬜ |
| 5.3 | Tela "Histórico" com cobertura, métrica e origem de cada série | RF-09, RF-30, D-28 | ⬜ |
| **6 — Mais fontes** | | | |
| 6.1 | Conectores validados no 0.4, com OLX/Facebook separados por padrão e combinação recalculada | RF-03, RF-23, RF-28 | ⬜ |
| **7 — Piloto** | | | |
| 7.1 | Conferir os [critérios de aceitação](../domain/specshop/requisitos.md#critérios-de-aceitação-da-fase-1), separando resultado real de demonstração; DT atualizadas | DT-10 | ⬜ |

O escopo detalhado de cada etapa é proposto e aprovado ao iniciá-la; decisões tomadas
entram na tabela de decisões de planejamento.

## Melhorias futuras

Fora do MVP por decisão do usuário; entram no plano quando forem priorizadas.

| # | Melhoria | Origem |
|---|---|---|
| F-1 | **Cadastro pelo catálogo, com busca estilo Netflix:** em Meus produtos, o usuário digita e vê produtos enquanto digita, com tolerância a erro, num catálogo próprio do SPECSHOP (produtos de catálogo já vistos nas pesquisas: nome, EAN, família e variações; ex.: `pg_trgm`). As variações aparecem agrupadas por família (`parent_id` do Mercado Livre), como temporadas dentro de um título. Escolher preenche nome, marca, modelo, EAN e variante. Sem resultado local, botão "Buscar no Mercado Livre" (busca limitada a ~1 chamada a cada 10 s, sem consulta enquanto digita). Inclui campo próprio de variante, textos de ajuda do formulário e a **confirmação da correspondência pelo usuário** (decidido em 18/11): na primeira pesquisa, o SPECSHOP mostra os produtos de catálogo candidatos agrupados por família, o usuário marca quais são o produto dele e o vínculo fica guardado (DT-04 "correspondência e revisão", Q-14; identidade estável, DT-06). Passa pelo FigCraft antes | 18/11, durante a 3.2: S24 cadastrado pelo código "SM-S921B" não casou com o catálogo, que usa "Galaxy S24" |
