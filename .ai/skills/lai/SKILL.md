---
name: lai
description: Garante conformidade com a Lei de Acesso à Informação (Lei 12.527/2011) em sistemas para órgãos públicos, empresas estatais ou entidades privadas que recebem recursos públicos. Use ao construir portais de transparência, e-SIC/pedidos de informação, dados abertos, classificação de sigilo ou qualquer sistema que guarde informação pública.
---

# LAI: Lei de Acesso à Informação (Lei 12.527/2011)

Fonte oficial: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm

> **Regra de ouro:** **publicidade é a regra, sigilo é a exceção** (art. 3º I). Informação pessoal continua protegida (art. 31) e se aplica junto com a LGPD.

## 1. Quem está sujeito

- Órgãos dos três Poderes, Tribunais de Contas, MP, autarquias, fundações, **empresas públicas e sociedades de economia mista** (art. 1º).
- Entidades **privadas sem fins lucrativos** que recebem recursos públicos, na parte desses recursos (art. 2º).
- Empresas privadas que prestam serviço ao poder público e tratam essas informações também respondem (arts. 33 e 34, parágrafo único).

## 2. Transparência ativa: o site deve (art. 8º §3º)

- [ ] Ter **busca** de conteúdo em linguagem clara.
- [ ] Permitir baixar relatórios em formatos **abertos e não proprietários** (CSV, ODS, TXT).
- [ ] Permitir **acesso automatizado** por máquinas (API, formatos estruturados).
- [ ] Documentar os formatos dos dados.
- [ ] Garantir **autenticidade e integridade**.
- [ ] Manter os dados **atualizados**.
- [ ] Informar contato eletrônico ou telefônico do órgão.
- [ ] Ser **acessível** para pessoas com deficiência (ver `acessibilidade`).

Conteúdo mínimo publicado (art. 8º §1º): competências e estrutura, repasses, despesas, licitações e contratos, programas e obras, perguntas frequentes.

## 3. Transparência passiva: pedidos de informação

- [ ] Canal de pedido **pela internet** (art. 10 §2º).
- [ ] Identificação sem exigências que inviabilizem o pedido; **proibido exigir o motivo** (art. 10 §§1º e 3º).
- [ ] Acesso imediato; se não for possível, até **20 dias**, prorrogáveis por mais **10** com justificativa (art. 11 §§1º-2º).
- [ ] Busca e fornecimento **gratuitos**; cobra-se só o custo de reprodução (art. 12).
- [ ] Negativa com motivo, informando **recurso** (prazo de **10 dias**; resposta em **5**) (arts. 11 §4º e 15).
- [ ] Informação parcialmente sigilosa → entregar a parte pública com **tarja** no trecho sigiloso (art. 7º §2º).
- [ ] Fornecer em formato digital quando o requerente aceitar (art. 11 §5º).
- [ ] Protocolo e acompanhamento do pedido; estatísticas anuais de pedidos (art. 30 III).

## 4. Sigilo (arts. 23 a 30)

| Grau | Prazo máximo |
|---|---|
| Ultrassecreta | 25 anos |
| Secreta | 15 anos |
| Reservada | 5 anos |

- Vencido o prazo, a informação vira **pública automaticamente** (art. 24 §4º) → o sistema deve tratar isso sozinho.
- A classificação registra assunto, fundamento, prazo e autoridade (art. 28).
- Acesso a informação sigilosa só para credenciados com necessidade de conhecer (art. 25 §1º) → RBAC e trilha de auditoria.
- Não pode ser negado acesso a informação necessária à tutela de direitos fundamentais ou sobre violação de direitos humanos (art. 21).

## 5. Informação pessoal (art. 31)

- Intimidade, vida privada, honra e imagem: acesso restrito por até **100 anos**, só para agentes autorizados e para o próprio titular (§1º I).
- Divulgação a terceiros só com previsão legal ou consentimento expresso (§1º II).
- Quem acessar responde pelo uso indevido (§2º).
- 👉 Em portais de transparência, **mascarar dados pessoais** (ex.: CPF parcial) conforme a LGPD.

## 6. Responsabilidades

- Entidade privada com vínculo público que descumprir: advertência, multa, rescisão, suspensão e inidoneidade para contratar (art. 33).
- Divulgação ou uso indevido de informação sigilosa ou pessoal → responsabilidade direta pelos danos (art. 34).

## Checklist antes de entregar

- [ ] Dados públicos publicados em formato aberto, com API e busca?
- [ ] Fluxo de pedido com prazos (20+10), recurso e protocolo?
- [ ] Sigilo com prazo e desclassificação automática?
- [ ] Dados pessoais mascarados e com acesso controlado?
