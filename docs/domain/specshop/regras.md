# SPECSHOP — regras de negócio

Regras do domínio de pesquisa de preços. Visão e escopo: [README](README.md). Itens
marcados como **Proposta** não são decisão confirmada; os **Definidos** não devem ser
reabertos como escolha técnica (mudança neles é proposta de produto ao idealizador).

## Produto acompanhado

| Campo | Obrigatoriedade | Uso |
|---|---|---|
| Nome | obrigatório | **principal direcionador da pesquisa** |
| Modelo | obrigatório | identificar e refinar o produto procurado |
| Marca | opcional | refinar a identificação quando informada |
| EAN | opcional | identificador adicional quando disponível |

- **Definido:** somente produtos **novos**, em todas as fontes e visões (D-21, RF-27).
  Usados e recondicionados ficam fora do escopo. Sem marca ou EAN o cadastro e a
  pesquisa continuam possíveis (D-24, RF-01).
- **Proposta:** nome como termo principal, modelo como qualificador e marca/EAN como
  identificação adicional; regras de correspondência a detalhar (DT-04).
- **Proposta:** identidade estável do produto para continuar seu histórico nas pesquisas
  seguintes, sem depender só da igualdade textual do nome (DT-06).
- O usuário não precisa informar previamente os anúncios concorrentes; a pesquisa busca
  o produto cadastrado.

## Pesquisa

- **Definido:** disparada **somente pelo usuário**; sem atualização automática ou coleta
  agendada (D-16, RF-25). Nova tentativa após falha também é acionada pelo usuário.
- **Definido:** até **10 produtos por solicitação**, com intenção de ampliar (D-25,
  RF-29). O limite é de produtos na solicitação: não limita ofertas por produto nem
  produtos cadastrados (ambos em aberto). Ao tentar ultrapassar, indicar o limite.
- **Proposta:** estados da pesquisa por produto/fonte: concluída, parcial, sem
  resultado, fonte indisponível e acesso necessário, com horário da última consulta.
- Falha numa fonte permite resultado parcial das demais, com cobertura explícita.
  **Oferta ausente nunca vale zero.**

## Fontes

**Definido:** a referência de mercado do MVP é o preço de **venda ao consumidor pessoa
física** em varejo e marketplaces (D-30). As estatísticas informam o conjunto de fontes
e ofertas usado.

**Definido:** o MVP **não pede conta, login, senha ou cadastro do cliente** nos sites
pesquisados (D-31). Configurações ou chaves da própria aplicação são decisão técnica
diferente (DT-02/DT-08). Fonte que só funcione com conta do cliente fica registrada
como pendente/indisponível; credencial externa nunca vira requisito do MVP.

| Fonte | Finalidade | Situação |
|---|---|---|
| Mercado Livre | ofertas ao consumidor e concorrência | **fonte do piloto**; acesso sem credenciais e cobertura a validar |
| KaBuM! | preços ao consumidor PF | candidata; acesso, correspondência e cobertura a validar |
| MegaMamute | preços ao consumidor PF | candidata; disponibilidade, acesso e cobertura a verificar |
| Magazine Luiza / Magalu | ofertas ao consumidor, vendedor identificado quando houver | candidata; acesso e cobertura a validar |
| Buscapé | descoberta/comparação e possível **histórico anterior** | citada; histórico público documentado, obtenção e integração não validadas |
| OLX | ofertas de novos no conjunto separado | regra de apresentação definida; coleta e etapa em aberto |
| Facebook Marketplace | ofertas de novos no conjunto separado | **prioridade entre as fontes Meta** (D-23); acesso sem credenciais e etapa a validar |
| Lojas no Facebook/Instagram | ofertas de novos no conjunto separado | desejadas, prioridade abaixo do Marketplace; integração e etapa em aberto |
| Amazon e Americanas | contextos de venda citados | possíveis fontes de evolução; integração e prioridade em aberto |
| Fujioka, Martins e distribuidores | aquisição | **fora do MVP e do piloto** (D-19), mesmo com página pública |

Regras de coleta e situação de cada fonte para o MVP: [ADR 2001](../../adr/2001-regras-de-coleta-nas-fontes.md)
(Facebook/Instagram bloqueados sem permissão da Meta; OLX e Magalu indeterminados).
Fonte citada aqui **não** é integração comprovada. A fonte agregadora e o
vendedor/anúncio de origem devem ser identificados quando disponíveis. A mesma oferta
encontrada em vários lugares precisa de tratamento de duplicidade nas estatísticas.

### Conjunto OLX/Facebook

- **Definido:** OLX, Facebook Marketplace e lojas no Facebook/Instagram aparecem
  **separados das demais fontes por padrão**; o usuário pode optar por uma visão
  combinada, identificada no painel (D-20, RF-23).
- **Proposta:** ao combinar, recalcular as estatísticas sobre as **ofertas individuais
  elegíveis**, após tratar duplicatas e mantendo produto novo e filtros regionais.
  Nunca usar média das médias dos conjuntos. O conjunto ativo acompanha indicadores e
  histórico (RF-28).

