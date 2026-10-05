# Autenticação e organização — Core

Implementado na etapa 6.5, conforme ADR 0035 da documentação global.

## Fluxo

```text
login → POST /api/v1/auth/login/ → access + refresh + user
  superadmin → /kpi (sem organização)
  comum marcado → trocar senha → resumo user atualizado → selecionar organização
  comum → GET /api/v1/me/organizations/ → selecionar UUID → abrir conteúdo

requisição → Bearer + X-Organization-Id (somente área de negócio)
access expirando → lock entre abas → refresh único → repetir pedido, no máximo uma vez
troca de organização → localStorage → evento storage → limpar caches e recarregar abas
logout → lock entre abas → limpar estado → revogar refresh mais recente
```

`AuthService` apenas chama a API. `AuthSessionService` mantém o resumo/tokens em signal
e localStorage; `UserContextService` mantém organização, proprietário e caches.
Interceptors limitam credenciais à API correta e tratam tipos RFC 9457. Guards são
UX; a autorização continua no backend. Não há chamada ao resumo de permissões do GIS.

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

Senhas: autocomplete apropriado, mínimo de 12 caracteres e confirmação na UI;
validadores completos continuam no Django. Senhas não entram no storage e campos
são limpos após sucesso. Forms usam submit, labels e mensagens `role=alert`;
seleção usa controle nativo acessível por teclado. Não foi realizada auditoria
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
URL fica desabilitado até revisão de isolamento/no-store. Contratos: adaptar na 6.8.
