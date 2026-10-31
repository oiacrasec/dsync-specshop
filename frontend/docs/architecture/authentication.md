# Autenticação e organização — Core

Implementado na etapa 6.5, conforme ADR 0035 da documentação global.

## Fluxo

```text
login → POST /api/v1/auth/login/ → access + refresh + user
  superadmin → /dashboards (sem organização)
  comum marcado → trocar senha → resumo user atualizado → selecionar organização
  comum → GET /api/v1/me/organizations/ → selecionar UUID → abrir conteúdo
         (só uma organização ativa e ainda não ativa → entra direto, sem mostrar a seleção)

requisição → Bearer + X-Organization-Id (somente área de negócio)
access expirando → lock entre abas → refresh único → repetir pedido, no máximo uma vez
troca de organização → localStorage → evento storage → limpar caches e recarregar abas
logout → lock entre abas → limpar estado → revogar refresh mais recente
```

`AuthService` apenas chama a API. `AuthSessionService` mantém o resumo/tokens em signal
e localStorage; `UserContextService` mantém organização, proprietário e caches.
Interceptors limitam credenciais à API correta e tratam tipos RFC 9457. Guards são
UX; a autorização continua no backend. Permissões para menu e botões vêm de
`GET /api/v1/me/permissions/` (`PermissionContextService`, uma vez por sessão e organização).

## Persistência e concorrência

- `dsc_session_v1`: access, refresh, resumo mínimo de user e identificador local de sessão.
- `dsc_active_context_v1`: UUID/nome da organização e UUID da conta proprietária.
- Organização não é separada por aba: trocar recarrega inclusive a aba que confirmou.
  Formulários não salvos podem ser descartados. Alterar apenas o nome não recarrega.
- `storage` atualiza outras abas; trocar login/logout exige recarregar, renovar não.
- Web Locks serializa rotação/logout; nova sessão impede que resposta antiga restaure
  credenciais. Rede limitada a 15s nesses fluxos; espera do lock limitada a 20s.
- Web Locks precisa de contexto seguro e suporte do navegador. Sem suporte, não
  executar refresh concorrente como fallback; solicitar novo login. Logout limpa
  localmente mesmo se não confirmar revogação. Access emitido expira conforme backend.
- JWT em localStorage é acessível ao JavaScript e exposto a exfiltração por XSS;
  a decisão não oferece a proteção de HttpOnly. HTTPS, headers/CSP e revisão de
  scripts fazem parte da implantação antes de produção. Não incluir tokens em logs/URLs.
- `exp` decodificado só prevê renovação; não valida assinatura nem concede permissão.

## Erros e telas

401 de autenticação permite uma renovação/repetição. Rejeição definitiva ou contrato
indisponível encerra a sessão. `password-change-required` limpa organização e abre
primeiro acesso. Erros de contexto voltam à seleção; 403 de permissão não apaga sessão.
422 mostra `errors`; payload não reconhecido usa mensagem segura. Respostas de sessão
ou organização anterior são descartadas. Confirmar a organização exige um UUID da
lista acessível, mas isso não substitui a validação RBAC do backend.

`/contexto/selecao` usa `AuthLayout`, sem menu, como etapa centralizada do login.
No sistema, avatar → **Trocar organização** abre um `p-dialog` sobre a página atual.
Cancelar, X ou Esc fecham o modal e devolvem o foco ao avatar, sem mudar contexto/URL.
Confirmar uma organização diferente mantém `setActiveContext/openContext` e o
recarregamento entre abas (ADR 0035); confirmar a já ativa apenas fecha o modal.

`UiOrganizationPicker` compartilha cartões com rádios nativos nas duas apresentações.
A organização ativa recebe a tag **Atual** no modal. Acima de 7 organizações, busca
local por nome ignora maiúsculas/acentos; a seleção permanece ao filtrar e o botão
usa o rótulo fixo **Entrar**. Lista com até 350 px e rolagem interna, mantendo busca/ações
fora da rolagem; estado vazio permite limpar a busca. Cada abertura busca a lista
uma vez; digitar não acessa a API. Destroy cancela HTTP pendente e a revisão da sessão
impede aplicar resposta antiga. Falhas mostram mensagem segura e permitem tentar novamente.

