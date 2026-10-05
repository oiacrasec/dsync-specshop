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
