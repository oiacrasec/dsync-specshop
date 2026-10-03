---
name: inteligencia-artificial
description: Orienta o uso de IA conforme as regras já vigentes (LGPD art. 20, CDC, ECA Digital, ECA e Cadastro Positivo) e prepara para o futuro Marco Legal da IA (PL 2.338/2023, ainda em tramitação). Use ao implementar modelos de ML, LLMs, decisões automatizadas, score, recomendação, perfilamento, moderação automática ou geração de conteúdo.
---

# Inteligência artificial

> ⚠️ **Status:** o Brasil **ainda não tem lei específica de IA em vigor**. O **PL 2.338/2023** (Marco Legal da IA) foi aprovado no Senado em 10/12/2024 e, em setembro de 2026, aguardava parecer na Comissão Especial da Câmara, com votação prevista para depois das eleições de outubro de 2026. **Revisar esta skill quando a lei for sancionada.**
>
> Acompanhar: https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2487262

**Mesmo sem lei própria, IA já é regulada** pelas leis abaixo, e essas regras são **obrigatórias hoje**.

## 1. Regras vigentes

| Situação | Obrigação | Fonte |
|---|---|---|
| Decisão **só automatizada** que afete interesses (perfil, crédito, consumo, profissional) | direito à **revisão** + explicação dos **critérios** | LGPD art. 20 |
| Dados para treinar ou inferir | base legal, finalidade e minimização; inferir dado **sensível** também conta | LGPD arts. 6º, 7º e 11 §1º |
| Perfil comportamental de pessoa identificada | é **dado pessoal** | LGPD art. 12 §2º |
| Score de crédito | sem dados sensíveis nem sexo; revisão de decisão automatizada | Lei 12.414 arts. 5º VI e 7º-A |
| Discriminação | proibido tratamento para fins discriminatórios ilícitos | LGPD art. 6º IX |
| Serviço com IA para consumidor | responde por defeito e por informação insuficiente | CDC art. 14 |
| Menores | ❌ perfilamento para publicidade, ❌ análise emocional; revisão regular da IA, com opção de desligar | ECA Digital arts. 17 §4º VIII, 22 e 26 |
| Moderação automatizada envolvendo menores | informar se a remoção foi **humana ou automatizada**, com recurso | ECA Digital art. 30 II |
| Deepfake sexual de menor | **crime**, inclusive gerado por IA | ECA arts. 241-C e 241-E |
| Conteúdo gerado de terceiros | respeitar direitos autorais no treino e na saída | Lei 9.610 art. 29 |

## 2. Boas práticas (alinhadas ao PL 2.338 e ao AI Act europeu)

O PL segue a lógica **baseada em risco** (risco excessivo = proibido; alto risco = obrigações reforçadas) e prevê direitos de transparência, explicação e contestação. Já adotar:

- [ ] **Classificar o risco** de cada uso de IA (impacto em direitos: crédito, emprego, saúde, educação e segurança são alto risco).
- [ ] **Transparência:** avisar quando o usuário interage com IA ou vê conteúdo gerado por IA.
- [ ] **Humano no circuito** em decisões de alto impacto, com canal de contestação.
- [ ] **Explicabilidade:** registrar entradas, versão do modelo e fatores da decisão.
- [ ] **Teste de viés** antes de produção e monitoramento contínuo.
- [ ] **Registro** (model card): finalidade, dados de treino, limitações, métricas.
- [ ] **Avaliação de impacto** para usos de alto risco (alinhada ao RIPD da LGPD, art. 38).
- [ ] Dados pessoais enviados a provedores de LLM: mapear transferência internacional (LGPD art. 33) e ❌ não enviar dados sensíveis sem base legal.
- [ ] Proteção contra *prompt injection* e vazamento de dados pelo modelo.

## Checklist antes de entregar

- [ ] Decisões automatizadas têm revisão humana e explicação de critérios?
- [ ] Base legal e minimização para os dados usados pela IA?
- [ ] Usuário sabe que está lidando com IA?
- [ ] Teste de viés e registro do modelo feitos?
- [ ] Nada de perfilamento publicitário ou análise emocional de menores?
