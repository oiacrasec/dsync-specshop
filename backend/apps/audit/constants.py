"""Constantes da auditoria: só valores literais."""

# Atributo da requisição que marca a entrada do superadmin para o middleware gravar.
ENTRY_ATTRIBUTE = '_dsc_superadmin_entry'

# Registro de acesso (Marco Civil art. 15): guarda mínima antes do expurgo (ADR 0007 §4.2).
ACCESS_LOG_MINIMUM_RETENTION_MONTHS = 6
# Só requisições da API entram no registro de acesso.
ACCESS_LOG_PATH_PREFIX = '/api/'
