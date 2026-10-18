"""Constantes de users: só valores literais."""

# Campos que mexem em papel, contrato, licença ou último admin (save_user).
RULE_FIELDS = frozenset({'is_active', 'is_superuser', 'contract', 'contract_id', 'deleted_at'})

# Limite exclusivo da troca de senha autenticada, antes do hash e do lock.
AUTH_CHANGE_RATE = '5/min'

# Senha temporária do provisionamento/reset: devolvida uma vez, nunca gravada em claro.
TEMPORARY_PASSWORD_LENGTH = 16
TEMPORARY_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*-_=+?'  # noqa: S105 alfabeto
TEMPORARY_PASSWORD_ATTEMPTS = 10
