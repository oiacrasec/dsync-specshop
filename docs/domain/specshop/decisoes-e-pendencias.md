# SPECSHOP — decisões de produto e pendências

Registro das decisões de negócio do idealizador (DEC), das perguntas respondidas nas
rodadas (Q) e do que segue em aberto. Decisões técnicas não entram aqui: ficam em
[decisoes-tecnicas.md](decisoes-tecnicas.md) e nos ADRs 2000+.

**Regra:** novo DEC só quando houver nova definição do produto. Mudar uma regra
confirmada é proposta de produto ao idealizador, nunca escolha técnica silenciosa.
Pendências de produto não bloqueiam o que já está definido; tratar quando afetarem uma
entrega concreta.

## Decisões de produto (DEC)

| ID | Decisão | Estado / origem |
|---|---|---|
| DEC-01 | Nome SPECSHOP / SSP | Direção inicial |
| DEC-02 | Foco em pricing, shopping e posicionamento comercial | Mantido; 6ª rodada confirma venda ao consumidor |
| DEC-03 | Referência Multbovinos e cor roxa | Componentes a detalhar |
| DEC-04 | Público de revenda de eletrônicos/tecnologia | 1ª rodada |
| DEC-05 | Cadastro manual de produtos, sem depender de estoque ou preço próprio | Fase 1, refinado na 2ª rodada |
| DEC-06 | Importação e análise de estoque na fase 2 | 1ª rodada |
| DEC-07 | Histórico por dia/semana/mês/ano | Agregação em aberto |
| DEC-08 | Brasil, SC como início e filtros por UF | 2ª rodada; descarta alcance internacional |
| DEC-09 | Mercado Livre + Epson L3250 como piloto | 2ª rodada |
| DEC-10 | Conexão de contas e pesquisa em distribuidores em evolução bem posterior | Reforçado na 6ª rodada; sem compromisso com a fase 2 |
| DEC-11 | Fujioka/Martins como complementos do piloto | **Substituída** na v0.7: distribuidores fora do MVP/piloto |
| DEC-12 | Preços com fonte e múltiplas estatísticas | 2ª rodada |
| DEC-13 | Atualização sob solicitação; sem coleta agendada | 2ª rodada |
| DEC-14 | Valor consolidado inicial; componentes separados depois | Menor preço disponível confirmado na 5ª rodada |
| DEC-15 | OLX/Facebook separados por padrão, com opção de combinar | 3ª rodada |
| DEC-16 | Região = localização do vendedor + destino de entrega | 3ª rodada |
| DEC-17 | Exclusivamente produtos novos | 3ª rodada, todas as fontes e visões |
| DEC-18 | Facebook Marketplace prioritário entre as fontes Meta; lojas Facebook/Instagram desejadas | 3ª rodada |
| DEC-19 | Nome e modelo obrigatórios; marca e EAN opcionais; nome direciona a pesquisa | 4ª rodada |
| DEC-20 | Até 10 produtos por solicitação, ampliável | 4ª rodada |
| DEC-21 | Histórico de até 3 meses anteriores e continuidade com novas pesquisas | Viabilidade delegada ao desenvolvimento |
| DEC-22 | Menor preço disponível na comparação inicial | 5ª rodada |
| DEC-23 | Histórico incompleto/ausente: preços atuais e período disponível com cobertura | 5ª rodada |
| DEC-24 | Desenvolvedor responde às perguntas técnicas e mantém a documentação atualizada | Orientação expressa do idealizador |
| DEC-25 | Referência inicial: venda ao consumidor em varejo e marketplaces | 6ª rodada |
| DEC-26 | O MVP não pede contas, login, senha ou cadastro do cliente nos sites | 6ª rodada |
| DEC-27 | Links e evidências na auditoria, sem URLs na visualização principal | Atualização final (v0.8); interação em DT-09 |

## Perguntas respondidas (Q)

| ID | Rodada | Tema | Resposta / implicação |
|---|---|---|---|
| Q-01 | 1ª | Segmento e catálogo | Revenda e posicionamento em marketplace |
| Q-02 | 1ª | Objetivo prioritário | Preço de mercado, posicionamento e histórico diário/semanal/mensal/anual |
| Q-03 | 1ª | Fontes | Incluía distribuidores; atualizada pela Q-46: varejo ao consumidor, distribuidores bem depois |
| Q-04 | 1ª | Estoque e entrada | Cadastro manual na fase 1; planilhas e exportações na fase 2 |
| Q-05 | 1ª | Valorização/desvalorização | Alternância de preços e posicionamento, incluindo promoções pontuais |
| Q-06 | 1ª | Abrangência | Local e nacional; detalhada como Brasil/SC na 2ª rodada |
| Q-24 | 2ª | Cadastro e preço próprio | Usuário cadastra; plataforma pesquisa com referências; preço próprio não obrigatório |
| Q-25 | 2ª | Visões de mercado | Mínimo, máximo, média, mediana e faixa, para poucos produtos por vez |
| Q-26 | 2ª | Componentes do valor | Valor final consolidado; componentes depois; ausência tratada explicitamente |
| Q-27 | 2ª | Piloto | Mercado Livre e L3250; Fujioka/Martins substituídos pela Q-46 |
| Q-28 | 2ª | Atualização | Só por solicitação do usuário |
| Q-29 | 2ª | Região | Todo o Brasil; SC como início; filtros de UF |
| Q-35 | 3ª | Filtro regional | Localização do vendedor e destino de entrega; cidade/CEP de SC em aberto |
| Q-36 | 3ª | OLX/Facebook | Separados por padrão, combináveis |
| Q-37 | 3ª | Condição | Apenas novos |
| Q-38 | 3ª | Fontes Meta | Facebook Marketplace e lojas Facebook/Instagram; prioridade ao Marketplace |
| Q-39 | 4ª | Histórico | Até 3 meses anteriores e continuidade; fonte e cobertura a validar |
| Q-40 | 4ª | Produtos por pesquisa | Até 10, ampliável; ofertas por produto em aberto |
| Q-43 | 4ª | Cadastro | Nome e modelo obrigatórios; marca e EAN opcionais |
| Q-42 | 5ª | Vários preços por pagamento/promoção | Menor preço disponível, com referência e condições; normalização em DT-04 |
| Q-44 | 5ª | Histórico ausente/incompleto | Preços atuais e histórico disponível com cobertura |
| Q-46 | 6ª | Fontes e acesso do cliente | Varejo ao consumidor (KaBuM!, MegaMamute, Magalu, Facebook Marketplace e já citadas); sem contas do cliente; distribuidores bem depois |
| Q-47 | Final | Fontes e links | Links e referências na auditoria; dashboard sem URLs |

