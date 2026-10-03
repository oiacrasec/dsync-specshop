---
name: propriedade-intelectual
description: Garante conformidade com a Lei de Software (9.609/1998) e a Lei de Direitos Autorais (9.610/1998). Use SEMPRE ao adicionar dependências ou bibliotecas, copiar código de terceiros, usar imagens, fontes, ícones, textos ou dados de terceiros, definir licença do projeto, aceitar contribuições ou tratar conteúdo enviado por usuários.
---

# Propriedade intelectual: software e direitos autorais

Fontes oficiais:
- Lei 9.609/1998 (software): https://www.planalto.gov.br/ccivil_03/leis/l9609.htm
- Lei 9.610/1998 (direitos autorais): https://www.planalto.gov.br/ccivil_03/leis/l9610.htm
- Lei 14.063/2020, art. 16 (software público): https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm

> **Regra de ouro:** tudo que não foi criado por nós tem dono. **Só usar com licença compatível**, e respeitar as condições da licença (atribuição, copyleft, etc.).

## 1. Conceitos

| Regra | Artigo |
|---|---|
| Software é protegido como **obra literária** (direito autoral) | Lei 9.609, art. 2º; Lei 9.610, art. 7º XII |
| Proteção por **50 anos**, **independe de registro** (registro no INPI é opcional) | Lei 9.609, art. 2º §§2º-3º e art. 3º |
| Uso de software no país exige **licença** (ou nota fiscal como prova) | Lei 9.609, art. 9º |
| Ideias, métodos, algoritmos como tais, formulários em branco **não** são protegidos | Lei 9.610, art. 8º |
| **Bases de dados** com seleção/organização criativa são protegidas (os dados em si, não) | Lei 9.610, art. 7º XIII e §2º |
| Reproduzir, adaptar, traduzir, distribuir ou **incluir em base de dados** exige autorização prévia e expressa | Lei 9.610, art. 29 |

## 2. Quem é dono do código (Lei 9.609, art. 4º)

- Feito no emprego/contrato com essa finalidade → pertence ao **empregador/contratante**, salvo contrato em contrário.
- Vale também para **estagiários e bolsistas** (§3º).
- Feito sem relação com o contrato e **sem recursos** da empresa → pertence ao desenvolvedor (§2º).
- 👉 Contribuições externas: exigir aceite de licença do projeto (CLA/DCO) antes do merge.

## 3. Dependências e licenças open source

Antes de adicionar uma dependência:
- [ ] Verificar a **licença** (no `package.json`, `pyproject`, repositório).
- [ ] Compatível com a licença e o modelo de distribuição do projeto?

| Tipo | Exemplos | Atenção |
|---|---|---|
| Permissivas | MIT, BSD, Apache-2.0, ISC | manter aviso de copyright e licença; Apache exige NOTICE |
| Copyleft fraco | LGPL, MPL-2.0 | modificações na própria lib devem ser abertas |
| Copyleft forte | GPL-2.0/3.0 | obra derivada **distribuída** deve ser GPL |
| Copyleft de rede | **AGPL-3.0** | uso via rede (SaaS) já obriga abrir o código → **evitar sem aprovação** |
| Sem licença | — | **não pode usar** (todos os direitos reservados) |

- [ ] Manter inventário de licenças (ex.: `pip-licenses`, `license-checker`) e arquivo de atribuições quando exigido.
- [ ] ❌ Copiar trechos do Stack Overflow, GitHub ou blogs sem checar a licença (Stack Overflow = CC BY-SA, exige atribuição).

## 4. Conteúdo de terceiros

- [ ] Imagens, ícones, fontes, vídeos, músicas e textos só com licença (banco de imagens, CC compatível, fontes com licença web).
- [ ] Citação curta para crítica/estudo, com autor e origem, é permitida (Lei 9.610, art. 46 III).
- [ ] ❌ Remover ou burlar DRM ou informação de gestão de direitos (Lei 9.610, art. 107).
- [ ] Conteúdo enviado por usuários: termos devem garantir licença de uso à plataforma; fluxo de remoção por violação (ver `marco-civil`, art. 19 §2º e art. 31).

## 5. Software público (Lei 14.063/2020, art. 16)

Sistemas desenvolvidos **exclusivamente** por órgãos públicos da administração direta, autárquica e fundacional são regidos por **licença de código aberto**, salvo código com sigilo legal, dados e componentes de terceiros.

## 6. Garantias ao usuário (quando comercializamos software)

- Informar o **prazo de validade técnica** da versão (Lei 9.609, art. 7º).
- Prestar suporte técnico durante esse prazo, mesmo se o produto sair de linha (art. 8º).
- Nulas as cláusulas que isentem responsabilidade por vícios, defeitos ou violação de direitos autorais (art. 10 §1º II).

## 7. Sanções

- Violar direito de autor de software: detenção de 6 meses a 2 anos ou multa; **reprodução para comércio: reclusão de 1 a 4 anos** (Lei 9.609, art. 12).
- Civil: apreensão, suspensão da divulgação e indenização (Lei 9.610, arts. 102 a 107).

## Checklist antes de entregar

- [ ] Toda nova dependência tem licença compatível (nada de AGPL ou sem licença sem aprovação)?
- [ ] Avisos de licença e atribuições preservados?
- [ ] Nenhum código, imagem, fonte ou texto copiado sem licença?
- [ ] Projeto tem `LICENSE` definido?
