# 0033 — API administrativa separada do domínio de contratos

- **Status:** Aceito
- **Data:** 2026-10-04
- **Complementa:** ADRs 0008, 0013, 0020 e 0030; decisões 37 e 40 do plano.

## Contexto

O usuário priorizou a área do superadmin e aprovou separar suas regras da área do
cliente. Plan, Contract e Organization continuam entidades usadas pelo sistema
inteiro. O plano comercial é opcional na criação do contrato.

## Decisão

- apps/contracts mantém models, labels, tabelas e migrations de domínio.
  Não renomear contracts.Contract/Plan/Organization nem suas relações de contexto.
- apps/administration é um app Django sem models próprios, dedicado à API do
  superadmin. Recebe views, serializers, FilterSets, constantes de auditoria, URLs
  e testes de planos/contratos. Usa as bases existentes do core.
- URLs /api/v1/admin/plans e contracts, basenames, campos, paginação, options/schema,
  erros RFC 9457, autoria/auditoria e permissões continuam os mesmos.
- Contract.plan aceita omissão na criação e null explícito; vínculo existente pode
  ser removido. null representa ausência de plano/quotas de plano. Licenças continuam
  no contrato, positivas, contando usuários inativos e impedindo redução indevida.
- PROTECT e integridade da FK permanecem quando há plano. Seleção de plano excluído
  continua negada; vínculo histórico continua editável. Plano recebido e não nulo
  mantém sua verificação/lock. Sem plano não exige consulta nem lock dessa relação.
- Migration contracts.0003_contract_plan_optional altera somente a nulabilidade;
  contratos existentes mantêm o vínculo. Sem preenchimento ou eliminação de dados.
- OrganizationViewSet permanece no rascunho de contracts/ADR 0032, com a rota e
  comportamento anteriores. Sua revisão não pertence à 6.3. Não antecipar fluxos de
  primeiro acesso/provisionamento nem mudanças no frontend nesta etapa.

## Alternativas consideradas

Renomear todo o app de domínio mudaria labels/referências e misturaria entidades
compartilhadas com regras da área administrativa. Duplicar models por área criaria
fontes de verdade concorrentes. A separação da API preserva o domínio e seu histórico.

## Consequências

Novas operações do superadmin entram em administration; regras próprias do domínio
continuam no app correspondente. O frontend pode omitir plan ou enviar null sem
mudar rotas. Listagem usa JOIN explícito do plano (agora nullable), sem N+1; lock
de atualização continua somente no contrato, evitando bloquear o lado nullable.

A migration padrão do Django retira/recria a FK e remove NOT NULL: precisa de lock
de schema e validação da FK. Planejar a aplicação em produção conforme o volume.
Para reverter após criar contratos sem plano, é necessário resolver esses vínculos
antes de exigir NOT NULL novamente; esta etapa não inventa um plano padrão.
