"""Constantes da pesquisa de preços: só valores literais."""

# Empresas distintas que precisam enviar a mesma oferta coletada pelo navegador para ela entrar
# no histórico global (ADR 2003 §3). Começa em 1 (poucos clientes); variável
# SPECSHOP_BROWSER_CONFIRMATIONS sobe o valor sem mudar código.
BROWSER_CONFIRMATIONS_DEFAULT = 1
BROWSER_CONFIRMATIONS_ENV = 'SPECSHOP_BROWSER_CONFIRMATIONS'

# Fontes aceitas na pesquisa e o rótulo exibido (ADR 2001; o conector de cada uma é registrado à parte).
SOURCE_LABELS = {'mercado_livre': 'Mercado Livre'}

# Limite de produtos por pesquisa (D-25, RF-29).
MAX_PRODUCTS_PER_SEARCH = 10

# Linha "pesquisando" há mais que isso (tela fechada, processo reiniciado) pode ser refeita.
STALE_RUN_SECONDS = 120

# UFs do Brasil para o filtro de origem do vendedor (D-22, RF-24).
BRAZIL_STATES = frozenset(
    {
        'AC',
        'AL',
        'AM',
        'AP',
        'BA',
        'CE',
        'DF',
        'ES',
        'GO',
        'MA',
        'MG',
        'MS',
        'MT',
        'PA',
        'PB',
        'PE',
        'PI',
        'PR',
        'RJ',
        'RN',
        'RO',
        'RR',
        'RS',
        'SC',
        'SE',
        'SP',
        'TO',
    }
)

# Eventos de auditoria da pesquisa (ADR 0017); o core grava o código como texto.
SEARCH_CREATED = 'search.created'

# Conector do Mercado Livre (ADR 2002, etapa 3.1). Credenciais só por variável de ambiente.
ML_SOURCE = 'mercado_livre'
ML_CLIENT_ID_ENV = 'ML_CLIENT_ID'
ML_CLIENT_SECRET_ENV = 'ML_CLIENT_SECRET'  # noqa: S105 (nome da variável, não o segredo)
ML_API_URL = 'https://api.mercadolibre.com'
ML_SITE_ID = 'MLB'
ML_CURRENCY = 'BRL'
ML_REQUEST_TIMEOUT_SECONDS = 10
# Token da aplicação dura 6 h; renova com folga para não expirar no meio de uma pesquisa.
ML_TOKEN_RENEW_MARGIN_SECONDS = 300
# /products/search aceita ~1 chamada a cada 10 s (medido em 2026-11-18; 429 local_rate_limited).
# A linha espera a vez no máximo esse tempo: worker síncrono não pode ficar preso (timeout 60 s).
ML_SEARCH_INTERVAL_SECONDS = 10
ML_SEARCH_SLOT_WAIT_SECONDS = 10
ML_RATE_LIMIT_COOLDOWN_SECONDS = 15
ML_SEARCH_PAGE_SIZE = 50
# Produtos de catálogo consultados por produto e páginas de ofertas (100 por página) por produto.
ML_MAX_CATALOG_PRODUCTS = 20
ML_OFFERS_PAGE_SIZE = 100
ML_MAX_OFFER_PAGES = 3
# Produto -> produtos de catálogo muda pouco; o cache poupa a busca limitada nas próximas pesquisas.
ML_CATALOG_CACHE_SECONDS = 24 * 60 * 60
ML_CATALOG_MISS_CACHE_SECONDS = 60 * 60

# UF pelo nome do estado: o Mercado Livre devolve `state.id` opaco ou vazio (medido em 2026-11-18).
BRAZIL_STATE_BY_NAME = {
    'ACRE': 'AC',
    'ALAGOAS': 'AL',
    'AMAPA': 'AP',
    'AMAZONAS': 'AM',
    'BAHIA': 'BA',
    'CEARA': 'CE',
    'DISTRITO FEDERAL': 'DF',
    'ESPIRITO SANTO': 'ES',
    'GOIAS': 'GO',
    'MARANHAO': 'MA',
    'MATO GROSSO': 'MT',
    'MATO GROSSO DO SUL': 'MS',
    'MINAS GERAIS': 'MG',
    'PARA': 'PA',
    'PARAIBA': 'PB',
    'PARANA': 'PR',
    'PERNAMBUCO': 'PE',
    'PIAUI': 'PI',
    'RIO DE JANEIRO': 'RJ',
    'RIO GRANDE DO NORTE': 'RN',
    'RIO GRANDE DO SUL': 'RS',
    'RONDONIA': 'RO',
    'RORAIMA': 'RR',
    'SANTA CATARINA': 'SC',
    'SAO PAULO': 'SP',
    'SERGIPE': 'SE',
    'TOCANTINS': 'TO',
}
