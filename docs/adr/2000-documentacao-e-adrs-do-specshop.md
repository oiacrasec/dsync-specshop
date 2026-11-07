# 2000 — Documentação e ADRs do SPECSHOP

- **Status:** Aceito
- **Data:** 2026-11-07

## Contexto

O SPECSHOP é o primeiro projeto derivado do core (ADR 0036) e só pode acrescentar
arquivos: não edita ADRs, docs ou o índice de ADRs vindos do core. O idealizador entregou
uma especificação (v0.8, 18/10/2026) que pede ao desenvolvedor registrar as decisões
técnicas (DT-01 a DT-10) dentro do próprio documento e mantê-lo atualizado.

Era preciso decidir onde ficam os ADRs do projeto sem colidir com os futuros ADRs do
core, e como trazer a especificação para o padrão de documentação do repositório.

## Decisão

1. **Numeração:** ADRs do SPECSHOP começam em **2000** (`docs/adr/2000-…`, `2001-…`). A
   faixa 0001–1999 fica para o core. Decisão de interesse geral entra no core, com
   numeração do core.
2. **Índice próprio:** os ADRs 2000+ são listados em `docs/domain/specshop/README.md`,
   porque o `docs/adr/README.md` pertence ao core.
3. **Especificação absorvida:** o conteúdo da v0.8 foi consolidado nos documentos abaixo,
   com os IDs originais (D, RF, RQ, Q, DEC, DT) preservados, e o arquivo original não é
   mantido no repositório. Novas definições do idealizador entram direto nesses
   documentos.
4. **Documentos vivos** em `docs/domain/specshop/`:
   - `README.md`: visão, escopo por fase, jornada, navegação e índice de ADRs;
   - `regras.md`: regras de negócio e modelo conceitual;
   - `requisitos.md`: D, RF, RQ e critérios de aceitação;
   - `decisoes-e-pendencias.md`: DEC, Q e pendências de produto;
   - `decisoes-tecnicas.md`: estado das DT e roteiro sugerido.
5. **Decisões técnicas** (DT) viram ADRs 2000+, com os campos do formato pedido pelo
   idealizador (pergunta, estado, decisão, motivo, requisitos, evidência, limites,
   responsável, revisão). A tabela de DT aponta para o ADR. Decisões de produto continuam
   como DEC, registradas a partir do idealizador.
6. **Planos** de entrega do SPECSHOP seguem `docs/plans/entrega-N-<resumo>.md`.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Continuar a numeração do core (0044…) | colide com o próximo ADR do core no merge |
| Prefixo textual (`SPEC-0001`) | foge do padrão numérico; a faixa 2000+ resolve com o mesmo formato |
| Registrar as DT só no documento do idealizador | mistura decisões técnicas num documento de produto e as deixa fora dos ADRs |
| Manter a especificação original ao lado | duas fontes do mesmo conteúdo; a original desatualiza a cada decisão |

## Consequências

- `docs/domain/specshop/` é a única fonte do produto. Ao compartilhar o estado com o
  idealizador, enviar (ou exportar) esses arquivos.
- Toda nova regra de produto entra primeiro nos documentos de domínio, preservando IDs.
- `docs/domain/` e `docs/plans/` pertencem ao projeto (ADR 0036 §5); os ADRs 2000+ são
  arquivos novos e não conflitam com o core.
