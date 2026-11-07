"""Constantes da pesquisa de preços: só valores literais."""

# Empresas distintas que precisam enviar a mesma oferta coletada pelo navegador para ela entrar
# no histórico global (ADR 2003 §3). Começa em 1 (poucos clientes); variável
# SPECSHOP_BROWSER_CONFIRMATIONS sobe o valor sem mudar código.
BROWSER_CONFIRMATIONS_DEFAULT = 1
BROWSER_CONFIRMATIONS_ENV = 'SPECSHOP_BROWSER_CONFIRMATIONS'
