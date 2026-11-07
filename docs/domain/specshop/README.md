# SPECSHOP — visão e escopo

Domínio do projeto derivado SPECSHOP (sigla **SSP**). Consolidado a partir da
especificação do idealizador (v0.8, 18/10/2026, seis rodadas de perguntas), preservando
os IDs (D, RF, RQ, Q, DEC, DT). Estes documentos substituem a especificação original e
são a fonte viva do produto. Arquitetura e ADRs 0001–1999 vêm do core
([ADR 0036](../../adr/0036-projetos-derivados-do-core.md)); organização e regras de
atualização: [ADR 2000](../../adr/2000-documentacao-e-adrs-do-specshop.md).

| Documento | Conteúdo |
|---|---|
| Este arquivo | visão, público, escopo por fase, jornada e navegação |
| [regras.md](regras.md) | regras de negócio: cadastro, fontes, valor, região, estatísticas, histórico, auditoria |
| [requisitos.md](requisitos.md) | direções (D), requisitos funcionais (RF), de qualidade (RQ) e critérios de aceitação |
| [decisoes-e-pendencias.md](decisoes-e-pendencias.md) | decisões de produto (DEC), perguntas respondidas (Q) e pendências de produto |
| [decisoes-tecnicas.md](decisoes-tecnicas.md) | perguntas técnicas delegadas ao desenvolvimento (DT-01 a DT-10) e seu estado |

**ADRs do SPECSHOP** (o índice `docs/adr/README.md` pertence ao core):

| Nº | Título | Status |
|---|---|---|
| [2000](../../adr/2000-documentacao-e-adrs-do-specshop.md) | Documentação e ADRs do SPECSHOP | Aceito |

**Estados das definições:**

| Estado | Significado |
|---|---|
| Definido | direção apresentada ou confirmada pelo responsável pelo produto |
| Proposta | sugestão de detalhamento ainda não aprovada; não tratar como decisão |
| Em aberto | decisão de produto a preencher, com responsável indicado |
| Delegada ao desenvolvimento | questão técnica que o desenvolvedor resolve e registra (DT) |
| Fase 2 | importação e análise do estoque |
| Evolução futura | desejada ou candidata, sem compromisso de entrega na fase 1 |

## Visão

Plataforma web de pesquisa, comparação e acompanhamento de preços para **revendedores
de eletrônicos e tecnologia** que atuam no varejo e em marketplaces (D-01, D-02).

- **Shopping de preços:** pesquisar e comparar ofertas e suas condições.
- **Pricing:** usar essas informações para decidir os preços praticados pelo revendedor.

Os preços de venda ao consumidor pessoa física ajudam o usuário a **posicionar seus
anúncios** e a **avaliar se uma compra negociada com um distribuidor faz sentido**
diante do varejo (D-03, D-30). O custo do distribuidor não é consultado nesta fase.

**Pergunta central:** quais preços estão sendo praticados para este produto, onde foram
encontrados e como se comportam nas consultas realizadas?

**Público:** revendedores e responsáveis por pricing, compras e gestão comercial, tanto
no varejo local quanto na concorrência nacional em marketplaces. Mercado Livre,
Americanas e Amazon foram citados como canais de venda dos clientes, o que **não**
confirma integração com eles.

**Abrangência:** todo o Brasil, começando a validação por Santa Catarina, com filtros
por UF (D-06). "Global" significa Brasil; pesquisa internacional está fora do escopo.

**Identidade:** nome de trabalho SPECSHOP / SSP, direção visual **roxa** e o
Multbovinos como referência de layout (D-14, D-15). Os arquivos do Multbovinos não
vieram no pacote; avançar com o roxo e registrar o que depende da referência.

## Escopo por fase

| Etapa | Escopo |
|---|---|
| Validação do piloto | Epson L3250 no Mercado Livre e fontes candidatas de varejo ao consumidor, sem credenciais do cliente; validar histórico de até 3 meses; SC como referência inicial (D-18) |
| Protótipo | cadastro, pesquisa, estatísticas, histórico e painel sem URLs, com auditoria, usando **dados de exemplo identificados** como tais |
| Fase 1 (MVP) | cadastro mínimo, pesquisa sob demanda de até 10 produtos, fontes validadas, preços com referência, estatísticas e histórico anterior/acumulado conforme a cobertura validada |
| Fontes adicionais do piloto | KaBuM!, MegaMamute, Magalu e demais fontes de varejo/marketplace citadas, sem conta do cliente; prioridade e quantidade registradas pelo desenvolvimento |
| Fase 2 | importar estoque de planilha base e de exportações de ERPs/softwares; relacionar preços ao estoque (D-11, D-12) |
| Evolução futura | componentes do preço separados, preço próprio opcional, novas fontes, alertas e projeções |
| Evolução bem posterior | pesquisa em distribuidores (Fujioka, Martins e outros) e conexão das contas do cliente nesses sites (D-10, D-19); sem dependência com o MVP nem com a fase 2 |

