# 2003 — Dados e acesso do SPECSHOP sobre o core

- **Status:** Aceito
- **Data:** 2026-11-07

## Contexto

A etapa 1.1 (DT-01 e DT-08) parte do que o core já decide: stack, execução local,
multi-tenancy por Contrato e Organização (ADR 0006), usuários, perfis e RBAC, JWT, 2FA,
auditoria append-only e contrato de API. Este ADR registra só o que o core não resolve
para o SPECSHOP, decidido item a item com o usuário.

## Decisão

### 1. Escopo de cada dado (aprovado em 2026-11-07)

| Dado | Escopo (ADR 0006) | Motivo |
|---|---|---|
| Produto acompanhado | `ContractScopedModel` | o mesmo produto serve a todas as organizações do contrato; cadastro único e histórico sem divisão |
| Correspondência com o catálogo da fonte | `ContractScopedModel` | acompanha o produto |
| Pesquisa | `OrganizationScopedModel` | cada organização pesquisa com sua região e CEP de entrega (D-22) |
| Resultado da pesquisa (ofertas e indicadores) | `OrganizationScopedModel` | pertence à pesquisa que o gerou; a auditoria mostra o que aquela organização viu |

Alternativa descartada: tudo em `OrganizationScopedModel` (padrão do core), que obrigaria
cadastrar o mesmo produto em cada organização.

### 2. Base global de observações (aprovado em 2026-11-07)

Exceção explícita ao ADR 0006: a observação de oferta pública não tem contrato nem
organização e alimenta o histórico de todos (ADR 2002, item 10).

- **Global:** fonte, anúncio, produto do catálogo, preço, condição, data/hora.
- **Nunca global:** empresa, organização, usuário, CEP, frete calculado, produtos
  acompanhados. O vínculo pesquisa → observação fica no lado com escopo e não é exposto.
- **Append-only**, sem repetir a mesma oferta: chave única (fonte, anúncio, dia, preço).
  O mesmo anúncio coletado de novo no dia com o mesmo preço é ignorado; mudança de preço
  no mesmo dia gera nova observação (RF-08). Ofertas parecidas não são descartadas.

**Performance (exigência do usuário: tabela de grande volume):**

| Regra | Como |
|---|---|
| Deduplicar na escrita | chave única (fonte, anúncio, dia, preço); gravação em lote com `ON CONFLICT DO NOTHING`, um comando por pesquisa |
| Particionar | particionamento nativo do PostgreSQL por mês na data da observação; retenção por partição |
| Índice da consulta de histórico | (produto do catálogo, dia) com `INCLUDE (preço)` para leitura só pelo índice |
| Uma consulta por série | indicadores por dia (mín., mediana com `percentile_cont`, média, máx., quantidade) num único `GROUP BY` sobre os produtos de catálogo da correspondência; sem laço por dia ou produto (sem N+1) |
| Medir (item 2) | volume estimado e plano de execução (`EXPLAIN ANALYZE`) registrados na etapa que criar a tabela; agregado diário materializado só se a medição pedir |

### 3. Confiança nos dados coletados (aprovado em 2026-11-07)

Regra única para todas as fontes, pelo mecanismo de coleta que cada conector declara:

| Mecanismo | Exemplos | Entra na base global |
|---|---|---|
| **Servidor** (o SPECSHOP busca) | API do Mercado Livre, página pública buscada pelo servidor | sempre |
| **Navegador** (o cliente envia) | extensão do navegador | quando atinge o limite de confirmações e passa na verificação de valor |

- **Limite de confirmações configurável**: empresas distintas que enviaram a mesma oferta
  (fonte, anúncio, preço, dia), ou a mesma oferta vista pelo servidor. Começa em **1**
  (poucos clientes no início) e sobe por configuração, sem mudar código.
- **Quarentena de valor fora da curva**: oferta do navegador muito distante das ofertas do
  mesmo produto no dia (servidor ou mediana) fica fora dos indicadores até confirmação ou
  revisão. Limite configurável, calibrado com dados reais.
- **Origem registrada** em tabela restrita (observação → pesquisa, usuário, empresa,
  mecanismo), sem acesso de clientes; a base global segue anônima (item 2).
- **Fraude**: usuário bloqueado (não apagado: licenças, ADR 0015; trilha append-only,
  ADR 0017) e remoção das observações que só ele enviou; as confirmadas por outros ficam.
- **Pendência jurídica**: termos de uso informam o registro da origem e as consequências
  de fraude.

### 4. Execução da pesquisa (aprovado em 2026-11-07)

Sem fila de tarefas no MVP (o core não tem). A tela cria a pesquisa e dispara **uma
requisição por produto**, até 3 em paralelo; a extensão envia suas ofertas em requisição
própria. Cada requisição é curta, a falha de um produto não derruba os outros (RQ-03) e
"Tentar de novo" refaz só aquele produto. Produto não processado (tela fechada) fica
"pendente" e é retomado pelo usuário (D-16).

- Alternativas descartadas no MVP: requisição única síncrona (tempo limite, worker preso,
  sem andamento) e fila Celery/Redis (infraestrutura nova sem medição que a justifique).
- **Medir na etapa 2.2** o tempo real por produto e por pesquisa; a fila só entra se a
  medição pedir.

### 5. Permissões (aprovado em 2026-11-07)

Recursos e ações do SPECSHOP no RBAC do core (ADR 0016):

| Recurso | Ações | Escopo |
|---|---|---|
| Produtos | ver, criar, editar, arquivar | contrato |
| Correspondência | ver, confirmar | contrato |
| Pesquisa | ver, executar, tentar de novo | organização |
| Histórico | ver | global, restrito aos produtos que o contrato acompanha |
| Auditoria | ver | organização |
| Dashboard | ver | contrato e organização ativa |

Perfis iniciais (o cliente pode criar outros):

| Perfil | Produtos | Correspondência | Pesquisa | Histórico, Auditoria, Dashboard |
|---|---|---|---|---|
| Gestor de preços | todas | ver, confirmar | todas | ver |
| Comprador/Analista | ver | ver | todas | ver |
| Leitor | ver | ver | ver | ver |

Só a equipe SPECSHOP (superadmin) acessa: origem das observações, quarentena, bloqueio por
fraude e limites configuráveis (item 3).

## Alternativas consideradas

Registradas em cada item acima.

## Consequências

- Etapa 1.2 (`catalog`) usa `ContractScopedModel`; etapa 2.1 cria pesquisa e resultado
  com `OrganizationScopedModel` e a base global particionada, fora do ADR 0006 por esta
  exceção.
- A base global exige medição de volume e `EXPLAIN ANALYZE` na etapa que a criar.
- Pendência jurídica: termos de uso sobre registro de origem e fraude (item 3).
