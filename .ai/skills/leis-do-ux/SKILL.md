---
name: leis-do-ux
description: Princípios de psicologia aplicados a interfaces (as 30 "leis de UX") traduzidos em regras do datasync. Use SEMPRE ao criar, alterar ou revisar telas, componentes de UI, formulários, menus, mensagens e fluxos, e ao desenhar ou revisar layout (inclusive no FigCraft). Complementa a skill `acessibilidade` (lei e WCAG), sem substituí-la.
---

# Leis de UX

> **Regra de ouro:** a pessoa usa o sistema para cumprir uma tarefa, não para aprender a
> interface. Cada tela deve exigir o mínimo de decisão, memória e esforço, e se comportar
> como ela espera. Bonito ajuda; não salva um fluxo confuso.

Textos desta skill são **nossos**. As leis são conceitos públicos da psicologia; as fontes
abaixo são referência, sem reprodução de trechos (skill `propriedade-intelectual`).

## Como usar

1. Ao **criar** uma tela ou componente: passe pelos grupos abaixo antes de montar o layout.
2. Ao **revisar**: aplique o [checklist](#checklist-de-revisão) e reporte cada achado:

| Severidade | Lei | Onde | Problema | Correção |
|---|---|---|---|---|
| 🔴 bloqueia a tarefa · 🟠 atrapalha · 🟡 melhora · 🔵 detalhe | ex.: Hick | `usuario/formulario` | 14 campos na mesma aba | dividir em abas |

3. Conflito entre uma lei e outra regra do projeto (segurança, lei, performance): **a outra
   regra vence** e a exceção fica registrada (ver [Exceções](#exceções)).

## 1. Percepção: como o olho agrupa (Gestalt)

| Lei | Em uma linha | Como aplicamos no datasync |
|---|---|---|
| Proximidade | o que está perto parece do mesmo grupo | campos relacionados juntos; mais espaço **entre** grupos que **dentro** deles (gaps do Tailwind consistentes: `gap-2` no campo, `gap-6` entre campos) |
| Região comum | o que divide uma área com borda vira um grupo | blocos de conteúdo em card/borda (`rounded-xl border`), como os painéis da grade de permissões |
| Similaridade | elementos parecidos são lidos como da mesma família | mesma ação = mesmo componente e estilo em todas as telas (`ui-button severity`); estilos diferentes só para significados diferentes |
| Conexão uniforme | o que está ligado visualmente parece relacionado | rótulo colado ao campo; ação dentro da linha que ela afeta (menu de ações da `ui-table`) |
| Prägnanz | o olho simplifica o que vê | layout em blocos retangulares simples; evitar enfeites que competem com o conteúdo |

## 2. Decisão e memória: quanto a pessoa precisa pensar

| Lei | Em uma linha | Como aplicamos no datasync |
|---|---|---|
| Hick | mais opções, mais tempo para decidir | **uma** ação primária por tela (Salvar); o resto secundário/texto; fluxos longos em etapas |
| Sobrecarga de escolha | opções demais paralisam | listas longas com busca/filtro (`ui-filter`, `p-select [filter]`) em vez de rolagem |
| Miller e memória de trabalho | pouca coisa cabe na memória ao mesmo tempo | nunca exigir que a pessoa lembre algo de outra tela; mostrar o contexto (organização ativa, nome do registro) onde ela age |
| Chunking | informação em blocos é mais fácil | formulários em abas (padrão **Principal** + abas extras); números longos com máscara de exibição (CPF, CNPJ, telefone, CEP) |
| Carga cognitiva | cada elemento custa atenção | remover o que não ajuda a tarefa; textos de apoio curtos (`helpText`), sem parágrafos |
| Posição serial | lembramos mais do primeiro e do último | o mais usado no início e no fim de menus e listas de ações; ação destrutiva nunca entre as principais |
| Von Restorff | o diferente chama atenção | destaque **só** para o que importa (ação primária, erro, selo "Este navegador"); se tudo destaca, nada destaca |
| Atenção seletiva | a pessoa só vê o que está ligado à meta | avisos importantes perto de onde ela está agindo (no campo, no topo do formulário), não em rodapés |
| Viés cognitivo | o julgamento tem atalhos previsíveis | opções padrão seguras e corretas (o padrão será escolhido); não usar padrões que empurrem decisões ruins |

## 3. Interação: tempo e esforço físico

| Lei | Em uma linha | Como aplicamos no datasync |
|---|---|---|
| Fitts | alvo pequeno e longe custa mais | áreas clicáveis de pelo menos **40 × 40 px** (WCAG pede no mínimo 24 × 24); ação perto do que ela afeta; Salvar sempre no mesmo lugar (rodapé à direita) |
| Limiar de Doherty | resposta abaixo de ~400 ms mantém o ritmo | é premissa do projeto (skill `revisao-performance`); acima disso, retorno imediato (`loading` no botão, esqueleto/“Carregando…”); nunca tela parada sem sinal |
| Postel | aceitar entrada flexível, devolver saída precisa | aceitar CPF, CNPJ e telefone com ou sem pontuação e espaços nas pontas; erro **no campo exato** (RFC 9457 `errors` por campo → `errorMessage` do componente), dizendo como corrigir |

## 4. Expectativas: o que a pessoa já sabe

| Lei | Em uma linha | Como aplicamos no datasync |
|---|---|---|
| Jakob | a pessoa espera que funcione como os sites que já usa | convenções comuns: logo no topo à esquerda, conta no avatar à direita, vermelho = erro, verde = sucesso (`severity` do PrimeNG sempre com o mesmo significado) |
| Modelo mental | cada um imagina como o sistema funciona | nomes do domínio do cliente, não técnicos (“Organização”, não “tenant”); mesma palavra para a mesma coisa em todas as telas |
| Paradoxo do usuário ativo | ninguém lê manual antes de usar | a tela se explica sozinha: rótulos claros, estado vazio dizendo o que fazer, `helpText` no lugar certo |
| Tesler (complexidade conservada) | a complexidade só muda de lugar | preferir que o **sistema** absorva o trabalho (formatar, completar, validar); quando tirar controle de quem precisa dele, decidir pela persona e registrar |
| Navalha de Occam | entre soluções equivalentes, a mais simples | menos telas, campos e passos para o mesmo resultado; não criar componente novo se um de `shared/ui` resolve |
| Pareto | poucas causas geram a maioria dos efeitos | priorizar os fluxos mais usados (login, listas, cadastro) e os problemas que atingem mais gente |

## 5. Experiência: como a pessoa se sente e lembra

| Lei | Em uma linha | Como aplicamos no datasync |
|---|---|---|
| Estética-usabilidade | o que é bonito parece mais fácil | acabamento consistente (tema, espaçamentos, ícones Font Awesome); **não** usar estética para esconder fluxo ruim |
| Pico-fim | lembramos do pico e do final | concluir tarefas com confirmação clara (toast de sucesso, senha temporária destacada); erros recuperáveis e gentis; nada de pop-up “não saia” |
| Zeigarnik | tarefa incompleta fica na memória | indicar o que falta (campos obrigatórios, etapas pendentes, progresso em fluxos de várias etapas) |
| Gradiente de meta | a motivação cresce perto do fim | mostrar o avanço em fluxos longos (etapa atual / total) |
| Fluxo | concentração plena na atividade | não interromper com modais desnecessários; manter a pessoa na tela ao salvar quando ela ainda vai editar |
| Parkinson | a tarefa ocupa o tempo disponível | fluxos curtos e diretos; preencher automaticamente o que o sistema já sabe |

## Exceções

| Lei | Exceção | Motivo |
|---|---|---|
| Postel (“dizer o campo exato”) | **login** e recuperação de conta respondem de forma **genérica** (“usuário ou senha inválidos”) | dizer qual dos dois errou permite descobrir contas válidas (enumeração; skill `owasp-top-10`, A07) |
| Estética / Von Restorff | contraste e foco visível nunca saem por estética | obrigação legal (skill `acessibilidade`, WCAG 2.2 AA) |
| Doherty | segurança pode custar tempo (hash de senha, 2FA) | só na autenticação, nunca na navegação cotidiana (skill `revisao-performance`) |

## Checklist de revisão

- [ ] Uma ação primária clara; destrutivas separadas e com confirmação.
- [ ] Grupos visuais coerentes (proximidade, região comum, mesmo estilo para mesma função).
- [ ] Formulário longo dividido em abas/etapas; aba **Principal** primeiro.
- [ ] Nada a lembrar de outra tela; contexto visível onde se age.
- [ ] Listas longas com busca/filtro; opções padrão seguras.
- [ ] Alvos clicáveis ≥ 40 px e perto do que afetam.
- [ ] Retorno imediato a toda ação (> 400 ms → carregando).
- [ ] Entrada tolerante (pontuação, espaços); erro no campo dizendo como corrigir (exceto login).
- [ ] Convenções respeitadas (cores de severidade, posição do Salvar, avatar à direita).
- [ ] Palavras do domínio do cliente, iguais em todas as telas.
- [ ] Final de tarefa com confirmação clara; nada de pop-up de retenção.
- [ ] Acessibilidade conferida (skill `acessibilidade`).

## Fontes (referência, sem reprodução)

| Fonte | Uso | Licença |
|---|---|---|
| [Laws of UX](https://lawsofux.com/), de Jon Yablonski | lista das 30 leis | CC BY-NC-ND 4.0: só referência; textos acima são nossos |
| [Leis de UX: os princípios básicos de UX Design](https://medium.com/aela/leis-de-ux-os-princ%C3%ADpios-b%C3%A1sicos-de-ux-design-9b9bf3fdb43c), Aela Contents (Medium, 2020) | exemplos práticos de 15 leis | sem licença aberta: só referência |
