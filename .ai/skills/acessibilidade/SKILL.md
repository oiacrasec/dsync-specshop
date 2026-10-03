---
name: acessibilidade
description: Garante conformidade com a Lei Brasileira de Inclusão (Lei 13.146/2015) em interfaces web e mobile. Use SEMPRE ao criar ou alterar telas, componentes de UI, formulários, conteúdo, mídia, e-mails ou documentos gerados pelo sistema.
---

# Acessibilidade: Lei Brasileira de Inclusão (Lei 13.146/2015)

Fonte oficial: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm

> **Regra de ouro:** acessibilidade é **obrigatória**, não opcional. Sites de empresas com sede ou representação no Brasil devem ser acessíveis "conforme as melhores práticas e diretrizes adotadas internacionalmente" (art. 63) → na prática, **WCAG 2.2 nível AA** e o **eMAG** (governo).

## 1. O que a lei exige

| Regra | Artigo |
|---|---|
| Acessibilidade obrigatória em sites de empresas no Brasil e de governo | art. 63 |
| **Símbolo de acessibilidade em destaque** no site | art. 63 §1º |
| **Desenho universal** como regra geral em sistemas e TIC; adaptação razoável só quando o desenho universal for comprovadamente impossível | art. 55 e §§1º-2º |
| Negar adaptação razoável ou tecnologia assistiva = **discriminação** | art. 4º §1º |
| Barreiras tecnológicas e de comunicação devem ser eliminadas | art. 3º IV "d" e "f" |
| Canais de venda e anúncios na internet com legenda, Libras e audiodescrição, conforme o meio | art. 69 §1º |
| Material de divulgação em formato acessível sob solicitação | art. 69 §2º |
| Formato acessível = legível por **leitor de tela**, com ampliação, contraste e voz sintetizada | art. 68 §2º |
| Discriminar pessoa com deficiência é **crime** (1 a 3 anos; 2 a 5 se por meio de comunicação) | art. 88 |

## 2. Implementação (WCAG 2.2 AA na prática)

**Perceptível**
- [ ] Toda imagem informativa com `alt` descritivo; decorativa com `alt=""`.
- [ ] Contraste mínimo **4.5:1** (texto normal) e **3:1** (texto grande e componentes).
- [ ] Informação nunca transmitida **só por cor**.
- [ ] Vídeo com **legenda**; áudio com transcrição; audiodescrição quando relevante.
- [ ] Layout funciona com zoom de **200%** e em telas de 320px sem rolagem horizontal.

**Operável**
- [ ] **Tudo** acessível por teclado, com foco visível e ordem lógica.
- [ ] Sem armadilhas de foco; modais devolvem o foco ao fechar.
- [ ] Link "pular para o conteúdo".
- [ ] Sem limite de tempo rígido (ou com opção de estender).
- [ ] Nada piscando mais de 3 vezes por segundo.
- [ ] Alvos de toque com no mínimo 24×24 px.

**Compreensível**
- [ ] `lang="pt-BR"` no HTML.
- [ ] Todo campo com `<label>` associado; erros descritos em texto e ligados ao campo.
- [ ] Linguagem simples; instruções que não dependem só de forma ou posição.
- [ ] Navegação consistente entre páginas.

**Robusto**
- [ ] HTML semântico (`button`, `nav`, `main`, headings em ordem).
- [ ] ARIA só quando o HTML nativo não resolve; componentes customizados com role, estado e nome.
- [ ] Mensagens dinâmicas anunciadas (`aria-live`).

## 3. No projeto (Angular)

- Usar componentes acessíveis (ex.: Angular CDK `a11y`: `FocusTrap`, `LiveAnnouncer`).
- Rodar **axe** / Lighthouse no CI; testar com leitor de tela (NVDA ou VoiceOver) nas telas críticas.
- E-mails e PDFs gerados pelo sistema também precisam ser acessíveis (PDF com tags e texto real).
- Captcha com alternativa acessível.

## 4. Atendimento e consumo

- Informação ao consumidor acessível (CDC art. 6º, parágrafo único) e cadastros em formato acessível (CDC art. 43 §6º). Ver `cdc`.
- SAC com canais acessíveis (Decreto 11.034, art. 6º).

## Checklist antes de entregar uma tela

- [ ] Navegável 100% por teclado, com foco visível?
- [ ] Leitor de tela lê nomes, estados e erros corretamente?
- [ ] Contraste e zoom de 200% OK?
- [ ] Imagens com `alt`, vídeos com legenda?
- [ ] axe/Lighthouse sem violações críticas?
- [ ] Símbolo de acessibilidade presente no site?
