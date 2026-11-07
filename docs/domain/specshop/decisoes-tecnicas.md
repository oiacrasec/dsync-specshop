# SPECSHOP — decisões técnicas delegadas (DT)

O idealizador delegou ao desenvolvimento as escolhas técnicas: arquitetura,
tecnologias, hospedagem, banco, autenticação, acesso às fontes, normalização,
agregação histórica e processamento das pesquisas (D-29, DEC-24).

**Como trabalhar:**

- Decidir o que for técnico, registrar, implementar, validar e atualizar a
  documentação. **Não** devolver ao idealizador perguntas de linguagem, framework,
  banco, biblioteca ou processamento.
- Questão técnica aberta não paralisa partes independentes. Decisão provisória e
  reversível é aceitável se registrada com motivo e critério de revisão.
- Pendência de produto é diferente: mudança de objetivo, prioridade de fase ou regra
  confirmada volta ao idealizador quando afetar uma entrega concreta. Informação que só
  ele tem (referência visual, dado da empresa) pode ser pedida.
- No MVP, nunca pedir credenciais do cliente em varejo, marketplace ou distribuidor.
- Já decididos, não reabrir: marca opcional, apenas novos, limite inicial de 10, menor
  preço disponível, pesquisa sob demanda, histórico parcial e fontes de venda ao
  consumidor sem contas do cliente.

## Registro

Cada DT resolvida vira um **ADR 2000+** ([ADR 2000](../../adr/2000-documentacao-e-adrs-do-specshop.md)),
e a linha abaixo recebe o estado e o link. Uma DT pode ser coberta por ADR do core; nesse
caso o ADR do SPECSHOP registra só o que é específico e aponta para o do core.

**Estados:** A definir · Decidida provisoriamente · Decidida · Implementada · Validada ·
Dependência externa. Estados diferentes refletem fatos diferentes: escolher não comprova
implementar; implementar uma fonte não comprova acesso a dados reais; gráfico de exemplo
não comprova histórico retroativo.

| ID | Pergunta | Quando resolver / evidência esperada | Estado | ADR |
|---|---|---|---|---|
| DT-01 | Tecnologias, arquitetura, versões e ambiente inicial; como rodar localmente | antes da estrutura inicial: escolha, motivo, organização e comando de execução verificado | A definir (base do core: ADRs 0001–0003) | — |
| DT-02 | Como obter preços atuais reais da L3250 no Mercado Livre e nas candidatas, sem credenciais do cliente; acesso, cobertura, limite e mecanismo | cedo, com documentação e consulta real; avaliar KaBuM!, MegaMamute, Magalu e Facebook Marketplace; não substituir integração por dados de exemplo | A definir | — |
| DT-03 | Qual fonte dá histórico anterior; como acessar, identificar métrica/data, importar e demonstrar até 3 meses | cedo; fonte, forma de obtenção e amostra real; sem histórico, registrar evidência e aplicar D-28 | A definir | — |
| DT-04 | Pesquisa por nome/modelo com marca/EAN opcionais; variante nova correta; menor preço disponível; condições, kits, duplicatas e inválidos | antes de consolidar ofertas; casos da L3250, inclusive acessórios que só citam o modelo; preço baixo legítimo não é descartado | A definir | — |
| DT-05 | Agrupamento por dia/semana/mês/ano; várias consultas no período; fuso, janela retrospectiva, lacunas e métricas diferentes | antes do histórico visual; conferir datas, intervalos sem dados e mudança de conjunto de fontes | A definir | — |
| DT-06 | Modelo de dados: identidade do produto, pesquisas, ofertas, contexto regional, conjuntos de fontes e histórico; duplicatas e retenção | antes da persistência definitiva; esquema/migrations e continuidade do produto após novas pesquisas | A definir | — |
| DT-07 | Processar até 10 produtos com limites da fonte, progresso, falha parcial e nova tentativa; ofertas por produto | antes da pesquisa em lote; lote completo, sem resultado, falha parcial e tentativa acima de 10; sem coleta periódica | A definir | — |
| DT-08 | Acesso ao SPECSHOP e isolamento de dados no piloto; acesso técnico às fontes sem contas do cliente | antes de dados reais persistidos; premissas, proteção e configuração técnica; sem coleta de credenciais do cliente | A definir (base do core: ADRs 0006 e 0009) | — |
| DT-09 | Organização de cadastro, pesquisa, filtros, indicadores e auditoria, com links fora da tela principal; componentes do Multbovinos | durante a interface; forma da auditoria e acesso contextual; painel sem URLs, roxo, configuração simples; marcar dependência da referência visual | A definir | — |
| DT-10 | Verificações de cálculos, correspondências, datas, combinações, lote, integração real e vínculo indicador → auditoria | em cada parte e antes de concluir; demonstrar os [critérios de aceitação](requisitos.md#critérios-de-aceitação-da-fase-1) | A definir | — |

Nova DT recebe o próximo ID livre (DT-11…); não renumerar.

## Conteúdo do ADR de uma DT

Usar o [modelo de ADR](../../adr/README.md#modelo) e incluir, a partir do formato pedido
pelo idealizador:

- **Pergunta** resolvida e **estado** (da lista acima).
- **Decisão:** escolha concreta e comportamento resultante.
- **Motivo e alternativas**, proporcional à importância.
- **Requisitos relacionados:** IDs D, RF, RQ, Q ou DEC.
- **Evidência:** documentação consultada, componente implementado e verificação feita.
- **Limites e pendências:** o que não foi comprovado ou depende de acesso/dados.
- **Responsável e data**; **revisão**, se provisória.

## Após cada etapa relevante

1. Atualizar o estado da DT e o ADR correspondente.
2. Atualizar os documentos de domínio afetados, mantendo coerência entre visão,
   requisitos, regras, fases e critérios.
3. Marcar perguntas resolvidas e atribuir responsável às pendências restantes.
4. Novo DEC só para nova definição de produto; implementação fica em DT.
5. Preservar IDs e decisões anteriores, registrando substituições.
6. Informar o que foi implementado, validado e continua pendente, distinguindo
   resultado real de demonstração.

Decisão técnica pendente segue com investigação e avanço nas partes independentes. Se
depender de acesso ou informação externa, registrar a dependência e o resultado
observado, sem apresentar a funcionalidade como concluída.

## Roteiro sugerido pelo idealizador

Base para o plano de entrega em `docs/plans/`. A ordem pode mudar conforme as
dependências; cadastro, persistência e protótipo avançam enquanto as fontes são validadas.

| Ordem | Entrega | Resultado verificável |
|---|---|---|
| 1 | Iniciar DT-01 a DT-03 | estrutura escolhida e primeiras verificações de acesso a preços/histórico registradas |
| 2 | Cadastro e persistência de produtos | nome/modelo obrigatórios, marca/EAN opcionais, identidade estável |
| 3 | Pesquisa de até 10 produtos | solicitação manual, estado por produto e fonte, limite explícito, falha parcial |
| 4 | Primeiro caminho real de preço | L3250 numa fonte ao consumidor sem credenciais, oferta equivalente, menor preço e referência rastreável |
| 5 | Estatísticas, dashboard e auditoria | cálculos conferidos, região e fontes identificadas, painel sem URLs, auditoria contextual, combinação recalculada |
| 6 | Histórico e continuidade | dados anteriores quando obtidos, observações acumuladas, origem/métrica e cobertura; ausência conforme D-28 |
| 7 | Verificação do piloto | critérios de aceitação avaliados, real distinguível de demonstração, DTs atualizadas |
