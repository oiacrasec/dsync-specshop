"""Constantes da auditoria: só valores literais."""

# Atributo da requisição que marca a entrada do superadmin para o middleware gravar.
ENTRY_ATTRIBUTE = '_dsc_superadmin_entry'
AUTH_ACCESS_ATTRIBUTE = '_dsc_auth_access'

# Registro de acesso (Marco Civil art. 15): guarda mínima antes do expurgo (ADR 0007 §4.2).
ACCESS_LOG_MINIMUM_RETENTION_MONTHS = 6
