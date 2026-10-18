> **Herdado do datasync-gis (etapa 6.1).** Descreve a arquitetura do template ajustado.
> Trechos sobre a API do Spatial, telas geoespaciais e `permissoes-contexto` deixam de valer
> à medida que as telas forem adaptadas à API do core (etapas 6.5 e 6.8, concluídas; contratos usam `public_id`, `search` e options do Core).

# Padrões Frontend (datasync-gis)

## Arquitetura base

- Angular standalone + PrimeNG.
- Rotas em `src/app.routes.ts`.
- Core transversal em `src/app/core/*`.
- UI compartilhada em `src/app/shared/ui/*`.

## Sessao, contexto e permissao

**Core, etapa 6.5 (ADR 0035):** JWT e organização UUID em localStorage. Organização
compartilhada e recarregamento entre abas; refresh/logout coordenados por Web Locks.
Interceptors registrados: `contextErrorInterceptor` envolvendo `authInterceptor`.
`etagInterceptor` global desabilitado: cache só por URL não separa conta/contexto.
`PermissionContextService` legado desabilitado (nega por padrão, sem chamada HTTP):
o Core ainda não tem endpoint de resumo. O fluxo abaixo é referência GIS, não
contrato ativo. Detalhes: [autenticação Core](../architecture/authentication.md).

Servicos centrais:

- `AuthSessionService`: tokens, expiracao, usuario.
- `UserContextService`: contexto ativo e persistencia.
- `PermissionContextService`: cache/snapshot de permissoes por contexto.

Interceptors:

1. `authInterceptor` (JWT + contexto)
2. `etagInterceptor` (cache GET)
3. `context-error.interceptor` (reset de contexto em 400/403 de contexto)

Guards:

- `accessGuard`: audiencia, auth, contexto e primeiro acesso.
- `permissionGuard`: valida permissao declarada na rota.

## Padrao de telas de dominio

- Services de dominio herdam `BaseCrudService`.
- Listas usam `UiTable` com `service.list(query)`.
- `columns` e `filters` vindos do backend (schema dinamico).
- Acoes de CRUD condicionadas por permissao via `resolveCrudPermissions`.
- Fluxo geoespacial operacional no MVP:
  Banco geoespacial -> GeoServer (aba "Bancos vinculados") -> Workspace -> Store.
- `Workspace` seleciona apenas `GeoServer`.
- `Store` seleciona o banco geoespacial, filtrado pelos vinculos ativos do GeoServer do workspace.
- `Mapa` e cabecalho: exige `store` e dados de visibilidade/SRID; `geom_type` nao pertence ao formulario do cabecalho.
- Campos tecnicos de layer ficam no editor de mapa, consumindo:
  `GET|POST /mapeditor/mapas/{id}/layers/` e `PATCH|DELETE /mapeditor/mapas/{id}/layers/{layer_id}/`.
- Metadados de colunas extras no editor consomem:
  `GET|POST /mapeditor/mapas/{id}/layers/{layer_id}/colunas/` e `DELETE .../colunas/{column_name}`.

## Editor de mapa (fluxo atual)

- O editor usa estado de layers vindo da API (sem mock), incluindo criar layer, alternar visibilidade, remover layer, desenhar feicoes e editar atributos.
- Renderizacao do mapa usa imagem WMS por layer via proxy backend (`/mapeditor/.../wms/`).
- Como `TileWMS` do OpenLayers nao passa pelo `HttpClient`, o carregamento de tiles deve anexar autenticacao/contexto via `tileLoadFunction` (JWT + `X-Contrato-Id` + `X-Organizacao-Id`) quando o endpoint proxy exigir auth.
- `refreshWmsLayer` deve forcar mudanca de query param (`_ts`) e `source.refresh()` para invalidar grade de tile no cliente apos mutacoes.
- O `tileLoadFunction` aplica controle de concorrencia (cancelamento de request anterior + token da requisicao) para evitar tile antigo sobrescrevendo tile novo apos salvar/editar/remover feicao.
- CRUD de feicoes do layer usa `/mapeditor/.../features/` (backend gerencia persistencia/validacao).
- Fluxo de edicao geometrica no mapa e hibrido:
  WMS para exibicao continua do layer inteiro + overlay vetorial temporario (`GeoJSON`) apenas para a feicao em edicao.
