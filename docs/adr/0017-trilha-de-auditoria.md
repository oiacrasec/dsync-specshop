# 0017 — Trilha de auditoria append-only

- **Status:** Aceito
- **Data:** 2026-10-04
- **Complementa:** ADR 0009 §6 e §7, ADR 0006 §6

## Contexto

O ADR 0009 exige, já na 1ª entrega, registrar quem concedeu ou removeu acesso, quando
e o quê, as alterações de superadmin e toda entrada do superadmin numa organização de
cliente (skill `lgpd` art. 37; skill `owasp-top-10` A09). A auditoria completa dos
demais registros (antes, depois e diff) fica para a 2ª entrega (ADR 0006 §6).

## Decisão

Criar `apps/audit` com o model `AuditEvent` (aprovado pelo usuário na etapa 3.6).

| Regra | Decisão |
|---|---|
| Escopo | `HybridScopedModel`: `contract` nulo para eventos do sistema (perfil do sistema, contas de superadmin) |
| Conteúdo | evento, autor (`created_by`), data (`created_at`), contrato, organização do contexto, alvo (`target_type` + `target_public_id`) e `changes` (JSON com `before`/`after` só dos campos de permissão, FKs pelo `public_id`) |
| Imutável | só inserção: `save()` de registro existente, `delete()` e `update()`/`delete()` em lote levantam erro. Sem expurgo nesta entrega (ADR 0007) |
| Mudanças de permissão | perfil, permissão do perfil, atribuição e exceção (criar, alterar, excluir), gravadas **na mesma transação** da mudança: mudança desfeita não deixa evento |
| Alterações de superadmin | contas de superadmin: criar, promover, rebaixar, desativar, reativar, excluir e restaurar |
| Entrada do superadmin | 1 registro por superadmin + organização + access token (`jti`), com constraint única e `ON CONFLICT DO NOTHING`. Gravada por middleware **fora** da transação da view, para sobreviver a erros da requisição |

A trilha é genérica para servir de base à auditoria completa da 2ª entrega.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Tabela dentro de `apps/rbac` | só serviria a permissões; superadmin e 2ª entrega precisariam de outra |
| Registrar toda requisição do superadmin | duplica o registro de acesso da etapa 4.1 e infla a tabela |
| Soft delete como os outros models | permitiria apagar a própria trilha |
| Gravar a entrada dentro da transação da view | erro ou 4xx desfaria o registro do acesso aos dados do cliente |

## Consequências

- Escritas de RBAC e de usuário continuam pelos services, que agora também auditam.
- `update()`/`bulk_*` fora dos services não geram evento (mesma regra das demais regras de domínio).
- Os ids públicos no JSON identificam pessoas: a trilha é dado pessoal com finalidade de
  segurança e prestação de contas (LGPD arts. 6º X, 7º II/IX e 37); retenção e eliminação
  serão definidas na entrega de expurgo (ADR 0007).
- Leitura da trilha pela API fica para os endpoints da administração (bloco 5).
