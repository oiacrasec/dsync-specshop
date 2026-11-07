# SPECSHOP — direções, requisitos e critérios de aceitação

IDs preservados da especificação v0.8; não renumerar. Regras detalhadas em
[regras.md](regras.md).

## Direções (D)

| ID | Direção | Etapa / detalhamento |
|---|---|---|
| D-01 | Plataforma web, simples e direta | Geral |
| D-02 | Público inicial de revenda de eletrônicos/tecnologia no varejo e em marketplaces | Fase 1 |
| D-03 | Apoiar pricing, shopping e posicionamento dos anúncios | Fase 1 |
| D-04 | Cadastro manual dos produtos a pesquisar, independente do estoque | Fase 1 |
| D-05 | Preservar a referência dos preços e dar acesso às ofertas de origem na auditoria | Fase 1; URLs fora da visualização principal |
| D-06 | Brasil, com SC como ponto de partida e filtros de UF para todo o país | Fase 1 e expansão |
| D-07 | Histórico visual com filtros por dia, semana, mês e ano | Fase 1; agregação a detalhar |
| D-08 | Mínimo, máximo, média, mediana e faixa de preços | Fase 1; ofertas elegíveis a definir |
| D-09 | Configuração dos dashboards pelo usuário | Profundidade em aberto |
| D-10 | Pesquisar em distribuidores, inclusive com contas do cliente | Evolução bem posterior; fora do MVP e do piloto |
| D-11 | Importar estoque de planilha base e exportações de ERPs/softwares | Fase 2; formatos e sistemas em aberto |
| D-12 | Relacionar o acompanhamento de preços ao estoque | Fase 2; indicadores a definir |
| D-13 | Manter tendências futuras na visão de evolução | Método, horizonte e etapa em aberto |
| D-14 | Nome de trabalho SPECSHOP / SSP e direção visual roxa | Geral |
| D-15 | Multbovinos como referência de layout | Componentes a consultar |
| D-16 | Pesquisar/atualizar mediante solicitação do usuário | Fase 1; sem atualização automática |
| D-17 | Valor final consolidado; separar componentes depois | Fase 1; alcance do valor a explicitar |
| D-18 | Piloto com Epson L3250 e Mercado Livre | Definido; acesso técnico a validar |
| D-19 | Fujioka, Martins e outros distribuidores fora das fontes do piloto/MVP | Evolução bem posterior |
| D-20 | OLX, Facebook Marketplace e lojas Facebook/Instagram separados por padrão, com opção de combinar | Regra definida; coleta e etapa por fonte em aberto |
| D-21 | Exclusivamente produtos novos | Definido, em todas as fontes |
| D-22 | Localização do vendedor e destino de entrega nos filtros regionais | Definido; controles independentes e combináveis propostos |
| D-23 | Facebook Marketplace prioritário entre as fontes Meta, contemplando lojas Facebook/Instagram | Mecanismo e etapa em aberto |
| D-24 | Nome e modelo obrigatórios; marca e EAN opcionais; nome direciona a pesquisa | Definido |
| D-25 | Até 10 produtos por pesquisa, com ampliação futura | Fase 1; não limita ofertas nem produtos cadastrados |
| D-26 | Histórico de até 3 meses anteriores e continuidade com novas pesquisas | Fase 1; fonte e cobertura a validar |
| D-27 | Menor preço disponível na comparação inicial, com fonte e condições | Definido |
| D-28 | Com histórico incompleto ou ausente, preços atuais e histórico disponível com cobertura | Definido |
| D-29 | Perguntas técnicas delegadas ao desenvolvedor, que decide, valida e registra | Definido; ver [decisoes-tecnicas.md](decisoes-tecnicas.md) |
| D-30 | Ofertas de varejo PF e marketplaces como referência inicial de mercado | Definido; KaBuM!, MegaMamute e Magalu candidatos |
| D-31 | O MVP não pede contas, login, senha ou cadastro do cliente nos sites pesquisados | Definido; acesso por fonte a validar |
| D-32 | Links e evidências numa área de auditoria; dashboard sem URLs | Definido; apresentação em DT-09 |

## Requisitos funcionais (RF)

