# Registry de permissões

Etapa 3.1 do [plano de entrega](../../../docs/plans/entrega-1-fundacao-tenancy-rbac.md),
antecipada por decisão do usuário antes do contexto. Implementação em
`apps/core/permission_registry.py`, conforme o
[ADR 0009](../../../docs/adr/0009-rbac-hibrido.md).

O módulo usa somente a biblioteca padrão Python. Não consulta o banco, não
importa Django/DRF e não espelha permissões em `auth_permission`.

## Catálogo inicial

Os códigos abaixo representam a gestão prevista no ADR 0009 §3.1. Todos são
reservados ao perfil essencial Administrador do contrato, com escopo CONTRACT:

| Recurso | Códigos |
|---|---|
| organização | `organization:create`, `organization:update`, `organization:delete` |
| usuário | `user:create`, `user:update`, `user:manage` |
| perfil | `profile:create`, `profile:update`, `profile:delete` |
| atribuição | `assignment:create`, `assignment:delete` |

O catálogo cresce com as operações implementadas. Recursos de exemplo como
estoque/relatórios não foram cadastrados antecipadamente. Não existe permissão
implícita de leitura ou criação fora do registry. As ações padrão são view,
create, update, delete, manage e export; ações adicionais podem ser declaradas
explicitamente pelo domínio. `manage` não expande para nenhuma outra ação.

## Uso pelas próximas camadas

- `PermissionDefinition`: código `recurso:ação`, conjunto explícito de
  `PermissionScope` (CONTRACT/ORGANIZATION) e flag reserved. A definição é
  imutável e copia os escopos recebidos para frozenset.
- `PermissionRegistry`: rejeita entradas inválidas e códigos duplicados;
  protege o mapa de entradas com MappingProxyType. Busca pelo código é direta.
- `get(code)`: exige um código conhecido; desconhecido gera KeyError.
- `require_assignable(code, scope)`: exige código e escopo permitidos e rejeita
  reservadas. Aplica-se a perfis comuns e atribuições avulsas.
- `require_assignable(..., essential_profile=True)`: reservado à camada interna
  que **já verificou** a identidade do perfil essencial. Nunca copiar esse flag
  de payload. Essa opção não autentica nem autoriza o ator.

Para permissões não reservadas, declarar os dois escopos quando aplicável,
conforme ADR 0009 §3. A definição não oferece defaults de escopo nem registra
permissões vindas do banco ou de requisições.

As exceções ValueError/KeyError/TypeError são internas; services de apps/rbac
traduzem violações para erros de validação/RFC 9457. Não enviar
mensagens internas diretamente ao cliente.

## O que ainda falta

Perfis e atribuições estão em apps/rbac (3.2), conforme o
[domínio RBAC](../../../docs/domain/rbac.md). Cálculo da permissão efetiva e integração DRF concluídos (3.3). Faltam fixture do
perfil essencial (3.4), organizações acessíveis (3.5) e auditoria (3.6, `apps/audit`).
Depois disso, retomar o contexto (2.3). O registry permanece Python puro, sem
models ou migrations próprios; não há concessão automática ou mudança nos endpoints JWT.
