# Autenticação — JWT (API v1)

Implementação das etapas 0.3 e 6.4, conforme ADRs 0004, 0007 e 0034. A API exige autenticação
por padrão; apenas login, refresh e logout são públicos. Não usa sessões ou cookies
de autenticação do Django. Entrada e saída em JSON, sob HTTPS em produção.

## Endpoints

| Método e rota | Entrada | Sucesso |
|---|---|---|
| `POST /api/v1/auth/login/` | `username`, `password` | 200, `access`, `refresh` e `user` |
| `POST /api/v1/auth/refresh/` | `refresh` | 200, novos `access` e `refresh` |
| `POST /api/v1/auth/logout/` | `refresh` | 204, sem corpo |
| `POST /api/v1/auth/change-password/` (autenticado) | `current_password`, `new_password`, `new_password_confirm` | 200, resumo `user` atualizado |

Login:

```json
{"username": "usuario", "password": "senha-do-usuario"}
```

Login retorna:

```json
{
  "access": "<jwt-access>",
  "refresh": "<jwt-refresh>",
  "user": {
    "public_id": "01a10393-161d-7432-94b7-43923f620168",
    "username": "usuario",
    "name": "Maria",
    "is_superuser": false,
    "must_change_password": true
  }
}
```

`name` vem de `first_name` e pode ser vazio. Os campos do resumo são explícitos;
sem ID interno, e-mail, contrato, hash de senha ou permissões. Não acrescenta consulta.
Refresh continua retornando somente:

```json
{"access": "<jwt-access>", "refresh": "<jwt-refresh>"}
```

Refresh e logout recebem:

```json
{"refresh": "<jwt-refresh>"}
```

Nas rotas protegidas, enviar `Authorization: Bearer <jwt-access>`. Um refresh
não autentica essas rotas. Login, refresh e logout não exigem access token;
logout continua disponível quando o access expirou, mediante refresh válido.
Todas as respostas dessas rotas incluem `Cache-Control` com `no-store` e
`X-Request-Id`. Dados de credenciais e tokens não aparecem nos logs da aplicação.

## Tokens e revogação

| Regra | Implementação |
|---|---|
| Access | 15 minutos |
| Refresh | 1 dia, contado novamente a cada rotação |
| Identidade | claim `public_id`, UUID v7 do usuário; sem PK interna, username ou email |
| Algoritmo | HS256, chave independente em `DJANGO_JWT_SIGNING_KEY` |
| Renovação | revoga refresh anterior e registra o novo |
| Logout | revoga o refresh apresentado |

Ordem de locks na renovação: usuário → token (a mesma do reset de senha da 6.7, que revoga
todos os refresh da conta). O cliente deve substituir o refresh anterior pelo novo após renovar. Reutilizar
um refresh revogado retorna 401. Renovação e logout são transacionais e usam lock
de linha do token no PostgreSQL; duas renovações simultâneas do mesmo refresh
não podem emitir dois novos pares válidos.

Usuários inativos ou excluídos não fazem login, não renovam e não autenticam
rotas protegidas. A autenticação do access consulta o usuário a cada requisição,
em uma query. O logout revoga o refresh; um access já emitido permanece válido
até expirar, por no máximo 15 minutos, conforme ADR 0004.

Contrato do usuário vencido, futuro, inativo ou excluído → 403 `contract-inactive` no login
(após senha correta), no refresh e em toda rota autenticada; logout continua permitido
([regras](../domain/contracts.md)). O
armazenamento de tokens no navegador foi definido no ADR 0035 (ver Cliente Angular abaixo).

## Erros

Todos seguem [RFC 9457](errors.md), com `application/problem+json`.

| Status | Caso | Tipo |
|---|---|---|
| 400 | JSON malformado | `malformed-request` |
| 403 | contrato do usuário indisponível | `contract-inactive` |
| 403 | usuário comum precisa trocar a senha | `password-change-required` |
| 401 | credenciais inválidas, usuário indisponível, token inválido/expirado/revogado | `authentication-required` |
| 422 | entrada inválida, senha atual incorreta ou nova senha rejeitada | `validation-error`, com `errors` |
| 429 | limite de login ou troca de senha excedido | `about:blank`, com header `Retry-After` |

