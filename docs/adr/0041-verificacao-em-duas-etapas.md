# 0041 — Verificação em duas etapas por TOTP

- **Status:** Aceito (decisões 73–75 e 86–88)
- **Data:** 2026-10-31
- **Complementa:** ADRs 0010, 0012, 0035

## Decisões aprovadas

- 2FA opcional para todos, inclusive superadmin, por aplicativo autenticador TOTP
  (RFC 6238); WebAuthn fica para depois.
- Segredo cifrado com Fernet e chave independente `DJANGO_MFA_ENCRYPTION_KEY`.
  Não usar SECRET_KEY/JWT como fallback, nem registrar chave/segredo/códigos em logs.
- Confirmação do primeiro código antes de ativar. Dez códigos reserva de uso único,
  exibidos uma vez; armazenar HMAC-SHA256 e apagar a linha ao consumir.
- Verificação com trava de linha, antirreuso pelo último intervalo e espera crescente,
  sem dormir segurando lock. PyOTP só calcula TOTP; cryptography fornece Fernet.
- Recuperação administrativa auditada: admin do contrato redefine usuários comuns;
  superadmin redefine admins do contrato. Entre superadmins, comando até a etapa 5.3.
- Entrega conjunta: backend, Perfil, segundo passo no login e reset por admin.

## Implementação

- TOTP de 6 dígitos/30 s, tolerância de um intervalo, antirreuso `last_t` inclusive
  entre ações. Falhas aguardam 1, 2, 4, 8… até 60 s (mesmo teto do bloqueio do login).
  Com 10 falhas seguidas, cada falha no 2º passo derruba todas as provas pendentes da conta
  (401) e conta uma falha no bloqueio do login; o acesso recomeça pela senha.
  Recuperação e senha inválida de desativação compartilham a proteção da credencial.
- `UserMfa`, `UserRecoveryCode` e `UserMfaChallenge` são credenciais técnicas da conta,
  sem BaseModel/soft delete/contrato: a autenticação precede o tenant e superadmin não
  tem contrato. Entram explicitamente em UNSCOPED_RECORDS e OWNER_ONLY, com testes
  de dono/contrato; não são dados de negócio nem acessíveis por CRUD genérico.
- O primeiro passo valida a senha, mas não cria JWT/sessão/sucesso de AccessLog para
  quem tem MFA. Retorna prova opaca aleatória, mantida só em memória no frontend;
  no banco, digest SHA-256, dono, geração da credencial e prova HMAC da senha.
- Prova de login com validade de 5 min e consumo único, no máximo 5 pendentes por
  conta. Lock do usuário serializa emissão, confirmação e mudanças de credencial.
  A prova não é access/refresh e não autentica qualquer outra API.
- Segundo passo revalida conta, contrato, senha/geração, prazo e código sob lock;
  só então consome a prova e cria JWT + UserSession, na mesma transação.
- Confirmações usam views non_atomic_requests com transação explícita no service:
  falhas são persistidas antes de lançar o erro, impedindo rollback do limitador.
  Nenhuma consulta adicional na navegação cotidiana; só autenticação/configuração.
- Configuração e TOTP exigem chave válida e independente; ausência/falha de decifração
  responde erro seguro 503, sem fallback ou desativação silenciosa. Códigos reserva
  continuam utilizáveis sem a chave Fernet: são uma recuperação explícita por HMAC.
- Dependências verificadas em PyPI/npm em 2026-10-31: PyOTP 2.10.0 (MIT, 2026-06-14),
  cryptography 50.0.2 (Apache-2.0/BSD-3, 2026-09-30), qrcode 1.5.4 e seus tipos 1.5.6
  (MIT; publicados há mais de duas semanas). QR gerado no frontend, sem serviço externo.

## Sessões e ativação opcional

- Ao ativar, desativar, regenerar códigos reserva ou redefinir administrativamente:
  revogar todos os refresh, apagar UserSession e provas de login, trocar a geração
  do fator e auditar na mesma transação. Não manter exceção para a sessão atual.
- O frontend limpa a sessão e pede novo login. Na ativação/regeneração, primeiro
  mostra os códigos reserva uma única vez e aguarda a confirmação de guarda.
- Mantida a decisão 83: access já emitido pode durar até 15 min; revogação corta a
  próxima renovação. Nenhuma consulta adicional em navegação para conferir o fator.
- Usuários sem fator confirmado seguem diretamente para o login completo. Gerar
  QR/segredo não ativa MFA. Nenhuma conta é ativada por migration ou administrador.
- Reset administrativo remove o fator, reservas e configuração pendente. Admin do
  contrato não redefine a si ou outros admins; superadmin usa a área de contratos.
  Recuperação de superadmin usa `manage.py reset_mfa <username> --actor <superadmin>`
  no ambiente administrado até a etapa 5.3, com autoria ativa e evento auditado.

## Revisões

- 2026-10-31 — decisão 88: usuário aprovou encerrar todas as sessões e entrar novamente;
  reafirmou MFA opcional, exigido somente quando ativado pelo próprio usuário.
- 2026-10-31 — revisão de segurança: o 2º passo não tinha limite final (só espera de até
  60 s). Usuário escolheu cortar após 10 falhas seguidas: provas pendentes derrubadas,
  falha contada no bloqueio do login e retorno à senha. O contador zera no sucesso.

## Fontes

- [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238).
- [PyOTP](https://pyauth.github.io/pyotp/).
- [Fernet](https://cryptography.io/en/50.0.2/fernet/).
- Ideias de espera crescente/antirreuso do django-otp 1.7.5 (Unlicense), com implementação
  própria e adaptações de cifragem, hash, locks e autenticação JWT.
