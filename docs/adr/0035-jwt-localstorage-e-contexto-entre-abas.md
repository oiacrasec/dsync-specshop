# 0035 — JWT em localStorage e organização compartilhada entre abas

- **Status:** Aceito
- **Data:** 2026-10-04
- **Complementa:** 0003, 0004 e 0034

## Contexto

A etapa 6.5 adapta o frontend GIS à API do Core. O usuário avaliou cookies HttpOnly
e decidiu manter JWT em localStorage. Também determinou que a troca de organização
em uma aba sincronize as demais e recarregue seu conteúdo. Esses pontos deixam de
estar em aberto no ADR 0003; suas outras propostas não são aprovadas por este ADR.

## Decisão

- Guardar access, refresh e o resumo mínimo de usuário em uma única chave versionada
  `dsc_session_v1` no localStorage. Um identificador local de sessão distingue novos
  logins, inclusive da mesma conta; ele não é credencial nem é enviado à API.
- Manter `Authorization: Bearer` e os endpoints JSON existentes. Sem cookies de
  autenticação, BFF ou sessões Django nesta etapa.
- Guardar a organização ativa em `dsc_active_context_v1`, também no localStorage,
  com UUID, nome e UUID do usuário proprietário. O contrato é resolvido no backend.
- Sincronizar via evento nativo `storage`. Troca de organização limpa caches e
  recarrega as outras abas. Confirmar a seleção abre uma página nova na própria
  aba. Atualização somente do nome não exige recarregamento.
- Novo login/logout em outra aba também recarrega o conteúdo. Rotação dos tokens
  da mesma sessão atualiza o estado em memória sem recarregar a tela.
- Coordenar refresh e logout com Web Locks da mesma origem. Uma aba lê os tokens
  mais recentes depois de obter o lock; reutiliza uma renovação já concluída.
  Pedidos simultâneos na mesma aba compartilham uma única renovação.
- Renovar sob demanda, perto da expiração ou após 401 de autenticação, com no
  máximo uma repetição da requisição. Sem polling ou refresh por navegação.
- Anexar credenciais somente à origem e ao prefixo exatos da API. Sem header de
  organização em auth, seleção de organização ou endpoints administrativos.
  Respostas de sessão/organização anterior não atualizam o contexto novo.
- Desabilitar o interceptor ETag global herdado: seu cache por URL não separa
  contas/organizações nem respeita adequadamente respostas no-store.
- Resumo de permissões do Spatial fica desabilitado: o Core não possui esse
  endpoint. O frontend nega operações dependentes desse resumo; o superadmin usa
  a área administrativa. RBAC real continua aplicado pelo backend.

## Alternativas consideradas

- sessionStorage: substituído pela escolha explícita do usuário por localStorage.
- Cookies HttpOnly: avaliados, mas não adotados. Exigiriam transporte por cookie,
  proteção CSRF, inicialização da sessão e novos contratos de autenticação.
- BFF/sessões Django: não adotados; não necessários para executar a decisão atual.

## Consequências

- Login e organização são comuns às abas da mesma origem/perfil. Não há organizações
  diferentes por aba. A troca recarrega páginas e pode descartar formulários abertos.
- JWT permanece acessível ao JavaScript: um XSS pode exfiltrar credenciais. Não há
  promessa de proteção HttpOnly. Evitar HTML inseguro e scripts não confiáveis;
  HTTPS e headers/CSP de implantação continuam necessários antes de produção.
- Web Locks exige contexto seguro (HTTPS ou localhost) e navegador compatível.
  Sem suporte, a renovação falha explicitamente; o logout ainda limpa o estado local
  e informa quando a revogação não pôde ser confirmada. Não há fallback com corrida.
- Decodificar `exp` serve somente à UX; assinatura, conta, contrato e permissões
  são validados no backend. Logout revoga o refresh; access já emitido conserva
  sua validade curta, como no ADR 0004.
- No uso cotidiano, signals fornecem sessão/contexto sem JSON.parse/storage por
  requisição. Locks e escritas de tokens ocorrem somente nos fluxos de autenticação.
- Dev usa `/api/v1` via proxy Angular para `127.0.0.1:8000`; não abre CORS no backend.
  URLs de homologação/produção ainda precisam ser configuradas.

## Referências

- [MDN — localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
- [MDN — storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event).
- [MDN — Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).
- [Angular — segurança](https://angular.dev/best-practices/security).