401 devolve mensagem genérica sem revelar se a conta existe e inclui desafio
`WWW-Authenticate: Bearer`. 429 utiliza o título HTTP padrão, sem novo slug.
Os tipos com slug usam o prefixo `urn:datasync:problem:`.

## Primeiro acesso e troca de senha (6.4)

`User.must_change_password` tem default false, inclusive para as contas existentes.
O provisionamento/reset marcará a flag nas etapas 6.6/6.7. Para o usuário comum
marcado, login ainda emite tokens e o resumo orienta o frontend a abrir a troca.
Toda requisição autenticada por JWT é bloqueada antes das permissões/contexto,
inclusive options, schema e views com permissões próprias. A flag é lida no usuário
já consultado, não em um claim que possa ficar desatualizado; sem consulta, escrita,
hash ou lock adicional durante a navegação.

Exceções: trocar a própria senha, refresh e logout. Login é público e precisa permitir
o início da sessão restrita. Somente PasswordChangeView declara
`allow_password_change_required=True`; payload, query string e headers não liberam
outras views. Novos endpoints autenticados devem manter JWTAuthentication.
Superadmin é isento: o resumo retorna false mesmo se sua flag persistida estiver true.

A troca exige access válido, sem organização ou permissão de administração; o alvo
é exclusivamente request.user. Também pode ser usada voluntariamente por uma conta
sem flag, inclusive superadmin, como no endpoint de troca do Spatial.
Enviar as três senhas no JSON; espaços são preservados. A confirmação deve coincidir
e a nova senha deve diferir da atual. O serviço recarrega a conta ativa e não excluída,
com contrato válido, sob lock somente na linha do usuário, e confere novamente a
senha atual. Aplica os validadores configurados do Django (similaridade com atributos,
mínimo 12 caracteres, senhas comuns e inteiramente numéricas). Usa set_password;
o hasher principal continua Argon2. Falhas retornam 422 por campo, sem repetir a senha.
Ver [validadores do Django](https://docs.djangoproject.com/en/5.2/topics/auth/passwords/#password-validation).

Senha, flag=false, autoria e AuditEvent `user.password_changed` são gravados na mesma
transação. O evento contém somente before/after da flag, autor/alvo e contrato;
nenhuma senha, hash ou token. Erro desfaz toda a troca. Duas trocas concorrentes com
a mesma senha antiga permitem somente uma gravação. A resposta é `{"user": {...}}`,
com o mesmo resumo do login; todas as respostas da troca têm no-store.

Há throttle exclusivo de troca, pelo UserRateThrottle do DRF: **5 pedidos por minuto
por usuário autenticado**, incluindo tentativas inválidas. O limite ocorre antes do
hash/lock, não conta falhas de login nem limita a navegação. É proteção de aplicação
com cache, não limite estrito de concorrência; cache compartilhado e borda continuam
necessários antes de produção. A verificação de senha e Argon2 ficam só na operação
de autenticação/troca, nunca nas leituras comuns.

A sessão atual continua com seus tokens; a troca não emite novos tokens nem revoga
outros refresh. O access passa a ser aceito assim que a flag é limpa. Rotação/logout
mantêm a política acima. O reset pelo superadmin (6.7) revoga todos os refresh da conta
([admins do contrato](admin-contracts.md#admins-do-contrato-e-reset-de-senha-67)).
A adaptação das telas/interceptors foi feita na 6.5.

Finalidade da flag vinculada à conta: impedir uso com senha temporária e permitir
acesso seguro ao serviço contratado. Mantida junto à conta, limpa na troca, sem
histórico adicional de senhas. O mapeamento técnico de tratamento considera execução
do serviço contratado (LGPD art. 7º, V) e medidas de segurança (art. 46); deve integrar
o inventário/política do controlador conforme sua relação com os titulares.
O resumo só retorna dados da própria conta. Não há novo envio a terceiros ou tracking.
Fonte: [LGPD, texto oficial](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).

## Cliente Angular (etapa 6.5)

Decisão explícita do usuário: access/refresh no localStorage, enviados como Bearer
(ADR 0035), mantendo o contrato JSON acima. O resumo mínimo de usuário também é
persistido para UX; a API continua validando conta/contrato/permissões a cada pedido.
Organização UUID é compartilhada entre abas; trocar recarrega conteúdo e limpa caches.
Refresh/logout são coordenados por Web Locks para não consumir o mesmo refresh duas
vezes. Não há cookie de autenticação nem mudança de CSRF/backend nesta etapa.
Tokens continuam acessíveis a JavaScript; controles contra XSS são necessários.

## Limite de falhas de login

Por confirmação do usuário, contar **somente falhas de autenticação por conta**,
conforme a recomendação da [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#account-lockout).
O valor inicial é `DJANGO_AUTH_LOGIN_RATE=5/min`: na quinta falha de uma janela
fixa de 60 segundos, bloquear novos pedidos dessa conta por **60 segundos**.
As janelas são alinhadas ao relógio do servidor. Requisições que já estavam em
processamento podem terminar; suas falhas também são contadas.

Logins bem-sucedidos, validação 422 e sintaxe 400 não consomem tentativas.
Sucesso não limpa as falhas ainda na janela. Durante o bloqueio, até um pedido
com senha correta recebe 429 e `Retry-After`; depois, pode autenticar novamente.
Refresh e logout não consomem esse limite.

A chave do contador utiliza HMAC do username normalizado, sem guardá-lo em
claro; nomes inexistentes seguem a mesma política, evitando revelar contas.
Trocar de IP não muda o contador. Contadores e bloqueios expiram no cache.
Não se altera `is_active` e não há bloqueio permanente de conta.

O contador usa `add`/`incr`, atômicos no cache local atual, com concorrência
testada. Ainda há **cache por processo**: antes de produção com múltiplos workers,
configurar cache compartilhado com operações atômicas e leitura consistente.
Também definir proteção por IP na borda, recuperação de conta e MFA para áreas
administrativas. Essas decisões de implantação não foram materializadas aqui.
Este mecanismo não substitui a proteção de infraestrutura contra abuso ou DoS.
Veja a [documentação de cache](https://docs.djangoproject.com/en/5.2/topics/cache/).

## Operação e retenção

AccessLog registra LOGIN_SUCCESS, LOGIN_FAILURE e REFRESH_SUCCESS (ADR 0019).
Login com credenciais rejeitadas ou contrato indisponível gera falha; sem username
digitado ou associação presumida a uma conta. Sucessos registram o usuário validado.
Payload inválido, throttle antes da tentativa, refresh recusado e logout não geram
esse registro. Erros continuam no logging técnico; a revogação no logout permanece.
O middleware grava fora da transação da view, antes de devolver a resposta; o
registro de falha sobrevive ao rollback. Dados guardados: ação, data UTC, origem,
vínculos conhecidos e request_id, sem senhas/tokens. Guarda declarada de seis meses,
expurgo/LegalHold na entrega própria. Ver [auditoria](../domain/audit.md).

Instalar os requirements, configurar a chave JWT independente e executar
`python manage.py migrate`. As migrations da blacklist mantêm nomes próprios
da biblioteca, conforme ADR 0007. Elas foram aplicadas ao banco local com
autorização do usuário nesta etapa.

O app da blacklist armazena refresh tokens, `jti`, vínculo ao usuário e validade
para permitir rotação e revogação. Esses dados têm finalidade de autenticação
e segurança; acesso ao banco e backups deve ser restrito. Não são AccessLog.

Para eliminar tokens expirados, a biblioteca oferece:

```bash
python manage.py flushexpiredtokens
```

Executar diariamente na infraestrutura de execução, conforme a
[documentação da blacklist](https://django-rest-framework-simplejwt.readthedocs.io/en/stable/blacklist_app.html).
O agendamento ainda depende da etapa de infraestrutura; não foi criado um
agendador local nesta entrega. O comando remove também as revogações dos tokens
expirados. A finalidade de autenticação cessa ao expirar o token; a retenção
operacional deve ficar restrita ao intervalo até essa limpeza diária.
