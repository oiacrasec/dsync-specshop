# SPECSHOP — telas do MVP

Desenho das telas em `design/specshop-telas.figcraft`, arquivo do projeto que usa a
biblioteca do core (`design/datasync-ds.figcraft`) sem editá-la (ADR 0036, ADR 0040).
Estrutura, lista (`ui-table` + `ui-filter`) e formulário seguem o **app real** do core;
onde o padrão desenhado na biblioteca diverge do app, vale o app.

Valores, lojas e vendedores nas telas são **de exemplo**.

## Inventário

| Tela | Conteúdo | Atende |
|---|---|---|
| 1 · Meus produtos | grade com busca e filtros avançados; produto, menor preço, situação da última pesquisa; ações Editar e Arquivar | RF-01, D-24 |
| 1a · Novo produto | formulário: nome e modelo obrigatórios, marca e EAN opcionais; condição sempre nova (na descrição) | RF-01, D-21, D-24 |
| 1b · Detalhe do produto | indicadores da última pesquisa, correspondência, atalhos para histórico e auditoria | RF-22, RF-31 |
| 1c · Confirmar correspondência | produtos do catálogo da fonte com checkbox; kits e modelos diferentes ficam de fora | DT-04, ADR 2002 item 10 |
| 1d · Arquivar produto | confirmação; o produto sai da lista e o histórico é mantido | proposta (ver pendências) |
| 1e · Lista vazia | grade com "Nenhum registro encontrado." (`emptyMessage` do `ui-table`) | — |
| 2 · Shopping: nova pesquisa | até 10 produtos, fontes, UF do vendedor e CEP de entrega; pesquisa só no clique | RF-29, RF-25, D-16, D-22 |
| 2a · Shopping: resultado | uma linha por produto e fonte; concluída, indisponível; Pix quando a extensão captura; tentar de novo | RF-03, RQ-03, ADR 2002 |
| 2b · Shopping: instalar extensão | diálogo com "Pesquisar só o catálogo" e "Instalar extensão" | ADR 2002 item 7 |
| 3 · Dashboard | visão macro: indicadores da carteira, variação do menor preço por produto em %, itens que precisam de atenção | RF-10, RF-22, D-32 |
| 4 · Histórico | produto, período, conjunto de fontes; agrupamento dia/semana/mês/ano; lacunas visíveis; cobertura | RF-08, RF-09, D-07, D-26, D-28 |
| 5 · Auditoria | página com abas por indicador e todas as ofertas; preço e condições, vendedor e cidade/UF, condição e NF; link no menu de ações | RF-06, RF-31, D-05, D-32 |

## Decisões de desenho

- **Auditoria como página** (DT-09): reaproveita a grade do core; painel lateral exigiria
  componente que a biblioteca não tem.
- **Seleção dos produtos no Shopping** com o MultiSelect do core.
- **Dashboard macro**: só contagens e variações por produto; nunca soma preços de produtos
  diferentes (RF-22).

## Pendências

| Pendência | Situação |
|---|---|
| Cor roxa (D-14) | tema "Tema SPECSHOP" estendido com roxo provisório `#7C3AED`, mas o FigCraft não aplica a extensão aos componentes da biblioteca; tom definitivo a definir com o idealizador |
| Ícones | biblioteca do core sem ícone de arquivar (usada a lixeira) e de atualizar ("Tentar de novo" sem ícone) |
| "Pesquisa antiga" no dashboard | prazo não definido na especificação (exemplo: 2 dias) |
| Itens do dashboard clicáveis | proposta: abrir o detalhe do produto |
| Confirmar correspondência e arquivar | sugestões de desenvolvimento; levar ao idealizador |
| Padrões da biblioteca do core | divergem do app (barra de filtros, altura do card, rodapé do formulário, lista vazia); corrigir no repositório do core |
