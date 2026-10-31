# design — Design system do datasync

Fonte visual da interface: tokens, componentes, padrões e telas de referência, feitos no
FigCraft. Espelha o tema Aura do PrimeNG usado no `frontend/`; não é
código e nenhum projeto depende destes arquivos para rodar (ADR 0040).

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `datasync-ds.figcraft` | **biblioteca** publicada: tokens, estilos de texto, componentes e padrões |
| `datasync-core-telas.figcraft` | telas do core montadas só com a biblioteca (Usuários, Organizações antes × depois) |
| `tokens.json` | exportação das variáveis (`variable.export`), para ver as mudanças de tokens no diff |

O `.figcraft` é um zip: o git guarda como binário. Toda mudança de token exige reexportar o
`tokens.json` no mesmo commit.

## Biblioteca

| Página | Conteúdo |
|---|---|
| Capa | versão e regras de uso |
| Cores | coleção **Tema** (Claro/Escuro), cada token com o nome CSS do PrimeNG (`var(--p-…)`) |
| Tipografia | 8 estilos de texto (`Texto/…`) |
| Espaço e raios | `espaco/1–8` e `raio/sm–xl` |
| Componentes | Botão (primary/secondary, filled/text, danger outlined), Campo de texto, Checkbox, Tag, Aba, Tabela, Toast, Select, MultiSelect, Data (+ calendário), Menu de ações e Diálogo de confirmação, com propriedades do PrimeNG (`severity`, `variant`, `label`…) |
| Ícones | 35 ícones PrimeIcons (`Ícone/<nome>`, mesmo nome da classe `pi-<nome>`) e `Marca/Logo` |
| Layout | estrutura do Poseidon com as medidas do código: topo, menu lateral, item de menu, título de seção, trilha, menu do avatar, rodapé, avatar e botão de ícone |
| Padrões | **Página · estrutura** (claro e escuro), base de toda tela nova; telas completas: Lista · com ações, Lista · vazia, Formulário · cadastro, Lista · confirmação de exclusão; e os exemplos iniciais (formulário em card, lista com tabela) |
| _Rascunhos | fora da publicação |

- A coleção **Primitivos** (paleta bruta) não é publicada: telas usam só a coleção **Tema**.
- Tokens sem equivalente no Aura (`texto-forte`, `rotulo`, `fundo-pagina`, `perigo`, `sucesso`,
  `aviso`) aparecem como "sem equivalente" na página Cores.
- Telas e componentes seguem a skill `leis-do-ux`.

## Como abrir e editar

```bash
figcraft --control 7710 \
  --automation-read-root "$PWD/design" --automation-write-root "$PWD/design"
```

Na raiz do repositório. `--control` liga o canal usado pelo MCP `figcraft`
(`figcraft-cli mcp --attach 7710`); para só olhar, basta abrir os arquivos no FigCraft.

Ao mudar a biblioteca:

1. Editar `datasync-ds.figcraft` e **publicar** (comando `library.publish`, menu Libraries), com descrição.
2. No arquivo de telas, aceitar as atualizações da biblioteca.
3. Reexportar os tokens: `variable.export` com `format: json` para `design/tokens.json`.
4. Commitar os três arquivos juntos.

## Vínculo com a biblioteca (caminho absoluto)

O FigCraft grava o caminho **absoluto** da biblioteca no arquivo de telas. Num clone em outra
pasta, as telas abrem normalmente (guardam cópia dos componentes), mas a biblioteca aparece com
erro e não recebe atualizações. Para refazer o vínculo, no arquivo de telas: remover a biblioteca
`datasync-ds` e adicioná-la de novo apontando para `design/datasync-ds.figcraft` do seu clone.

## Projetos derivados

Não editar estes arquivos no projeto derivado (ADR 0036). O projeto cria o próprio arquivo de
telas (`design/<projeto>-telas.figcraft`), ativa a biblioteca do core e, para mudar a marca,
**estende** a coleção Tema (`library.extendCollection`) sobrescrevendo só os valores necessários.

## Origem e licenças

| Recurso | Origem | Licença |
|---|---|---|
| Layout e medidas | template Poseidon da PrimeTek, lido do código em `frontend/` (desenho recriado, sem cópia do site) | `frontend/LICENSE.md` |
| Ícones | PrimeIcons (`frontend/node_modules/primeicons/raw-svg`) | MIT |
| Fonte | Figtree, a mesma do app; precisa estar instalada para os textos saírem iguais | SIL OFL 1.1 |
| Logo | `frontend/public/layout/images/logo-dark.svg` | marca própria |
