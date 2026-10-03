# Autenticação — JWT (API v1)

Implementação da etapa 0.3, conforme ADRs 0004 e 0007. A API exige autenticação
por padrão; apenas as três rotas abaixo são públicas. Não usa sessões ou cookies
de autenticação do Django. Entrada e saída em JSON, sob HTTPS em produção.

## Endpoints

| Método e rota | Entrada | Sucesso |
|---|---|---|
| `POST /api/v1/auth/login/` | `username`, `password` | 200, `access` e `refresh` |
| `POST /api/v1/auth/refresh/` | `refresh` | 200, novos `access` e `refresh` |
| `POST /api/v1/auth/logout/` | `refresh` | 204, sem corpo |

Login:

```json
{"username": "usuario", "password": "senha-do-usuario"}
```

Login e refresh retornam:

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

O cliente deve substituir o refresh anterior pelo novo após renovar. Reutilizar
um refresh revogado retorna 401. Renovação e logout são transacionais e usam lock
de linha do token no PostgreSQL; duas renovações simultâneas do mesmo refresh
não podem emitir dois novos pares válidos.

Usuários inativos ou excluídos não fazem login, não renovam e não autenticam
rotas protegidas. A autenticação do access consulta o usuário a cada requisição,
em uma query. O logout revoga o refresh; um access já emitido permanece válido
até expirar, por no máximo 15 minutos, conforme ADR 0004.

Contrato/organização e regras de vigência entrarão no bloco 2 do plano. O
armazenamento de tokens no navegador continua pendente no ADR 0003; esta etapa
não define armazenamento no frontend.

## Erros

Todos seguem [RFC 9457](errors.md), com `application/problem+json`.

| Status | Caso | Tipo |
|---|---|---|
| 400 | JSON malformado | `malformed-request` |
| 401 | credenciais inválidas, usuário indisponível, token inválido/expirado/revogado | `authentication-required` |
| 422 | campo ausente, vazio ou de formato inválido | `validation-error`, com `errors` |
| 429 | limite de login excedido | `about:blank`, com header `Retry-After` |

401 devolve mensagem genérica sem revelar se a conta existe e inclui desafio
`WWW-Authenticate: Bearer`. 429 utiliza o título HTTP padrão, sem novo slug.
Os tipos com slug usam o prefixo `urn:datasync:problem:`.

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