Importar arquivo exportado por um ERP e integrar diretamente com esse ERP são entregas
diferentes; softwares e formatos ainda não foram identificados.

**Fora do compromisso atual:** consulta a distribuidores, pedir contas ou credenciais do
cliente nas fontes, atualização periódica automática, compra automática, alteração
automática de anúncios e gestão fiscal/financeira completa.

**Escala:** começa com até 10 produtos por solicitação, sem fixar o limite de forma
irreversível; progresso e resultado por produto. Metas de volume, desempenho e
simultaneidade estão em aberto.

**Validação técnica prioritária:** acesso aos preços atuais do produto piloto e às
fontes candidatas de histórico. Preço atual não comprova histórico retroativo. Cadastro,
persistência e telas podem avançar enquanto as fontes são validadas; resultado
demonstrativo não comprova integração real.

### Relação com preço próprio e estoque

O fluxo da fase 1 funciona só com o cadastro do produto e a pesquisa de mercado.
Preço próprio, vínculo com anúncio do usuário e saldo ou custo de estoque **não** são
condições para pesquisar. "Valorização/desvalorização" significa alternância dos preços
e apoio ao posicionamento comercial; cálculos de valor financeiro do estoque serão
redefinidos quando a fase 2 for detalhada.

## Jornada principal (proposta)

1. Cadastrar um produto novo: nome e modelo obrigatórios; marca e EAN opcionais.
2. Selecionar até 10 produtos, as fontes disponíveis, a localização do vendedor e o
   destino de entrega.
3. Acionar "Pesquisar" ou "Atualizar pesquisa".
4. A plataforma consulta as fontes habilitadas, associa as ofertas, sinaliza as que
   precisam de revisão e busca o histórico de até 3 meses conforme as fontes validadas.
5. O painel mostra preços, mínimo, máximo, média, mediana, faixa e quantidade de
   ofertas. OLX/Facebook aparecem separados por padrão, com opção de combinar.
6. Para conferir um valor, o usuário aciona "Ver auditoria" e consulta fontes, links,
   condições e momento da pesquisa.
7. Consulta o histórico disponível, com origem e cobertura identificadas, e decide como
   posicionar o anúncio.
8. Pede nova pesquisa quando quiser atualizar; as observações novas alimentam a série
   do mesmo produto.

Visualizar dados guardados e filtrar a apresentação **não** dispara coleta nova; a tela
distingue o horário da última consulta do comando de atualização (proposta).

**Resultado esperado:** concluir um shopping de até 10 produtos e identificar a faixa de
preços praticada, com referências verificáveis e o histórico disponível.

## Dashboard e navegação

| Área | Conteúdo |
|---|---|
| Pesquisa | até 10 produtos novos, fontes disponíveis, localização do vendedor, destino de entrega e "Pesquisar/Atualizar" |
| Resumo por produto | mínimo, máximo, média, mediana, faixa, quantidade de ofertas, conjunto de fontes ativo e data/hora da pesquisa |
| Tabela principal de ofertas | produto/oferta, valor, contexto comercial essencial, nome compacto da fonte/vendedor e "Ver auditoria"; **sem URLs nem coluna de links** |
| Histórico | busca retrospectiva de até 3 meses, continuidade, gráfico por dia/semana/mês/ano e origem/cobertura de cada série |
| Conjuntos de fontes | OLX/Facebook separados por padrão; opção explícita de combinar e indicação do conjunto usado |
| Critérios do catálogo | apenas produtos novos; nota fiscal declarada quando disponível |
| Detalhe da pesquisa | estado por produto/fonte, correspondências em revisão, cobertura histórica, resultados parciais e falhas, com acesso à auditoria |
| Auditoria de preços | fontes, vendedores, links, valores observados, condições, data/hora e ofertas usadas nos indicadores |

**Navegação candidata da fase 1:** Visão geral, Meus produtos, Shopping, Histórico,
Auditoria e Configurações. A auditoria também abre a partir do valor consultado.
**Evolução:** Fontes e conexões (contas externas); Meu estoque e Importações (fase 2).

A proposta visual valoriza tabelas legíveis, filtros visíveis e gráficos claros.
**Personalização em aberto** (D-09, RF-11): filtros e colunas, seleção de cartões e
gráficos ou montagem livre de painéis. Evoluções propostas: filtros salvos, comparação
com preço próprio e indicadores de estoque.