| ID | Requisito | Estado / etapa |
|---|---|---|
| RF-01 | Cadastrar e editar produtos novos: nome/modelo obrigatórios, marca/EAN opcionais | Definido — fase 1 |
| RF-02 | Registrar quantidades e custos de estoque | Fase 2 |
| RF-03 | Pesquisar ofertas ao consumidor nas fontes habilitadas, sem contas do cliente | Definido — fase 1; Mercado Livre no piloto, demais a validar |
| RF-04 | Filtrar por produto e recorte local/nacional: localização do vendedor e destino de entrega | Definido — fase 1; cidade/CEP em aberto |
| RF-05 | Relacionar cada oferta ao produto/variante correta | Proposta; método em DT-04 |
| RF-06 | Origem, vendedor, link e horário disponíveis na auditoria | Definido — fase 1; sem URLs no dashboard |
| RF-07 | Relacionar preços à posição de estoque | Fase 2 |
| RF-08 | Guardar resultados e acrescentar as novas pesquisas à série do mesmo produto | Definido — fase 1; identidade, duplicatas e retenção em DT-06 |
| RF-09 | Histórico visual por dia, semana, mês e ano | Definido — fase 1; agregação em DT-05 |
| RF-10 | Dashboard de shopping e comportamento de preços | Definido — fase 1 |
| RF-11 | Configurar a visualização | Direção definida; profundidade em aberto |
| RF-12 | Importar planilha base e exportações de ERPs/softwares | Fase 2 |
| RF-13 | Exportar comparações | Proposta; prioridade e formato em aberto |
| RF-14 | Configurar alertas | Proposta futura; não autoriza coleta periódica na fase 1 |
| RF-15 | Controlar acesso aos dados da empresa | Proposta para uso real; DT-08 |
| RF-16 | Informar ou vincular preço/anúncio próprio | Futura/opcional; não exigida no cadastro |
| RF-17 | Visão de aquisição em distribuidores, distinta da venda ao consumidor | Evolução bem posterior |
| RF-18 | Diferença entre preço próprio e referência | Proposta dependente de RF-16 |
| RF-19 | Menor preço disponível como valor de comparação, com referência e condições | Definido — fase 1 |
| RF-20 | Conectar a conta do cliente em distribuidores | Evolução bem posterior |
| RF-21 | Projeções/tendências futuras | Visão de evolução |
| RF-22 | Mínimo, máximo, média, mediana e faixa por produto | Definido — fase 1; elegibilidade em aberto |
| RF-23 | OLX/Facebook separados por padrão, com opção de combinar | Definido; coleta e etapa em aberto |
| RF-24 | Seleção de UFs para origem do vendedor e destino, começando por SC | Direção definida |
| RF-25 | Pesquisa/atualização só por ação do usuário | Definido — fase 1 |
| RF-26 | Evidência de produto novo e nota fiscal declarada, quando disponíveis | Novos definidos; campos e revisão propostos |
| RF-27 | Resultados e estatísticas só com produtos novos, em todas as fontes e visões | Definido |
| RF-28 | Identificar o conjunto de fontes ativo e recalcular ao combinar | Proposta de detalhamento de RF-23 |
| RF-29 | Selecionar até 10 produtos por solicitação | Definido — fase 1 |
| RF-30 | Buscar e incorporar até 3 meses de histórico, com fonte e data; cobertura indicada se incompleto | Definido — fase 1; acesso por fonte em DT-03 |
| RF-31 | Auditoria acessível a partir do produto, pesquisa ou indicador | Definido — fase 1; apresentação em DT-09 |

## Requisitos de qualidade (RQ)

| ID | Necessidade | Pendência |
|---|---|---|
| RQ-01 | Rastrear origem, data/hora e contexto dos indicadores pela auditoria, com a tela principal limpa | Campos por fonte; DT-09 |
| RQ-02 | Proteger dados por empresa/usuário e futuras conexões | Acesso, retenção e segredos (DT-08) |
| RQ-03 | Explicar falhas e pesquisas parciais, preservando o horário dos dados anteriores | Estados e atualização manual |
| RQ-04 | Leitura clara em computador e telas menores | Dispositivos prioritários e acessibilidade |
| RQ-05 | Até 10 produtos por pesquisa, preparado para ampliar | Tempo, simultaneidade e volume em aberto (DT-07) |
| RQ-06 | Consistência de séries e estatísticas, separando histórico externo de observações atuais | Datas, métrica, fuso, agregação, duplicidade e mudança de fontes/filtros (DT-05) |

## Critérios de aceitação da fase 1

- [ ] Cadastrar a Epson L3250 com nome/modelo e pesquisar sem marca, EAN, estoque, preço
      próprio ou links de concorrentes.
- [ ] Selecionar e consultar até 10 produtos, com aviso claro ao tentar ultrapassar.
- [ ] Coleta disparada somente por solicitação do usuário.
- [ ] Consultar fontes sem pedir login, senha ou cadastro do cliente; fontes inacessíveis
      aparecem como pendentes/indisponíveis.
- [ ] Cards, gráficos e tabelas principais sem URLs nem colunas de links; acesso
      contextual à auditoria.
- [ ] Na auditoria, fonte, link, preço e horário do registro que gerou o número;
      contribuintes de média/mediana consultáveis.
- [ ] Mínimo, máximo, média e mediana conferidos sobre uma amostra de ofertas elegíveis.
- [ ] Ofertas incompatíveis, valores inválidos e cobertura insuficiente identificados.
- [ ] Localização do vendedor e destino de entrega identificados e combináveis,
      iniciando por SC.
- [ ] Histórico de até 3 meses da L3250 validado, registrando fonte, período, métrica e
      cobertura obtidos.
- [ ] Novas pesquisas incorporadas à série do mesmo produto, sem perder dados e sem
      duplicar reimportações.
- [ ] Histórico por dia/semana/mês/ano sem inventar observações; lacunas consideram dados
      importados e consultas próprias.
- [ ] Histórico ausente ou parcial: preços atuais e histórico disponível com cobertura
      explícita.
- [ ] Menor preço disponível com condições e fonte; desconhecido nunca vira zero e preço
      parcial não vira total comprovado.
- [ ] Resultados parciais quando uma fonte falha, com nova solicitação possível.
- [ ] Só produtos novos em todas as fontes; usados/recondicionados inelegíveis.
- [ ] OLX/Facebook separados por padrão e combináveis, com conjunto identificado.
- [ ] Na combinação, indicadores recalculados sobre ofertas individuais elegíveis, com
      critérios regionais e duplicatas tratadas.
- [ ] Nota fiscal registrada só quando declarada, sem inferir pela origem.
- [ ] Um revendedor consegue fazer o shopping e usar o resultado para se posicionar
      (tempo e medida de utilidade em aberto).
