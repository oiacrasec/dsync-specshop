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
