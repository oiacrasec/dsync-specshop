# Handoff

- **Atualizado em:** 2026-10-03 18:38
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Última alteração:** `feat(db): add audited base model with soft delete` (inclui este handoff; consultar `git log -1` para o hash)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 1.1 BaseModel, tabelas dsc_ e User adaptado — ✅ concluída |
| Próximo passo exato | etapa 0.3: JWT login/refresh/logout, rotação e blacklist conforme ADR 0004, usando public_id do User nos tokens |
| Aguardando o usuário? | sim — confirmação para iniciar a etapa 0.3 após o fechamento de 1.1 |

## Feito até aqui

- ADRs 0001–0012 revisados; 0003 continua Proposto para discussão do frontend.
- Backend Django 5.2 LTS, sem Admin, sessões ou messages; etapas 0.1/0.2 concluídas.
- API versionada, handler RFC 9457, request ID e log_filters; logs de conclusão
  apenas para erros (4xx WARNING / 5xx ERROR), por decisão do usuário.
- Etapa 1.1 antecipada ao JWT por aprovação do usuário: a configuração padrão
  de SimpleJWT usa a PK interna, que o ADR 0007 proíbe expor.

## Feito nesta etapa

- BaseModel substitui TimeStampedModel: PK BIGINT, public_id UUID v7 único,
  timestamps, autoria explícita, is_active e exclusão lógica.
- Metaclasse gera tabelas dsc_ em snake_case antes das relações N:N automáticas.
- objects oculta excluídos e preserva inativos; all_objects permite auditoria.
- save(actor=user) registra autoria; delete(actor=user) e QuerySet.delete(actor=user)
  preservam dados e são idempotentes. Sem cascata; futuras regras ficam no service.
- User herda AbstractUser e BaseModel, mantém o is_active do Django e o manager
  de criação de usuários/superusuários. Usuários excluídos não autenticam.
- Banco de desenvolvimento consultado: sem tabelas ou migrations aplicadas.
  Migration inicial regenerada para dsc_user; não aplicada ao banco local.
- Validador completo passou: 58 testes, lint, formatação, ausência de migrations
  pendentes e checks de desenvolvimento/produção, sem avisos nesta execução.
- Revisão de segurança do diff sem novos achados: A01/A04/A05/A06/A07/A08/A09/A10;
  A02 sem mudanças de settings; A03 sem dependências novas. Autenticação de
  excluídos testada; nenhuma API ou regra de escopo criada nesta etapa.
- Performance sem achados: exclusão em lote comprovada em uma query para 1/30
  usuários; índice único de public_id e índices de FKs gerados pelo Django.
- Checklist legal base revisado no escopo: autoria para rastreabilidade prevista
  no ADR 0007; sem novos dados de perfil, logs ou dependências. Soft delete não
  equivale à eliminação; expurgo, LegalHold e política de retenção continuam
  pendentes na entrega própria. AccessLog continua na etapa 4.1.
- Atualizados AGENTS/README do backend, overview, plano e conhecimento da IA.

## Falta nesta etapa

- Nada.

## Dúvidas abertas

- Nenhuma.

## Avisos

- O banco de desenvolvimento continua vazio. Não executar alterações nele sem
  autorização; a migration inicial de User está pronta e validada nos testes.
- Autoria pode ser nula em operações de sistema/bootstrap; bulk/update precisam
  de auditoria explícita do chamador. all_objects não dispensa autorização.
- Escopos e system checks ficam na etapa 1.2, após JWT; expurgo em entrega própria.
- backend/.env é local e nunca deve ser versionado.
- Push para o GitHub só quando o usuário pedir.
- Validador no Windows: Git Bash com PATH=/usr/bin:/bin:$PATH, conforme histórico.