### Conexões autenticadas futuras (evolução bem posterior)

Conectar a conta do cliente em distribuidores (RF-20) **não** entra no MVP: não
implementar formulário de credenciais de distribuidores. Propostas para quando for
detalhado: mecanismo por fonte (integração, autorização, token ou sessão); autenticação
adicional, expiração, renovação e desconexão; proteção de segredos e isolamento entre
empresas; preservar conta, região e condições nas observações; indicar conexão pendente
ou falha sem exibir preço como atualizado. Autenticação no próprio SPECSHOP é outra
questão (DT-08).

## Condição e nota fiscal (proposta)

Campos distintos para:

- **Origem:** plataforma, vendedor e anúncio.
- **Evidência de condição:** novo declarado pela fonte/anúncio ou condição não
  confirmada. Usados e recondicionados não são elegíveis.
- **Nota fiscal:** emissão declarada, ausência declarada ou não informada (RF-26).

Oferta sem evidência suficiente de produto novo fica **pendente de revisão, fora das
estatísticas** até confirmação. A nota fiscal reflete só o que o anúncio declara, com
referência; não se presume pela plataforma e não comprova situação fiscal.

## Valor de comparação

- **Definido:** um **valor consolidado** na fase 1; separar componentes (frete,
  descontos, cupons, pagamento) é evolução (D-17).
- **Definido:** usar o **menor preço disponível** da oferta, inclusive quando a fonte
  mostra preços diferentes por pagamento ou promoção, mantendo identificadas as
  condições conhecidas (Pix, cupom) e a referência (D-27, RF-19).
- Não calcular descontos que não foram obtidos ou confirmados na pesquisa.
- "Final" não sugere frete ou despesas não informados: identificar o valor exibido pela
  fonte e o que é desconhecido. **Componente ausente não vale zero**, e preço parcial
  não é apresentado como total comprovado.
- Vários preços do mesmo anúncio não duplicam a oferta nas estatísticas.
- Extração e normalização: DT-04.

## Região

- **Definido:** Brasil, iniciando por SC, com filtros por UF para as demais (D-06,
  RF-24).
- **Definido:** considerar **localização do vendedor** e **destino de entrega** (D-22,
  RF-04).
- **Proposta:** dois controles identificados e combináveis. Vendedor em SC e destino em
  outra UF é válido; com os dois preenchidos, o resultado atende aos dois conforme a
  informação disponível.
- Localização desconhecida **não** vira localização confirmada pelo filtro de UF. A
  cobertura efetiva é apresentada conforme as ofertas obtidas.
- **Em aberto:** cidade/CEP de SC para o piloto quando a fonte exigir destino
  específico; tratamento de entrega não confirmada.

## Ofertas comparáveis e elegibilidade

- **Definido:** só produtos novos são elegíveis, inclusive em OLX/Facebook e na visão
  combinada.
- **Proposta:** comparar marca, modelo, geração, capacidade, unidade/embalagem e
  evidência de novo. Kits e variações ficam identificados.
- Resultado incompatível, preço que represente bloqueio de acesso ou valor de
  preenchimento da página é **inválido** para as estatísticas. Preço baixo legítimo não
  é descartado só por ser baixo (DT-04).
- **Proposta:** mínimo, máximo, média e mediana usam o mesmo conjunto de ofertas
  elegíveis por produto e contexto, identificado no painel.
- **Pendências:** anúncios repetidos, frete desconhecido, condição não confirmada,
  promoções condicionadas, preços atípicos e fontes com finalidades distintas.

## Estatísticas

| Indicador | Definição proposta |
|---|---|
| Menor preço | menor valor entre as ofertas elegíveis da pesquisa/contexto |
| Maior preço | maior valor no mesmo conjunto |
| Média | soma dos valores ÷ quantidade de ofertas elegíveis |
| Mediana | valor central dos preços ordenados; com quantidade par, média dos dois centrais |
| Faixa de preços | intervalo entre mínimo e máximo, com as demais estatísticas |
| Quantidade de ofertas | tamanho do conjunto considerado, com acesso às referências |

- Sempre **por produto**: somar ou tirar média de produtos diferentes não é referência
  comercial (RF-22, D-08).
- Sem oferta válida, os indicadores aparecem sem dados; com uma oferta só, indicar a
  cobertura limitada.
- Cada indicador identifica o conjunto de fontes considerado.

## Histórico

- **Definido:** buscar preços de até **3 meses anteriores** e continuar a série com as
  novas pesquisas do mesmo produto, sempre acionadas pelo usuário (D-26, RF-08, RF-30).
- **Definido:** com histórico **ausente ou incompleto**, mostrar os preços atuais e o
  período disponível, com cobertura, lacunas e ausência indicadas. A falta dos 3 meses
  não impede a consulta atual. Política confirmada pelo idealizador; não reabrir (D-28).
- **Definido:** gráfico com filtros por dia, semana, mês e ano (D-07, RF-09).
- **Proposta:** duas origens: série externa (histórico obtido de uma fonte) e
  observações próprias do SPECSHOP. Cada ponto guarda a **data de referência do preço**,
  separada da **data de obtenção/importação**.
