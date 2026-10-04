# 0034 — Primeiro acesso e troca de senha com bloqueio global por JWT

- **Status:** Aceito
- **Data:** 2026-10-04
- **Origem:** decisão 38 e etapa 6.4 autorizadas pelo usuário; referência Spatial/GIS.
- **Complementa:** ADRs 0004, 0010, 0017 e 0019.

## Contexto

O administrador do contrato receberá uma senha temporária no provisionamento/reset.
A tela de primeiro acesso sozinha não impede chamadas diretas à API. A regra precisa
valer antes das permissões específicas, sem custo extra nas leituras comuns.
Superadmin não participa do fluxo obrigatório.

## Decisão

- User.must_change_password, BooleanField default false, sem índice adicional.
  Contas existentes não são bloqueadas pela migration. Provisionamento/reset nas 6.6/6.7.
- Login retorna access, refresh e user, com public_id, username, name (first_name),
  is_superuser e must_change_password. Whitelist sem IDs internos/credenciais/contato.
  O resumo retorna flag false para superadmin, mesmo com true persistido.
- JWTAuthentication.authenticate verifica o estado carregado por get_user antes de
  executar permissões/contexto. Usuário comum marcado recebe 403 password-change-required.
  Sem query, escrita, hash ou lock adicional; estado não é copiado para o token.
- Somente PasswordChangeView possui allow_password_change_required=True.
  Refresh/logout continuam públicos, validados por seus serviços, e login permite
  começar a sessão restrita. Cliente não controla a exceção por payload/headers/URL.
- POST /api/v1/auth/change-password/ requer access e atua exclusivamente na própria
  conta, sem organização. Como no Spatial, permite também troca voluntária.
  Entrada: current_password, new_password, new_password_confirm, sem trim/style HTML.
- Serializer valida confirmação/diferença; serviço de autenticação recarrega a conta,
  revalida disponibilidade e senha atual sob select_for_update(of=('self',)), aplica
  validadores do Django e set_password (Argon2). Só a linha do usuário é bloqueada.
- Senha, flag=false, autoria e AuditEvent user.password_changed são atômicos.
  Auditoria guarda somente before/after da flag e identificadores, nunca senhas/hashes.
  Erros seguem RFC 9457; respostas da operação são no-store.
- UserRateThrottle do DRF limita a troca a 5 pedidos/min por usuário, antes do hash/lock.
  Não altera o contador de falhas do login. Cache/borda de produção continuam pendentes;
  throttle de aplicação não garante limite estrito sob concorrência.
- Resposta da troca: user atualizado. Preserva a sessão/token atuais e a política
  de rotação/logout, sem revogação adicional na troca. Reset revogará refresh na 6.7.

## Alternativas consideradas

- Bloquear só seleção de contexto/front: outros endpoints poderiam ser chamados.
- Permission padrão global: views com permission_classes próprias escapariam.
- Middleware ou consulta extra por requisição: duplicaria autenticação/custo.
- Flag apenas no JWT: alterações posteriores não seriam vistas até expirar o token.
- Validar senha apenas na instância antiga: duas trocas simultâneas poderiam aceitar
  a mesma senha. A conta precisa ser recarregada sob lock antes da verificação.

## Consequências

Todos os endpoints autenticados devem usar a autenticação JWT central. As flags são
revalidadas a cada pedido. O frontend precisa tratar o novo resumo/403 na etapa 6.5.
O custo de hash e lock fica na troca, operação infrequente; nenhuma nova escrita na
navegação. Tokens previamente emitidos continuam sob a política de expiração vigente.
Migrations users.0004 (coluna/default false) e audit.0006 (choices) são incrementais;
a coluna exige lock de schema durante a aplicação, planejado antes de produção.
Reverter perde a flag; coordenar rollback de código/banco, sem voltar a usar credenciais
temporárias para navegação. Fontes e mapeamento de dados em docs/api/authentication.md.