Senhas: autocomplete apropriado, mínimo de 12 caracteres e confirmação na UI;
validadores completos continuam no Django. Senhas não entram no storage e campos
são limpos após sucesso. Forms usam submit, labels e mensagens `role=alert`;
seleção usa rádios nativos com foco visível nos cartões. Não foi realizada auditoria
WCAG completa com leitor de tela nesta etapa.

## Validação e performance

44 testes em ChromeHeadless: isolamento de headers, refresh compartilhado em uma
aba e entre dois serviços independentes, rejeição/rotação/logout, sessão nova,
resposta antiga, organização, evento storage real de outro contexto do navegador,
login/primeiro acesso/seleção/guards, templates zoneless e apresentação RFC 9457. Testes simulam HTTP;
não constituem ensaio end-to-end com duas abas e banco real.

Probe de 30 pedidos cotidianos: nenhuma leitura/gravação de storage e nenhum refresh.
Sem polling, listener removido no destroy, uma renovação compartilhada por vez.
Bundle inicial medido ~1,25 MB (~257 KB de transferência estimada), mantendo orçamento.
Não foi realizado ensaio de capacidade sob carga. Sem alteração de queries/locks
do backend ou da cobertura de AccessLog (autenticação apenas, ADR 0019).

Revisão A01–A10: origem/prefixo exatos, contexto UUID, autorização no backend,
sem HTML inseguro, segredos/logs, novas dependências ou caches entre tenants.
Limitações conhecidas: JWT acessível a JS por decisão explícita; MFA, infraestrutura,
retenção/expurgo e adequação jurídica de AccessLog permanecem pendências anteriores.

Dev: API relativa com proxy Angular; homol/prod aguardam URL. Cache ETag global por
URL fica desabilitado até revisão de isolamento/no-store. Contratos adaptados na 6.8 (README).

## Validação da melhoria de seleção (2026-10-31)

120 testes ChromeHeadless: cenário com 100 organizações, busca sem HTTP adicional,
seleção preservada, rolagem interna/rodapé estável, limiar 7/8, nomes escapados,
falha/retry, resposta antiga, cancelamento da requisição ao destruir e modal sem navegar.
Chrome com API simulada: desktop 1280 × 900 e login móvel 320 × 800 sem rolagem horizontal;
lista de 350 px; Esc fecha e devolve foco ao avatar, preservando URL/contexto.
Não constitui E2E com banco real nem auditoria WCAG completa. Nenhuma nova dependência,
API, query ou lock no backend. Busca normaliza nomes por carregamento, usa computed
por texto e renderização rastreada por public_id.

O diálogo do topo deve ser irmão de `.layout-topbar`, fora do seu flex. Dentro dele,
o host do p-dialog fechado ocupa espaço e desloca busca/notificações/avatar. Regressão
IM03 coberta por teste de geometria; Chrome conferido em 390/1280/1920 px, antes de abrir,
com modal aberto e após Esc (14 px de margem direita).

## 2FA opcional — etapa 9.4

Login aceita prova temporária de senha e exibe segundo passo apenas para MFA confirmado
(TOTP ou código reserva). Prova/códigos só em memória, sem sessão até a resposta final;
requisição cancelada ao destruir, resposta de sessão antiga ignorada.
`/auth/login/mfa/` é pública, sem Bearer/contexto; /me/mfa/ usa JWT sem organização.

Perfil → Verificação em duas etapas renderiza MfaSettings apenas ao abrir a aba,
sem busca no carregamento cotidiano. MFA é opcional. QR local via qrcode, sem serviço
externo; reservas em memória, download explícito e confirmação de guarda antes de
limpar AuthSessionService e voltar ao login. Desativação pede senha+código e sai após
sucesso. Mudanças revogam todos os refresh no servidor; access já emitido dura até
15 min conforme decisão 83. Reset com confirmação nas ações de Usuários e Admins do
contrato; autorização e isolamento são revalidados no backend. Ver ADR 0041.
