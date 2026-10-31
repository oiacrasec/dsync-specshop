# 0040 — Design system no FigCraft, versionado em `design/`

- **Status:** Aceito
- **Data:** 2026-10-31
- **Revisões:** 2026-10-31 — primária azul 600 e texto suave em surface-700 aplicados no frontend
  (`theme.service.ts`, classes `text-surface-500` → `text-surface-700`); proposta de Organizações aplicada às
  listas e à estrutura; placeholder em surface-600 (3,5:1, aprovado para manter a distinção do valor);
  biblioteca v0.8 sincronizada

## Contexto

As telas do frontend usam PrimeNG com o tema Aura, ajustado no `LayoutService`, sem uma referência
visual única. Revisões de UX (skill `leis-do-ux`) e propostas de layout eram feitas sobre prints,
e o core é base de projetos derivados (ADR 0036), que precisam reaproveitar o mesmo visual e
trocar só a marca. O FigCraft (editor de interface com biblioteca, variáveis e acesso por MCP)
permite desenhar com tokens e componentes que espelham o PrimeNG e publicá-los como biblioteca.

## Decisão

1. **Pasta `design/` na raiz**, ao lado de `backend/` e `frontend/`: conhecimento compartilhado,
   sem runtime. Nenhum projeto lê esses arquivos para compilar ou rodar.
2. **Dois arquivos:** `datasync-ds.figcraft` é a biblioteca (tokens, estilos, componentes,
   padrões) e `datasync-core-telas.figcraft` tem as telas, usando só peças da biblioteca.
3. **Tokens em duas coleções:** Primitivos (paleta, fora da publicação) e Tema (papéis com modos
   Claro/Escuro). Cada token do Tema traz no `codeSyntax` a variável CSS do PrimeNG equivalente,
   quando existe.
4. **Componentes com a API do PrimeNG:** conjuntos de variantes cujas propriedades usam os nomes
   do PrimeNG (`severity`, `variant`, `label`…), para o desenho falar a língua do código.
5. **`tokens.json` versionado** (exportação das variáveis), porque o `.figcraft` é zip e não gera
   diff legível; mudança de token reexporta o arquivo no mesmo commit.
6. **Projetos derivados não editam `design/` do core:** criam o próprio arquivo de telas, ativam
   a biblioteca e estendem a coleção Tema para a marca.
7. **Primária no azul 600** no modo claro (hover 700, ativo 800), no lugar do azul 500 padrão do
   template Poseidon/Aura: texto branco sobre o 500 dá 3,7:1 e sobre o 600 dá 5,2:1 (WCAG AA pede
   4,5:1 para texto de 14 px). Desvio consciente do template; o modo escuro segue o padrão (6,1:1).
   Pelo mesmo motivo, perigo em texto/contorno usa o vermelho 700 e ícones de campo usam o token
   `texto` (o surface-400 do Aura não chega a 3:1).
8. **Base visual do Poseidon recriada a partir do código licenciado** em `frontend/` (medidas em
   rem × 14 px), nunca copiada do site de demonstração; ícones do PrimeIcons (MIT).
9. **O código continua sendo a fonte de verdade** do comportamento: divergência entre o desenho e
   o frontend se resolve pela skill `questionador`, não em silêncio.

## Alternativas consideradas

- **Arquivos fora do repositório (`~/FigmaProjects`):** não versiona nem chega aos derivados.
- **Figma:** serviço externo e pago; o FigCraft roda local, salva arquivo e tem MCP.
- **Um arquivo só (biblioteca + telas):** derivados teriam de copiar ou editar o arquivo do core.

## Consequências

- Revisões de UX passam a ter antes × depois desenhado com os mesmos componentes do app.
- O vínculo do arquivo de telas com a biblioteca guarda caminho **absoluto**; em outro clone é
  preciso refazê-lo (procedimento no `design/README.md`). As telas abrem mesmo sem o vínculo.
- Mudanças no tema do frontend devem ser refletidas na biblioteca (e vice-versa) até existir
  geração automática de tokens.

## Pendências

- Ligação componente → código (`codeConnect`) e `figcraft.connect.json`.
- Telas Login e Perfil; slot na célula da Tabela.
- Logo para o modo escuro (o app referencia `logo-white.svg`, ausente em `public/`); ponto vermelho do sino.
