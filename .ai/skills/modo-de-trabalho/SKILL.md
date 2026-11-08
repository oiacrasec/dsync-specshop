---
name: modo-de-trabalho
description: Preferências permanentes do usuário sobre como trabalhar neste projeto (idioma, formato das respostas, ritmo de revisão, versões, decisões). Leia e siga no INÍCIO DE TODA SESSÃO, com qualquer agente (Claude, Codex ou outro).
---

# Modo de trabalho

Preferências do usuário que valem **sempre**, para qualquer agente. Esta skill é a fonte
única delas; o `AGENTS.md` manda lê-la no início de toda sessão.

## Comunicação

| Regra | Detalhe |
|---|---|
| Idioma | sempre **português brasileiro** |
| Formato | curto, humanizado e **visual** (tabelas, setas, blocos pequenos): skill `explicacao-eficiente` |
| Fato × opinião | separar o que foi **verificado** (com fonte) do que é recomendação; avisar quando algo vem de conhecimento próprio não verificado |

## Decisões

| Regra | Detalhe |
|---|---|
| Padrão primeiro | seguir ao máximo os componentes, layouts, filtros, ações e fluxos existentes, tanto no app quanto no FigCraft. Para sair do padrão, apresentar o motivo e **perguntar antes**; não decidir a exceção sozinho |
| Nunca supor | sem fonte verificada, **perguntar**: skill `questionador` |
| Conflitos | mostrar as fontes lado a lado, com opções e recomendação, e **perguntar** |
| Uma coisa por vez | ao revisar ou decidir, apresentar **um ponto por vez** e só avançar com a confirmação do usuário |
| Recomendar | sempre dar uma recomendação justificada; quem decide é o usuário |
| Registrar | decisão arquitetural vira ADR (`docs/adr/`); **um ADR por assunto**: revisão decidida pelo usuário é corrigida no próprio ADR, com a revisão registrada nele (data e decisão do plano); ADR novo só para assunto novo |

## Execução

| Regra | Detalhe |
|---|---|
| Versões | sempre a **última versão LTS** (verificada na fonte oficial, nunca de memória) |
| FigCraft antes de desenvolver | desenhar/revisar a interface com os componentes e padrões reais, apresentar ao usuário e **aguardar a validação antes de implementar**. O desenho serve para decidir cedo e evitar desenvolvimento e retrabalho desnecessários |
| Design e tela sincronizados | implementar o desenho aprovado e conferir colunas, filtros, botões, ações, estados e mensagens contra os componentes reais. Atualizar desenho e implementação juntos quando a interface mudar; não declarar sincronização sem conferir as telas afetadas |
| Etapas pequenas | seguir o plano ativo em `docs/plans/`; cada etapa fecha com a skill `validar-etapa` |
| Performance | premissa forte do projeto inteiro, não só logs: analisar consultas, escritas, locks, CPU, memória, tráfego e concorrência antes de entregar; medir conforme o risco e não aceitar gargalos graves conhecidos. Autenticação admite seu custo necessário, sem replicar esse custo na navegação/uso cotidiano |
| Aprovação | não iniciar a próxima etapa sem a confirmação do usuário |
| Commits | skill `git-commit`; push só quando o usuário pedir |
| Limpeza no commit | identificar e apagar arquivos comprovadamente desnecessários, como artefatos gerados acidentalmente (`backend/package-lock.json` vazio), sem pedir nova confirmação; autorização permanente do usuário |
| Ações difíceis de desfazer | confirmar antes (apagar, alterar banco, sobrescrever, publicar) |
| Continuidade | manter o `.ai/handoff.md` atualizado: skill `handoff` |

## Referências

As regras gerais do projeto (stack, arquitetura, leis) estão no `AGENTS.md` e nas
demais skills de `.ai/skills/`.