- **Proposta:** a janela retrospectiva são os 3 meses anteriores à consulta inicial; não
  é ordem de apagar dados mais antigos. Retenção e janela exata a detalhar.
- **Proposta:** separar intervalo exibido de agrupamento do gráfico; cada pesquisa
  guarda sua fotografia de mercado, mesmo várias no mesmo dia.
- Dias sem observação válida ficam como **lacuna** ou com indicação explícita de "último
  valor conhecido"; nunca como observação nova. Selecionar um ano não cria observações.
- Não estimar preços como se tivessem sido observados.
- O histórico externo pode ter só uma métrica (ex.: menor preço) e não permite
  reconstruir média, mediana ou máximo. Identificar a métrica e evitar continuidade
  aparente entre séries de critérios diferentes.
- **Proposta:** cada observação preserva o conjunto de fontes, a origem/destino regional
  e a condição de novo aplicados; alternar visão separada/combinada mantém claro quais
  séries são comparadas.
- Reimportar o mesmo ponto histórico não duplica a série.
- Representar várias consultas no mesmo período (última, resumo ou outra regra) é DT-05;
  ofertas repetidas em muitas pesquisas não podem ganhar peso maior por acidente.

### Fonte candidata de histórico

Em 18/10/2026 o [Buscapé documentava histórico de preços de 3 meses](https://www.buscape.com.br/busca-explica/conteudo/historico-de-precos-do-buscape),
entre outros períodos. Isso não confirma acesso de integração, exportação nem cobertura
da L3250. Validação proposta (DT-03): período disponível, significado de cada ponto,
produto/variante, origem, acesso e forma de incorporar.

## Auditoria de preços

- **Definido:** links e evidências ficam numa **área dedicada de auditoria**, voltada ao
  próprio usuário. Cards, gráficos e tabelas principais **não mostram URLs** nem listas
  extensas de links (D-05, D-32, RF-06, RF-31).
- **Proposta:** ação compacta "Ver auditoria" no contexto da pesquisa, do produto ou do
  indicador; o nome ou logo da fonte pode aparecer discretamente, sem o endereço.
- A auditoria permite conferir, conforme disponibilidade:
  - produto, pesquisa, conjunto de fontes e recorte regional do valor;
  - preço observado, condições conhecidas e momento da observação;
  - fonte, vendedor, anúncio e link da oferta de origem;
  - ofertas usadas no indicador e critério aplicado (mínimo/máximo apontam a oferta;
    média/mediana permitem consultar o conjunto);
  - origem, métrica, data e cobertura do histórico importado.
- **Proposta:** abrir a auditoria lê os registros da pesquisa que gerou o número, **sem
  nova coleta**; o valor preserva o horário de observação, mesmo que a oferta externa
  tenha mudado.
- Aba, painel lateral ou página dedicada é escolha de implementação (DT-09).

## Posicionamento e preço próprio

A fase 1 apoia a decisão com faixa de preços, ofertas e comportamento observado.

**Possibilidade futura** (RF-16, RF-18): com preço próprio P e referência comparável R,
calcular P − R em reais e (P − R) ÷ R × 100 quando R > 0. Depende de definir a entrada
do preço próprio e a escolha da referência; não bloqueia a fase 1. Margem, comissões e
preço sustentável não foram definidos.

**Tendências futuras** (D-13, RF-21): previsão exige horizonte, método, critérios de
qualidade e volume de dados, considerando pesquisas irregulares.

## Modelo conceitual (proposta)

| Conjunto | Dados candidatos |
|---|---|
| Produto acompanhado | identificador interno, nome e modelo; marca e EAN opcionais; variante quando necessária; condição fixa "novo" |
| Pesquisa | até 10 produtos, usuário/empresa, origem do vendedor, destino de entrega, fontes, conjunto separado/combinado, data/hora, resultados válidos e estado por produto/fonte |
| Oferta | fonte, anúncio/link, vendedor, localização do vendedor, entrega quando disponível, produto associado, evidência de condição e atributos conhecidos |
| Observação de preço | produto/oferta, valor, moeda, data de referência, data de obtenção, fonte, contexto geográfico, condições conhecidas e completude do valor |
| Série histórica externa | produto correspondente, fonte, métrica original, período, observações e data da importação; distinta das ofertas atuais |
| Estatísticas da pesquisa | mínimo, máximo, média, mediana, faixa, quantidade de ofertas, conjunto de fontes e critérios aplicados |
| Configuração do painel | fontes, região, período, agrupamento e apresentação |
| Conexão autenticada de distribuidor | empresa, fonte, contexto de autorização e estado; **evolução bem posterior, fora do MVP** |
| Preço próprio | canal/anúncio, preço, condições e data; opcional/futuro |
| Posição de estoque | produto, quantidade, custo, origem e data; fase 2 |

Esquema, migrations, duplicatas e retenção: DT-06. O domínio do SPECSHOP vive em apps
próprios, sem migrations em apps do core (ADR 0036).
