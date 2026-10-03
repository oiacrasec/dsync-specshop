# 0014 — Modalidade definida pela implantação

- **Status:** Aceito
- **Data:** 2026-10-03
- **Complementa:** ADR 0006
- **Substitui:** previsão do campo de modalidade no `Plan` (ADR 0006 §2.1)

## Contexto

O ADR 0006 previa nome, modalidade e limites no plano. Durante a etapa 2.1,
o usuário esclareceu que a modalidade é uma escolha de implantação:

- Compartilhado: um servidor atende vários clientes.
- Dedicado: a implantação atende um único cliente.
- Servidor próprio: a implantação no servidor do cliente atende um único cliente.

## Decisão

Não armazenar modalidade no `Plan` nem no `Contract`. A infraestrutura determina
como a implantação é operada; esses models não selecionam o servidor de execução.

O usuário também aprovou preparar somente a tabela para quatro quotas comerciais:
organizações, armazenamento, integrações e operações por mês. Os campos são
opcionais; nulo significa limite não definido, zero significa limite configurado
em zero. Armazenamento é gravado em bytes; operações representam o limite mensal.
Não há valores de quota padrão, contadores de uso ou bloqueios nesta etapa.
A aplicação de cada limite depende da implementação da funcionalidade correspondente.

## Alternativas consideradas

Guardar a modalidade no plano: duplicaria uma característica da implantação
e permitiria um valor cadastrado que não corresponde à infraestrutura real.

## Consequências

- `Plan` não terá campo de modalidade.
- Licenças de usuários continuam no `Contract`; as quatro quotas ficam no `Plan`.
- Permanece a arquitetura de banco único por implantação do ADR 0006.
- Isolamento lógico por contrato e organização continua obrigatório em todas
  as implantações; a modalidade não concede permissões adicionais.
