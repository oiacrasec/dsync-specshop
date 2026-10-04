# 0019 — Registros de acesso concentrados na autenticação

- **Status:** Aceito
- **Data:** 2026-10-04
- **Complementa:** ADR 0006 §6, ADR 0007 §4
- **Substitui parcialmente:** ADR 0018, cobertura dos eventos de acesso

## Contexto

O usuário decidiu seguir a cobertura implementada no datasync-spatial, após
discutir o volume de um INSERT por requisição. Também reforçou a performance como
premissa global: analisar consultas, escritas, locks, CPU, memória, rede e
concorrência de toda mudança, especialmente no uso cotidiano.

O Marco Civil define registros de acesso por data/hora de uso e IP (art. 5º, VIII)
e obriga os provedores enquadrados a guardá-los por seis meses (art. 15). Não
especifica literalmente uma linha por requisição HTTP nem limita a guarda ao login.
A adoção desta cobertura é decisão técnica do projeto, sem afirmar que a lei
exige apenas login ou que essa política, isoladamente, comprova conformidade.
Fonte: [texto oficial](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm).

No REsp 1.738.651/MS, o STJ reconheceu a possibilidade jurídica de exigir dados
de usuários que acessaram determinado perfil em rede social. Esse caso não é
uma regra universal de um evento por chamada HTTP, mas impede tomar a ausência
de literalidade como prova de que só login sempre basta. A adequação da cobertura
ao serviço continua sujeita a validação jurídica.
Fonte: [Informativo 678](https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisar&aplicacao=informativo&livre=%40cnot%3D017783).

## Decisão

- AccessLog recebe LOGIN_SUCCESS, LOGIN_FAILURE e REFRESH_SUCCESS.
- LOGIN_FAILURE cobre credenciais rejeitadas ou contrato indisponível após senha
  válida. Sem username digitado, token, senha ou associação a uma conta presumida.
- Payload inválido, limitação antes da tentativa, refresh recusado, logout e
  navegação/consultas comuns não criam AccessLog. Seus erros seguem o logging técnico
  existente. Logout permanece revogando o refresh; não acrescentar evento que o
  Spatial apenas declara e não implementa.
- Views marcam o evento em memória na requisição. O middleware o persiste
  sincronamente, após a view e fora de sua transação, inclusive quando a tentativa
  de login é rejeitada. Não há fila, worker ou buffer entre requisições.
- Sucessos reutilizam o usuário validado pelo serviço; nenhum lookup adicional.
- Campo action distingue os eventos. Registros antigos ficam com action vazio,
  sem reclassificação inferida, exclusão ou redução da retenção.
- Manter IP/porta, horário UTC, request_id, vínculos conhecidos, acesso restrito,
  inserção imutável e retenção do ADR 0018. Expurgo/LegalHold seguem ADR 0007.
- Preservar AuditEvent de negócio e entrada do superadmin do ADR 0017.

## Alternativas consideradas

- Toda requisição no banco principal: cobertura mais ampla, com escrita incidental
  em todos os fluxos, rejeitada pelo usuário para este projeto.
- Apenas login com sucesso: não corresponde ao Spatial, que também grava falhas
  e renovação de tokens.
- Fila/pipeline externo: não necessários para o escopo de autenticação escolhido.

## Consequências

O uso cotidiano deixa de gravar AccessLog. A autenticação mantém uma inserção
por evento selecionado; não há promessa de capacidade/latência sem ensaio de carga.
Testes verificam ausência de INSERT na leitura comum com 1/30 chamadas e queries
constantes na autenticação com 1/30 usuários adicionais. A contagem de queries não
substitui revisão global de custo, contenção ou medição sob carga.

A cobertura deixa de reconstruir todos os acessos durante uma sessão, inclusive
mudanças de IP sem nova autenticação/renovação. Isso deve ficar explícito nas
políticas e na validação jurídica do serviço. Não alterar os ADRs aceitos em silêncio.