## Questões com situação atualizada

| ID | Questão | Produto (idealizador) | Desenvolvimento |
|---|---|---|---|
| Q-07 | Produtos idênticos ou equivalentes | expansão para modelos substitutos em aberto | piloto no modelo/variante pedido; correspondência em DT-04 |
| Q-08 | Varejo, atacado e condições | uso inicial definido (venda ao consumidor); atacado bem depois | normalização em DT-04 |
| Q-09 | Referência de mercado | estatísticas e produtos novos confirmados | elegibilidade, duplicatas e condições em DT-04 |
| Q-10 | Frequência | resolvida: sob demanda; estoque na fase 2 | — |
| Q-11 | Volumes, usuários, filiais e empresas | papéis comerciais, filiais e escala futura em aberto | limite e isolamento em DT-06 a DT-08 |
| Q-12 | Custo, lotes e validade | fase 2 | — |
| Q-13 | Manual, planilha e ERP | formatos e softwares em aberto | — |
| Q-14 | Automação da identificação de ofertas | — | correspondência e revisão em DT-04 |
| Q-15 | Indicadores do painel | estatísticas, histórico e referências confirmados | composição inicial em DT-09 |
| Q-16 | Personalização | montagem livre em aberto | configuração inicial simples em DT-09 |
| Q-17 | Tendências futuras | horizonte e prioridade em aberto | método só quando entrar em implementação |
| Q-18 | Giro, vendas e cobertura do estoque | fase 2 ou depois | — |
| Q-19 | Alertas e exportações | prioridade e experiência em aberto | sem coleta automática |
| Q-20 | Componentes do Multbovinos | — | consultar se disponível e registrar em DT-09; sem ela, roxo e fidelidade pendente |
| Q-21 | Dispositivos e tema | prioridade especial em aberto | responsivo inicial em DT-09 |
| Q-22 | Empresa piloto, multiempresa, prazo e orçamento | participante, prazo, orçamento e modelo comercial em aberto | ambiente piloto provisório em DT-01/DT-08 |
| Q-23 | Caso real e medida de sucesso | participante e avaliação comercial | critérios de aceitação e medidas em DT-10 |
| Q-30 | Versões dos produtos | catálogo adicional depois | L3250 nova e kits em DT-04 |
| Q-31 | Elegibilidade e posicionamento | alinhamento com preço próprio no futuro | duplicatas e inválidos em DT-04 |
| Q-32 | Histórico de preço próprio | opcional/futuro | — |
| Q-33 | Sistemas e arquivos de estoque | fase 2 | — |
| Q-34 | Visibilidade de preços de contas externas | evolução bem posterior | isolamento de dados em DT-08 |
| Q-41 | Valor de um período com várias pesquisas | — | DT-05 |
| Q-45 | Ofertas úteis por produto na v1 | — | DT-02/DT-07; o limite de 10 é de produtos |

## Pendências de produto

| Tema | Pendência |
|---|---|
| Responsável | nome do responsável pelo produto a registrar |
| Usuários | número de usuários e papéis de acesso |
| Catálogo | ofertas por produto e total de produtos cadastrados por empresa |
| Região | cidade/CEP de SC no piloto; entrega não confirmada |
| Piloto | empresa participante, prazo, orçamento e modelo comercial |
| Visual | arquivos do Multbovinos; dispositivo ou tema prioritário |
| Personalização | profundidade da configuração dos painéis |
| Fase 2 | sistemas, formatos de estoque e indicadores |
| Evolução | alertas, exportações, preço próprio, tendências e modelos substitutos |
| Sucesso | tempo e medida de utilidade para o revendedor |
| Fontes OLX/Facebook | Facebook Marketplace e lojas Facebook/Instagram bloqueados sem permissão escrita da Meta; OLX sem acesso confirmado (ADR 2001). O conjunto separado (D-20, D-23) pode ficar vazio no MVP: levar ao idealizador |
| Jurídico | auditoria por advogado do ADR 2001 e dos termos de cada fonte antes da produção |

## Catálogo de referência

Exemplos do idealizador, sem pesquisa de preço ou disponibilidade de todos:

| Produto | Equivalência a definir |
|---|---|
| Epson L3250 | **produto do piloto**; identificação e kits/acessórios |
| Echo Dot / Alexa | geração/modelo e cor |
| Amazon Fire TV Stick HD | versão/geração |
| iPhone 17 256 GB | variante, cor e atributos relevantes |
| JBL Boombox | geração/modelo |
| Roku Express | versão/modelo |
