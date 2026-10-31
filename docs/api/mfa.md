# Verificação em duas etapas

Fonte: decisões 73–75/86–88 do plano e ADR 0041. MFA é opcional para todos,
inclusive superadmin. Só é solicitado no login após a confirmação pelo usuário.
Sem configuração, ou com configuração ainda pendente, o login segue sem segundo passo.

## Contratos

| Rota | Entrada | Resposta |
|---|---|---|
| `POST /api/v1/auth/login/` | username/password | Sem MFA ativo: access/refresh/user; com MFA ativo: mfa_required, mfa_token, expires_in (300 s), sem tokens/user |
| `POST /api/v1/auth/login/mfa/` | mfa_token/code | 200 access/refresh/user, após TOTP ou reserva |
| `GET /api/v1/me/mfa/` | JWT, sem organização | 200 enabled, setup_pending, recovery_codes_remaining |
| `POST /api/v1/me/mfa/setup/` | JWT, sem organização | 200 secret e otpauth_url para QR local; não ativa o fator; configuração válida por 5 min |
| `POST /api/v1/me/mfa/enable/` | JWT + code TOTP | 200 recovery_codes (10, exibidos uma vez) |
| `POST /api/v1/me/mfa/disable/` | JWT + password/code | 204; exige senha atual e TOTP ou reserva |
| `POST /api/v1/me/mfa/recovery-codes/` | JWT + code TOTP/reserva | 200 recovery_codes (10 novos); invalida anteriores |
| `POST /api/v1/users/{public_id}/reset-mfa/` | JWT + organização; admin do contrato, user:manage | 204; somente usuário comum do mesmo contrato |
| `POST /api/v1/admin/contracts/{public_id}/admins/{user_public_id}/reset-mfa/` | JWT de superadmin | 204; somente admin listado no contrato informado |

A prova temporária é opaca e aleatória, com digest no banco e uso único. Não aceita
Bearer/refresh nem autoriza qualquer outro endpoint. Expira em cinco minutos,
invalida com a senha/geração da credencial e tem até cinco provas pendentes por conta.
Senha sozinha não cria sessão nem AccessLog de sucesso para contas com MFA confirmado.

TOTP: seis dígitos, 30 s, janela de um intervalo e antirreuso pelo último intervalo,
inclusive entre ativação e login (aguardar o próximo código após ativar).
Reserva: HMAC-SHA256 e exclusão ao consumir. Falhas aguardam 1, 2, 4… até 60 s;
429 preserva Retry-After. As falhas são persistidas antes de responder o erro, sem
rollback do limitador. Tudo usa no-store e os erros seguem RFC 9457: código/senha
inválidos 422, prova inválida 401, estado incompatível/expirado 409.
Chave ausente/inválida ou segredo indecifrável: configuração/TOTP retornam 503 genérico,
sem fallback. Reserva válida permite recuperação explícita sem decifrar o segredo.

## Sessões e interface

Ativar, desativar, regenerar reservas e resetar revogam todos os refresh, apagam sessões
ativas/provas pendentes e mudam a geração do fator na mesma transação auditada.
Preservada a decisão 83: access já emitido expira em até 15 min, sem consulta por
requisição. O navegador atual limpa sua sessão ao concluir; ativação/regeneração
mostram primeiro as reservas e só saem após confirmação de guarda. Outras abas
sincronizam pelo mecanismo de sessão existente.

Configuração em **Perfil → Verificação em duas etapas**, carregada ao abrir a aba.
QR gerado localmente; segredo, prova e reservas ficam só em memória. Download de
reservas é explícito. Reset fica nas ações de Usuários (admin do contrato) e na aba
Administradores do contrato (superadmin), com confirmação prévia. Nenhum reset ativa
MFA automaticamente; o usuário pode configurar novamente, por escolha própria.

Até a etapa 5.3, recuperar um superadmin no ambiente administrado com
`manage.py reset_mfa <username> --actor <superadmin-ativo>`. Não há reset de
superadmin por API; o comando registra autoria e não imprime segredos.

## Implantação

Migrations users.0008 e audit.0011 aplicadas ao banco local em 2026-10-31 por
solicitação do usuário. Definir `DJANGO_MFA_ENCRYPTION_KEY` com chave Fernet própria;
SECRET_KEY/JWT não são aceitos. A chave local foi gerada sem exibir seu valor, somente
em backend/.env (ignorado pelo Git); nenhuma conta foi ativada automaticamente.
Preservar a chave com o backup seguro: substituir a chave impede decifrar fatores
existentes. Sem ela, recorrer a reservas ou recuperação administrativa auditada.
