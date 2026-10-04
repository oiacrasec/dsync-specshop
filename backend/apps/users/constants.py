"""Constantes de users: só valores literais."""

# Campos que mexem em papel, contrato, licença ou último admin (save_user).
RULE_FIELDS = frozenset({'is_active', 'is_superuser', 'contract', 'contract_id', 'deleted_at'})

# Limite exclusivo da troca de senha autenticada, antes do hash e do lock.
AUTH_CHANGE_RATE = '5/min'
