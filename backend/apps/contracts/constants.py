"""Campos de configuração auditáveis, sem nome do cliente."""

PLAN_AUDIT_FIELDS = (
    'is_active',
    'max_organizations',
    'max_storage_bytes',
    'max_integrations',
    'max_operations_per_month',
)
CONTRACT_AUDIT_FIELDS = ('is_active', 'plan', 'start_date', 'end_date', 'licenses', 'post_termination_retention_days')
