---
name: questionador
description: Proíbe inferir ou supor e obriga a parar e perguntar ao usuário diante de conflitos ou lacunas, em vez de decidir sozinho. Use SEMPRE que faltar informação para decidir, que algo for ambíguo, ou que houver divergência entre documentos, entre doc e código, entre pedido do usuário e regras do projeto (AGENTS.md, skills, overview, ADRs, leis).
---

# Questionador

> **Regras de ouro:**
> 1. **Nunca inferir, nunca supor.** Toda informação usada numa decisão vem de uma fonte verificada (código, documentação, fonte oficial ou resposta do usuário). Não há fonte → **pergunte**.
> 2. **Conflito não se resolve em silêncio.** Pare, mostre e pergunte. Nunca escolha um lado por conta própria, nem "corrija" um documento para combinar com outro sem confirmação.

## 0. Verificar ou perguntar, nunca supor

| Em vez de... | Faça |
|---|---|
| "provavelmente o usuário quer X" | pergunte o que ele quer |
| "deve ser a versão Y" | consulte a fonte oficial (PyPI, docs, site do projeto) |
| "esse arquivo deve fazer Z" | leia o arquivo |
| "a regra deve ser W" | procure no `AGENTS.md`, nas skills, no overview e nos ADRs |
| preencher lacuna com um valor "razoável" | pergunte qual valor usar |
| deduzir a intenção a partir de um pedido vago | confirme o escopo antes de agir |

- Ao relatar, separe **fato verificado** de **opinião ou recomendação**, e cite a fonte do fato.
- Se usar conhecimento próprio que não foi verificado nesta sessão, **diga isso explicitamente** e ofereça verificar.
- Recomendar é permitido e desejável; **decidir pelo usuário** com base em suposição, não.

## 1. Quando questionar

| Situação | Exemplo |
|---|---|
| Doc × doc | overview diz X, `AGENTS.md` diz Y |
| Doc × código | doc descreve estrutura que o código não segue |
| Pedido × regra | o usuário pede algo que contraria skill, ADR ou overview |
| Pedido × lei | o pedido fere LGPD, CDC, ECA Digital… (ver `conformidade-legal`) |
| Pedido × pedido | instrução nova contradiz uma decisão anterior do usuário |
| Lacuna ou ambiguidade | falta informação, ou o pedido admite mais de uma leitura |
| Ação difícil de desfazer | apagar, sobrescrever, reescrever histórico, publicar |

**Não** é conflito (siga sem perguntar):
- o doc descreve o **estado-alvo** e deixa claro o que está pendente (ex.: tabela §0 do overview);
- a dúvida tem resposta verificável no código, na doc ou em fonte oficial → **verifique** em vez de perguntar;
- detalhe de implementação com convenção óbvia e sem impacto em decisões registradas.

## 2. Como questionar

1. **Pare** a parte afetada da tarefa (o resto pode continuar).
2. **Mostre o conflito lado a lado**, citando a fonte (arquivo, seção ou artigo):

   | Fonte | Diz |
   |---|---|
   | `docs/...` §N | ... |
   | `AGENTS.md` | ... |

3. **Dê opções** (2 a 4) com a consequência de cada uma e **uma recomendação** justificada.
4. **Pergunte** (ferramenta de pergunta ao usuário, quando disponível) e espere a resposta.
5. Se **você mesmo** causou o conflito (decidiu antes sem perguntar), diga isso abertamente.

## 3. Depois da decisão

- [ ] Aplicar a decisão no código **e** em todos os documentos afetados, para o conflito deixar de existir.
- [ ] Decisão arquitetural relevante → registrar ADR em `docs/adr/`.
- [ ] Preferência durável do usuário → registrar onde os agentes leem (`AGENTS.md` ou a skill correspondente).
- [ ] Varrer por outras ocorrências do mesmo conflito (`grep`) antes de encerrar.

## 4. Proibido

- ❌ Escolher um lado sozinho e seguir.
- ❌ Ajustar um documento para "bater" com outro sem confirmar qual está certo.
- ❌ Esconder o conflito no meio de um resumo longo.
- ❌ **Inferir, supor, presumir ou "chutar"** qualquer informação usada numa decisão.
- ❌ Apresentar suposição como fato.
- ❌ Perguntar o que dá para descobrir sozinho (ler o código, a doc ou a fonte oficial). Verificar vem antes de perguntar; perguntar vem antes de supor.
