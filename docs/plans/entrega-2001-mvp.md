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
| 2.1 | Modelo de pesquisa, oferta e observação de preço, com identidade estável do produto e datas de referência/obtenção | DT-06, RF-08 | ⬜ |
| 2.2 | Pesquisa sob demanda de até 10 produtos: estado por produto/fonte, falha parcial, limite explícito, nova tentativa manual | DT-07, RF-25, RF-29 | ⬜ |
| 2.3 | Tela "Shopping": seleção de produtos, fontes e região; progresso e resultado | RF-10, RF-29 | ⬜ |
| **3 — Primeiro preço real** | | | |
| 3.1 | Conector do Mercado Livre conforme o 0.2 | DT-02, RF-03 | ⬜ |
| 3.2 | Correspondência de produto, menor preço disponível, condições, kits, duplicatas e valores inválidos | DT-04, RF-05, RF-19, RF-27 | ⬜ |
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
