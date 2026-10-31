# Handoff

- **Atualizado em:** 2026-10-31
- **Agente:** Claude (continuação do Codex)
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Último commit:** f37be68 feat(frontend): improve organization selection and switching
## Situação

| Item | Estado |
|---|---|
| Etapa atual | 9.4 MFA TOTP — concluída, alterações sem commit |
| Próximo passo exato | Conferir no navegador o login MFA aplicado (precisa de conta com MFA ativo); commit quando solicitado |
| Aguardando o usuário? | sim — conferência visual e autorização para ativar MFA numa conta local |

## Feito nesta etapa

- Decisões 73–75/86–88, ADR 0041 aceito. MFA opcional para todos; só é pedido após
  ativação confirmada pelo usuário. Configuração pendente não exige segundo fator.
- Backend: segredo Fernet com chave independente, reservas HMAC de uso único,
  prova opaca de login (digest/5 min/uso único/máx. 5/conta), antirreuso e espera
  crescente persistida antes de responder erro. Sem JWT/sessão antes do segundo fator.
- Status/setup/ativar/desativar/regenerar completos. Todas as sessões/refresh/provas
  revogados ao mudar o fator; frontend limpa a sessão e pede novo login após guardar
  reservas. Preservada decisão 83: access emitido dura até 15 min, sem query por navegação.
- Recuperação auditada: comuns pelo admin do próprio contrato; admins, inclusive
  inativos, pelo superadmin. Comando reset_mfa para superadmins até a etapa 5.3.
- Perfil → Verificação em duas etapas integrado e sob demanda, QR local, reservas uma
  vez/download explícito/guarda antes da saída. Login TOTP/reserva; resets nas ações
  de Usuários e Admins do contrato, com confirmação. Abas roláveis no celular.
- Dependências instaladas/verificadas: PyOTP 2.10.0, cryptography 50.0.2, qrcode 1.5.4
  e tipos 1.5.6, licenças permissivas; QR em chunk sob demanda, sem serviço externo.
- Migrations users.0008/audit.0011 aplicadas ao banco local com autorização.
  Chave MFA gerada apenas em backend/.env ignorado, sem imprimir; nenhuma conta ativada.
- ADR/API/OpenAPI/AGENTS/README/overview/plano e memória sincronizados.

## Login MFA (layout aplicado)
- FigCraft salvo na página Login · Verificação em duas etapas; referência IM03.png
  e seleção de organização. Estados autenticador/reserva/erro e 390/320 px conferidos.
- Aplicada em pages/auth/login.html/.scss (template extraído do login.ts). Prettier, lint,
  build e 128 testes ok; conferência visual pendente. Nenhuma conta alterada.

## Validação

- 756 testes backend (36,68 s), 128 frontend ChromeHeadless; ruff check/format,
  lint/format:check/build frontend, schema validate/fail-on-warn, migration checks,
  check e check --deploy sem falhas. Logs /tmp/datasync-mfa-*.log.
- Isolamento, papéis, falhas persistidas, antirreuso, revogação e concorrência cobertos.
  Consultas constantes com 30 contas adicionais em status e operações; login sem MFA
  mantém as 10 queries anteriores. Sem consulta nova na navegação; sem teste de carga produtiva.
- OWASP A01–A10 revisados, sem achados pendentes no diff; corrigido papel de admin inativo.

## Avisos

- Não imprimir/versionar .env, chave, segredos, provas ou reservas; preservar chave em backup.
- SDK PyCharm: /home/cesar/Virtual/datasync-core-3.14/bin/python (pip).
  Consultar get_python_environment antes de CADA comando Python; não alterar SDK/configuração.
- Testes transacionais fazem flush das sementes no banco de testes. Após subconjuntos,
  suíte completa com --reuse-db --create-db; isso recria só o banco de testes.
- Sem commit/push nesta entrega. Push só quando pedido; nunca --amend na main.
- FigCraft em design/, MCP porta 7710; não fechar/sobrescrever sem necessidade.

## Próximas etapas (não iniciar sem aprovação)

- 9.5 Meu acesso; 5.3 superadmins/admins adicionais; suporte do superadmin por organização.
- Produção: HTTPS/CSP, cache compartilhado/borda, recuperação, expurgo/LegalHold e infraestrutura.
- npm audit adiado; não reativar telas DESABILITADO sem aprovação. 9.1–9.4 concluídas.
