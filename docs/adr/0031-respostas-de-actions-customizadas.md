# 0031 — Respostas de actions customizadas

- **Status:** Aceito
- **Data:** 2026-10-04
- **Complementa:** ADRs 0004 e 0021.

## Contexto

O usuário determinou seguir o padrão do Spatial nas actions customizadas:
try/except com build_result_response e build_exception_response compartilhados.
O Core já tem contrato RFC 9457, handler global, rollback e logging sanitizado.

## Decisão

- Helpers ficam em apps/core/responses.py. build_result_response retorna Response
  com o resultado e status_code explícito (200 por padrão), sem envelope adicional.
- build_exception_response recebe exception e request explicitamente e delega ao
  handler existente de core/problems.py, marcando response.exception como no DRF.
- Erros continuam application/problem+json, com request_id, instance, errors em
  validações 422, headers de autenticação/throttle e mensagens internas genéricas.
  O helper preserva set_rollback; capturar a exceção não pode confirmar escrita parcial.
- Não copiar a mensagem da exceção, dados pessoais ou credenciais para logs/respostas.
  O handler continua responsável pelo logging seguro dos erros internos.
- Actions options/schema passam a usar esse padrão. CRUD padrão mantém o fluxo do DRF.

## Alternativas consideradas

Copiar o helper do Spatial literalmente mudaria o contrato de erros e logaria o
texto da exceção. Reimplementar mapeamento de erros criaria duas fontes de verdade.

## Consequências

Actions customizadas usam os mesmos helpers sem duplicar tratamento de exceções.
É obrigatório fornecer request para correlação e caminho. Helpers não substituem
permissões, validação ou limites transacionais; o handler global continua ativo.