- A selecao de feicao para edicao geometrica pode vir por clique no mapa (hit test por bbox + API de features) e a opcao de grid permanece como apoio.
- Ao concluir/abandonar a edicao geometrica no mapa (ex.: clique fora), o frontend persiste a geometria, faz refresh do WMS e remove o overlay vetorial.
- Remocao de feicao pode ser iniciada pela grid, pelo atalho `Delete` ou pelo menu flutuante da feicao, sempre com confirmacao explicita.
- Criacao de feicao com atributos:
  ao finalizar o desenho, abre dialogo de atributos; campos obrigatorios sao validados na UI;
  se o usuario cancelar, o desenho e desfeito; ao salvar, envia `geometry + attributes` no mesmo `POST /features/`.
- Quando nao houver campos obrigatorios no layer, o formulario de atributos pode ser salvo em branco.
- A listagem de feicoes do layer foi migrada de modal para drawer dentro do mapa:
  painel lateral movel, recolhivel e redimensionavel (desktop), mantendo paginacao de 10 registros por pagina.
- O menu de acao da feicao e flutuante, movel, minimizavel e posicionado abaixo do menu de layers.
- O menu principal do editor inclui acao de fullscreen do mapa (`Entrar em tela cheia` / `Sair de tela cheia`).
- Em fullscreen, overlays (`Dialog`, `ConfirmDialog`, `Toast`) devem usar `appendTo` compativel com o container fullscreen para manter renderizacao correta.
- Na abertura do editor, pode haver auto-fit inicial nas feicoes de layers visiveis/ativos para melhorar a navegacao inicial.
- A lista de mapas tem acao "Abrir mapa" para `/pages/geoespacial/mapas/:id/editor` (rota interna, sem novo item no menu).
- Nao existe etapa de publicacao separada no fluxo inicial; o cadastro e manutencao de layers ocorre diretamente no editor.

## Menus e navegacao

- Menu lateral filtra itens por permissao (`app.menu.ts`).
- `GeoServer x Banco` nao fica como menu dedicado; a gestao fica na tela de `GeoServer` em aba especifica.
- Usuario comum deve passar por `/contexto/selecao` antes de modulos de negocio.
- `superuser` segue fluxo administrativo sem seletor comum.
- Itens de menu de exemplos (`Apps`, `UI Kit`, `Prime Blocks`, `Utilities`, `E-commerce`, `Hierarchy`, `Start`) permanecem roteaveis, mas ocultos do menu principal.

## Padrao visual e UX atual

- Telas de dominio usam container padrao:
  `flex flex-col gap-6 bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden p-4 lg:p-6`.
- Cabecalho de pagina usa `dss-page-header` com separador inferior.
- Breadcrumb usa `p-breadcrumb` (PrimeNG), com apenas `Home` clicavel.
- Breadcrumb fica oculto em `/contexto/selecao`.
- Nome da organizacao ativa e exibido no `sidebar-header` com truncamento por elipse (`...`) para nomes longos e atualizacao reativa na troca de contexto.
- `layout-topbar`, `layout-content` e `layout-footer` mantem alinhamento de padding entre si (desktop e mobile).
- Estado ativo do menu lateral e controlado por token (`--d-menuitem-active-bg`) para ajuste centralizado de contraste.

## Componentes compartilhados

- `UiTable`:
  coluna de acoes com label padrao `Ações`; menu de linha com `pi pi-ellipsis-h` e `severity="secondary"`.
- `UiTable`:
  paginacao centralizada e relatorio (`Mostrando ...`) alinhado a direita; em mobile o relatorio quebra para a linha de baixo.
- `UiTable`:
  seletor de paginas do paginator usa append para `body`.
- `UiFilter`:
  busca geral com icone de pesquisa e painel de filtros avancados com tonalidade leve integrada ao tema.
- Componentes com overlay (select/autocomplete/dialog/confirm/toast/menu) devem preferir `appendTo="body"` ou alvo fullscreen quando aplicavel.

## Convencoes importantes

- Nao anexar headers de contexto em endpoints de auth/contexto.
- Nao duplicar regra de autorizacao no frontend alem de guard/visibilidade.
- Sempre limpar cache relevante em mutacoes e troca de contexto.
- Nao hardcodar schemas de tabela/filtro quando API ja entrega dinamicamente.
- Em requests de imagem/tile disparados fora do `HttpClient` (OpenLayers/DOM APIs), lembrar que interceptors Angular nao serao aplicados.
- Textos de apoio de campo devem usar `helpText` em componentes compartilhados (`ui-autocomplete`, `ui-input-text`, `ui-input-number`, `ui-input-password`, `ui-input-date`, `ui-multi-select`, `ui-checkbox`), evitando `<small>` solto no formulario.
- Em formularios com abas, `Observação` deve ser sempre a ultima aba.
