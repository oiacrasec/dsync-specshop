# 0037 — Organizações na área do cliente, com gestão delegável

- **Status:** Aceito
- **Data:** 2026-10-18
- **Revisões:** 2026-10-19 — `organization:create` em qualquer escopo (decisão 62, §2)
- **Substitui:** ADR 0032; ADR 0009 §3.1 no trecho que reservava a gestão de organizações
- **Complementa:** ADRs 0006, 0008 e 0009

## Contexto

O ADR 0032 (Proposto) publicou `GET /api/v1/admin/organizations/` para o superadmin e também
para o usuário comum, filtrado pelo RBAC. Isso conflita com o ADR 0008: o prefixo `/admin/` é
exclusivo do superadmin. Nenhuma tela usava a rota; o usuário comum troca de organização por
`GET /api/v1/me/organizations/`. Depois do Bloco 6, o usuário decidiu o lugar das organizações.

## Decisão

1. **Organizações só na área do cliente.** A gestão vira um menu da área comum, para o admin do
   contrato e para usuários comuns com permissão. `/api/v1/admin/organizations/` é removida.
2. **O cliente decide quem gerencia.** `organization:view` (nova), `organization:create`,
   `organization:update` e `organization:delete` deixam de ser reservadas: podem entrar em perfis
   do cliente e em permissões avulsas, em CONTRACT ou ORGANIZATION. Revisão (decisão 62):
   `organization:create` também vale em ORGANIZATION; o escopo só diz por qual atribuição a pessoa
   recebeu o código, e a organização nova é sempre do contrato (visão por contrato, item 3). O perfil
   essencial continua com tudo. Usuários, perfis e atribuições continuam reservados (ADR 0009 §3.1).
3. **Visão do contrato inteiro.** Quem tem `organization:view`, em qualquer escopo, lista todas as
   organizações do contrato: a permissão foi concedida pelo cliente.
4. **Resumo de permissões para a interface.** `GET /api/v1/me/permissions/` (com
   `X-Organization-Id`) devolve os códigos efetivos na organização ativa, para o frontend mostrar
   menus e botões. Só reflete: quem autoriza é o backend (ADR 0009 §4). Substitui, no Core, o
   resumo do Spatial desabilitado no ADR 0035.
5. **Suporte do superadmin fica para depois.** A escolha contrato → organização para entrar como
   suporte (ADR 0006 §3.1, ADR 0009 §6) não tem rota nem tela nesta fase. O header
   `X-Organization-Id` do superadmin, a auditoria de entrada e os selectors continuam no backend.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Manter o endpoint único do ADR 0032 | rota administrativa aberta a usuários comuns, contrariando o ADR 0008 |
| Rota de leitura do superadmin por contrato | sem tela que a use agora; o suporte foi adiado |
| Gestão de organizações reservada (ADR 0009 §3.1) | o usuário preferiu deixar a decisão ao cliente |
| Lista só das organizações alcançadas pela permissão | o usuário considerou que quem recebeu a permissão pode ver o contrato todo |
| Menu visível a todos e 403 no backend | o usuário veria opções que não pode usar; não escala para as próximas telas |

## Consequências

- Quem gerencia organizações altera a estrutura sobre a qual atribuições e exceções se apoiam; o
  cliente assume essa delegação. Mudanças continuam auditadas.
- Os endpoints da área comum (Bloco 7 do plano) seguem a negação por padrão, o escopo de tenant
  e o isolamento entre contratos (ADRs 0006 e 0009).
- O superadmin não lista organizações pela API até o suporte ser implementado.
