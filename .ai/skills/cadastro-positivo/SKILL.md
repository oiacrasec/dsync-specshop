---
name: cadastro-positivo
description: Garante conformidade com a Lei do Cadastro Positivo (Lei 12.414/2011) e o art. 43 do CDC em sistemas de análise de crédito, score, histórico de pagamentos e consulta ou envio de dados a birôs de crédito.
---

# Cadastro Positivo e bancos de dados de crédito

Fontes oficiais:
- Lei 12.414/2011: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12414.htm
- CDC, art. 43: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm

> **Regra de ouro:** dados de crédito servem **só para análise de risco de crédito** (art. 7º), precisam ser objetivos e verdadeiros, e o cadastrado tem acesso, correção e cancelamento **gratuitos**.

## 1. Papéis (art. 2º)

| Papel | Quem é |
|---|---|
| **Gestor** | administra o banco de dados (birô) |
| **Fonte** | quem concede crédito ou vende a prazo e envia dados (inclui bancos e serviços de água, luz, gás e telecom) |
| **Consulente** | quem consulta para decidir crédito |
| **Cadastrado** | a pessoa cujos dados estão no banco |

## 2. Que dados podem entrar (art. 3º)

- Só informações **objetivas, claras, verdadeiras e de fácil compreensão**, necessárias para avaliar a situação econômica (§§1º-2º).
- ❌ **Excessivas**: não ligadas ao risco de crédito (§3º I).
- ❌ **Sensíveis**: origem social e étnica, saúde, genética, orientação sexual, convicções políticas, religiosas e filosóficas (§3º II).
- Prazo máximo de permanência: **15 anos** (art. 14).

## 3. Score (art. 7º-A)

Proibido usar no cálculo da nota:
- ❌ dados não ligados ao risco de crédito, nem origem social e étnica, saúde, genética, **sexo** e convicções (I);
- ❌ dados de pessoas sem parentesco de 1º grau ou dependência econômica com o cadastrado (II);
- ❌ o fato de o cadastrado ter consultado os próprios dados (III).

O gestor publica no site sua política de coleta e uso para o score (§1º).

## 4. Direitos do cadastrado (arts. 5º e 6º)

- [ ] **Cancelar ou reabrir** o cadastro, de graça, por telefone, meio físico ou eletrônico, processado em **2 dias úteis** e repassado aos demais gestores (art. 5º I e §§4º-6º).
- [ ] **Acessar de graça**, sem justificativa, dados, histórico e **nota** (art. 5º II); prazo de **10 dias** (§3º).
- [ ] **Impugnar** dado errado e ter a correção em **10 dias** em todos os bancos que receberam a informação (art. 5º III).
- [ ] Conhecer os principais **critérios** da análise de risco (art. 5º IV).
- [ ] Pedir **revisão de decisão automatizada** (art. 5º VI) (ver `inteligencia-artificial` e LGPD art. 20).
- [ ] Saber fontes, com quem os dados foram compartilhados e **quem consultou nos últimos 6 meses** (art. 6º).
- ❌ Proibido dificultar o acesso do cadastrado (art. 6º §1º).

Abertura de cadastro: comunicar ao cadastrado em até **30 dias**, com os canais de cancelamento (art. 4º §4º). Dados só ficam disponíveis a consulentes **60 dias** após a abertura (§7º).

## 5. Uso e acesso

- Uso exclusivo para análise de risco e concessão de crédito ou venda a prazo (art. 7º).
- Só consulta quem tem ou pretende ter relação comercial ou de crédito com o cadastrado (art. 15).
- Histórico de crédito a consulentes só com **autorização específica** do cadastrado, com prova de autenticidade (art. 4º IV "b" e §8º).
- **Rastreabilidade obrigatória** de toda inclusão ou atualização: quem fez, data, fonte, agente e terminal (art. 9º §4º).

## 6. Responsabilidade

- Banco de dados, fonte e consulente respondem **objetiva e solidariamente** por danos (art. 16).
- Consumidor → aplicam-se as sanções do CDC (art. 17). Negativação de no máximo **5 anos** e comunicação prévia (CDC art. 43).

## Checklist antes de entregar

- [ ] Só dados objetivos, sem sensíveis, no cadastro e no score?
- [ ] Acesso, correção, cancelamento e consulta da nota gratuitos e nos prazos?
- [ ] Log de quem incluiu, alterou e consultou cada dado?
- [ ] Decisão automatizada com revisão humana disponível?
