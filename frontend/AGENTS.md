# AGENTS.md — frontend

Regras do frontend do datasync-core. As regras globais estão no `AGENTS.md` da raiz
(skills, `questionador`, conformidade legal, performance, PT-BR).

- Projeto autônomo: nunca importar arquivos do `backend/`; comunicação só pela API HTTP
  (contratos em `../docs/api/`, erros RFC 9457 em `../docs/api/errors.md`).
- Base copiada do datasync-gis (etapa 6.1). O repositório `datasync-gis` é só referência:
  não copiar contratos do Spatial (rotas em português, `id` inteiro, formato de erro próprio).
- Identificadores externos são `public_id` (UUID v7); contexto pelo header `X-Organization-Id`.
- Telas fora do escopo ficam comentadas nas rotas e no menu com a marca
  `// DESABILITADO: fora do escopo atual`. Reativar só com aprovação do usuário.
- Preservar guards e interceptors centrais; segurança real fica no backend (o guard é UX).
- Código em inglês nos novos arquivos; textos ao usuário em português.
- Antes de entregar: `npm run lint`, `npm run format:check` e `npm run build` sem erros.
- Ao reativar uma tela desabilitada, remova-a dos `ignores` do `eslint.config.mjs` e corrija o lint dela.
- Indentação: 4 espaços (`.editorconfig` e `.prettierrc.json`), igual ao backend.
- JWT e organização ativa em localStorage (ADR 0035); mudança de organização sincroniza
  as abas e recarrega seu conteúdo. Refresh/logout usam Web Locks; sem polling.
- Sessão/contexto em memória no uso cotidiano; não ler/decodificar storage por requisição.
- Só anexar credenciais à origem/prefixo exatos da API. Respostas anteriores à troca
  de sessão/contexto não podem atualizar o conteúdo novo. ETag global legado desabilitado.
- Padrões herdados: `docs/standards/patterns-frontend.md` (revisar ao adaptar cada tela).
- Reuso antes de tela: mapeamento, constante ou helper que serviria a outra tela não fica no
  service/componente da feature. Contrato do Core → componentes em `core/utils/table-schema.ts`;
  listagens/options pelo `BaseCrudService` (`listTable`, `lookupOptions`). Antes de criar, procurar
  em `core/` e `shared/` o que já existe.
- URLs da API só a partir do `API_BASE_URL` (`core/utils/api-url.ts`: `apiEndpoint`, `apiPath`,
  `serverUrl`). Nunca fixar prefixo (`/api/v1`), host ou versão em services/utilitários.
- i18n: o backend envia dado bruto e tipo semântico (ex.: coluna `date`), nunca máscara ou formato.
  O frontend formata pelo `LOCALE_ID` (pt-BR); `format` explícito só em exceção justificada.
- Identificador de rota ou payload que vai para um caminho da API: validar o formato (UUID,
  `UUID_PATTERN`) e montar o caminho com `encodeURIComponent` (client-side path traversal).
- Menu, guards e botões por permissão só via `PermissionContextService` (`/me/permissions/`) e
  `PERMISSION_KEYS` com os códigos do registry do Core; nunca liberar ação por padrão no front.
- Padrões dos componentes (20 linhas, `public_id`) ficam nos componentes; telas não repetem.
- Formulários: campos dentro de `p-tabs` com a aba **Principal** (`value="principal"`), como o de
  contratos; seções extras (ex.: Permissões) viram outras abas. Cabeçalho, Voltar e os botões
  Cancelar/Salvar ficam fora das abas.
- URL de mídia (foto, anexos) só via `mediaUrl` (`core/utils/media-url.ts`); telas não montam `src`.
- Ícones: Font Awesome por classe (`fa-solid fa-*`) nas telas e componentes próprios; PrimeIcons
  continua nos componentes do PrimeNG. Não remover a atribuição de licença (README, Ícones).
- Redirecionamento por parâmetro (`returnUrl`): só via `safeReturnPath` (`core/utils/return-url.ts`);
  nunca validar URL de destino por regex/texto (open redirect).
