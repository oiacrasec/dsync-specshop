# Frontend — estado compilado

- Angular/PrimeNG 21, standalone/zoneless, Node 24. Template GIS/PrimeTek copiado;
  licenciamento confirmado pelo usuário. Código/runtime independente do backend.
- Etapa 6.5 concluída; ADR 0035 resolve JWT no localStorage por escolha explícita
  após discussão HttpOnly. Sessão versionada dsc_session_v1 com access/refresh/user
  mínimo e identificador local (não credencial) para distinguir novos logins.
- Organização ativa dsc_active_context_v1 no localStorage com public_id/nome/dono.
  Usuário exigiu contexto comum às abas: troca via storage limpa caches e recarrega
  conteúdo; confirmar seleção abre página nova também na própria aba. Label não
  recarrega. Login/logout em outra aba recarregam; rotação não.
- AuthService chama auth/login, refresh, logout, change-password e me/organizations
  no /api/v1. Sem resumo de permissões Spatial ou verify. JWT exp só UX; backend valida.
- AuthSessionService compartilha refresh por observable e Web Locks entre abas;
  relê token após lock, reutiliza rotação pronta e impede restauração de sessão antiga.
  Logout aguarda lock e revoga último refresh; falha ainda limpa localmente e avisa.
  Web Locks exige HTTPS/localhost e navegador compatível, sem fallback concorrente.
- Auth/contexto usam signals: 30 pedidos testados sem leitura/escrita de storage,
  sem refresh ou polling. Listener removido no destroy. Rede auth 15s/espera lock 20s.
- Interceptors scope por origem/prefixo exatos; Bearer só API, organização UUID só
  negócio comum. RFC 9457: refresh máximo uma repetição; auth/contrato → login;
  password-change-required → troca; contexto → seleção; 403 permissão preserva sessão.
  Respostas de sessão/contexto anterior descartadas. ETag global URL-only desabilitado.
- Login superadmin → dashboards; comum marcado → troca (12+ caracteres/confirmar na UI,
  validadores completos Django), depois seleção; comum → seleção de organizações
  acessíveis array {public_id,name}. Sem id interno/contrato/setores no contexto.
- Guards UX; backend autoriza. PermissionContextService (7.4) lê /me/permissions/ por
  sessão+organização (shareReplay, signal), nega até carregar; menu carrega no ngOnInit.
  Organizações: lista/form no Core (public_id, name/is_active), PERMISSION_KEYS.ORGANIZATION_*.
  ui-table rows 20/dataKey public_id e ui-autocomplete rows 20 por padrão.
- Dev /api/v1 usa proxy Angular 127.0.0.1:8000. Homol/prod URL pendente, fail closed
  para não vazar tokens quando base vazia. Contratos adaptados na 6.8.
- 44 testes ChromeHeadless, lint/formato/build; bundle inicial ~1,25 MB/~257 KB
  estimados. Storage real de iframe, refresh em dois serviços, erros/guards/telas.
  Sem E2E completo duas abas/backend, capacidade sob carga ou auditoria WCAG completa.
- Risco conhecido: JWT legível por JS/XSS, escolha documentada. HTTPS/CSP/MFA/infra
  antes de produção. Senhas fora do storage/logs. AccessLog backend não alterado.
- 6.8 (decisão 44): contratos do superadmin na API do Core. BaseCrudService.listTable busca o
  schema uma vez por recurso (shareReplay) e core/utils/table-schema adapta total_records/
  colunas (tipo → máscara pelo LOCALE_ID pt-BR)/filtros ao ui-table; lookupOptions e ui-filter
  resolve opções por public_id (rows 20) e mapeia snake_case. Formulário: plano opcional por
  options, retenção 0–365 (padrão 90), provisionamento (username + nome), admins e reset
  com confirmação; senha temporária só em memória. Erros por problemMessage (RFC 9457).
  52 testes ChromeHeadless; bundle inicial ~1,25 MB. Bloco 6 concluído.

- 2026-10-31: `shared/ui/organization-picker` compartilha escolha no AuthLayout e
  troca em p-dialog pelo avatar. Busca local acima de 7, seleção preservada,
  lista até 350 px, busca/ações fora da rolagem; Atual no modal. Uma chamada por
  abertura; destroy cancela HTTP, revisão da sessão rejeita respostas antigas.
  Cancelar/X/Esc mantêm contexto/URL e devolvem foco ao avatar; confirmação mantém
  setActiveContext/openContext (ADR 0035). 120 testes ChromeHeadless; desktop e
  320 px conferidos com API simulada. Sem mudanças de backend/dependências.

- Ajuste aprovado: ação de confirmar usa sempre **Entrar**, sem nome de organização
  (frontend e FigCraft); seleção continua preservada ao filtrar.

- 9.4 (2026-10-31): MFA opcional no Perfil → Verificação em duas etapas, componente
  renderizado só ao abrir a aba. QR local sob demanda; segredo/códigos só em memória,
  download explícito e confirmação de guarda antes de limpar sessão e voltar ao login.
  Login mfa_required não grava sessão; /auth/login/mfa/ público, TOTP ou reserva,
  resposta antiga ignorada/HTTP cancelado ao destruir. /me/mfa/ sem organização.
  Mudanças encerram todas as sessões; exibição das reservas precede a saída (88).
  Reset com confirmação nas ações de Usuários e Admins do contrato; validação real
  no backend. Abas do Perfil roláveis em tela estreita; nenhum polling novo.

- Proposta visual posterior à 9.4: FigCraft → Login · Verificação em duas etapas.
  Mesmo cartão/fundo da seleção de organização, campo de código ampliado, Verificar
  em largura total e alternativas no rodapé; estados autenticador/reserva/erro e
  390/320 px. Ainda não aplicada ao código; aguarda aprovação do usuário.
