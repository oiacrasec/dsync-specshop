---
name: owasp-top-10
description: Checklist de code review de segurança baseado no OWASP Top 10:2025, aplicado à stack do projeto (Django/DRF, Angular, multi-tenant por contrato). Use SEMPRE ao revisar código, PRs ou diffs, e antes de entregar qualquer mudança em autenticação, autorização, endpoints, queries, uploads, dependências, configuração ou tratamento de erros.
---

# OWASP Top 10:2025 — code review

Fonte oficial: https://top10.owasp.org/2025/ (versão 2025, repositório `OWASP/Top10`).

> **Regra de ouro:** revisar o diff contra as 10 categorias, citando **arquivo:linha**, a
> categoria e a correção. Na dúvida se algo é explorável, **trate como achado** e explique
> o cenário (skill `questionador`: nunca supor que "não tem problema").

## Como revisar

1. Ler o diff inteiro e o contexto necessário (quem chama, quem é chamado).
2. Passar pelas 10 categorias abaixo; pular só as que comprovadamente não se aplicam.
3. Reportar cada achado assim:

| Severidade | Categoria | Local | Problema | Cenário de ataque | Correção |
|---|---|---|---|---|---|
| 🔴 Crítica / 🟠 Alta / 🟡 Média / 🔵 Baixa | A0X | `arquivo.py:42` | o que está errado | como seria explorado | o que fazer |

4. Sem achados → dizer explicitamente quais categorias foram verificadas.

## A01:2025 — Broken Access Control 🔴 (maior risco do projeto)

- [ ] **Nega por padrão**: endpoint novo exige autenticação e permissão do registry (ADR 0009).
- [ ] **Isolamento entre contratos**: queryset filtrado pelo contexto via mecanismo central (ADR 0006), nunca manual na view.
- [ ] Model de negócio com **escopo declarado** (`ContractScopedModel`, etc.); nada de escopo inferido pela ausência de campo.
- [ ] **IDOR**: buscar por `public_id` **dentro** do queryset escopado; FKs do payload restritas ao contexto.
- [ ] Contexto (`contract`/`organization`) vem do **request validado**, nunca do payload.
- [ ] `id` interno nunca exposto; só `public_id` (ADR 0007).
- [ ] Admin do contrato não age fora do próprio contrato nem concede o que não tem.
- [ ] Endpoints administrativos exigem superadmin (ADR 0008).
- [ ] Rate limit em endpoints sensíveis; CORS restrito a origens conhecidas.
- [ ] JWT com vida curta e refresh revogável.
- [ ] Teste que tenta acessar dado de **outro contrato** e espera 403/404.

## A02:2025 — Security Misconfiguration

- [ ] Nada de `DEBUG=True`, `ALLOWED_HOSTS=['*']` ou CORS aberto fora de desenvolvimento.
- [ ] `check --deploy` sem alertas; HTTPS, HSTS, cookies `Secure`/`HttpOnly`, headers de segurança.
- [ ] Erro não expõe stack trace, SQL ou caminho interno ao cliente.
- [ ] Nenhum segredo no código ou no repositório (só `.env`, nunca versionado).
- [ ] Sem funcionalidades, rotas ou contas de teste esquecidas em produção.

## A03:2025 — Software Supply Chain Failures

- [ ] Dependência nova: necessária, mantida, licença compatível (skill `propriedade-intelectual`), de fonte oficial.
- [ ] Versões declaradas (`~=` no backend, lockfile no frontend); dependências transitivas consideradas.
- [ ] Sem vulnerabilidade conhecida (ex.: `pip-audit`, `npm audit`, OSV).
- [ ] Dependência sem uso removida.

## A04:2025 — Cryptographic Failures

- [ ] Senhas só com hasher do Django (Argon2 configurado); nunca hash próprio, MD5 ou SHA puro.
- [ ] Dado sensível (skill `lgpd`) criptografado em repouso quando aplicável; nunca em log, URL ou cache.
- [ ] Tokens e segredos gerados com `secrets` (CSPRNG), nunca `random`.
- [ ] Comparação de tokens com `hmac.compare_digest` / `constant_time_compare`.
- [ ] TLS ≥ 1.2 em toda comunicação externa; nada de protocolo sem criptografia.

## A05:2025 — Injection

- [ ] SQL só via ORM ou com **parâmetros** (`cursor.execute(sql, params)`); nunca f-string ou concatenação.
- [ ] `raw()`, `extra()`, `RawSQL`: revisar linha a linha.
- [ ] Nome de coluna/tabela vindo do usuário (ex.: ordenação) só por **whitelist**.
- [ ] Filtros dinâmicos (`**request.query_params`) proibidos sem whitelist de campos.
- [ ] Sem `subprocess` com `shell=True` ou input do usuário em comandos.
- [ ] Angular: sem `bypassSecurityTrust*` nem `innerHTML` com dado não confiável (XSS).
- [ ] Logs com dado do usuário escapado (injeção em logs).

## A06:2025 — Insecure Design

- [ ] Fluxos críticos (login, contexto, permissões, pagamentos) têm casos de **abuso** testados, não só o caminho feliz.
- [ ] Regras de negócio no `service`, validadas no backend (o frontend não é barreira).
- [ ] **Tenants segregados por design** em todas as camadas (ADR 0006).
- [ ] Limites de negócio (licenças do contrato, quotas do plano) aplicados no domínio.

## A07:2025 — Authentication Failures

- [ ] Proteção contra força bruta e credential stuffing (bloqueio ou atraso progressivo).
- [ ] Mensagem genérica em login e recuperação ("usuário ou senha inválidos"), sem enumeração de contas.
- [ ] Validadores de senha ativos; sem credenciais padrão.
- [ ] MFA disponível para superadmin e admins do contrato.
- [ ] Token invalidado no logout; refresh rotacionado.

## A08:2025 — Software or Data Integrity Failures

- [ ] Nada de `pickle`/desserialização de dado não confiável; JSON validado por serializer.
- [ ] Webhooks e callbacks com verificação de assinatura.
- [ ] CI/CD com acesso restrito; mudanças passam por revisão.
- [ ] Assinatura eletrônica com hash e trilha verificável (skill `assinatura-eletronica`).

## A09:2025 — Security Logging and Alerting Failures

- [ ] Logins (sucesso e **falha**), falhas de permissão e de contexto (400/403) são registrados.
- [ ] Ações administrativas e mudanças de permissão auditadas (ADR 0009).
- [ ] Log com contexto suficiente (usuário, contrato, IP, horário UTC), **sem** dado pessoal em claro (skill `lgpd`).
- [ ] Trilha de auditoria append-only; registros de acesso conforme a skill `marco-civil`.

## A10:2025 — Mishandling of Exceptional Conditions

- [ ] Exceção tratada **onde ocorre**, com handler global de reserva (DRF `EXCEPTION_HANDLER`).
- [ ] Transação com erro faz **rollback completo** (fail closed); nada de recuperar pela metade.
- [ ] Nada de `except Exception: pass` nem erro engolido em silêncio.
- [ ] Falha de validação ou permissão nunca libera acesso por padrão.
- [ ] Limites em tudo: paginação, tamanho de upload, timeout de query, rate limit.
- [ ] Resposta de erro padronizada e sem detalhes internos.

## Relação com outras skills

`crimes-ciberneticos` (o que nunca implementar e trilha de evidências) · `lgpd` (dados
pessoais) · `conformidade-legal` (leis por funcionalidade) · `questionador` (dúvidas).
