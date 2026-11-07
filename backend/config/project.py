"""Apps do projeto derivado (ADR 0036, item 5): arquivo do projeto, vazio no core.

Cada projeto derivado lista aqui os próprios apps; o core nunca altera este arquivo e,
em conflito de merge, vale a versão do projeto.
"""

PROJECT_APPS: list[str] = []

# Registros técnicos do projeto fora dos tipos de escopo (`app_label.Model`), no padrão do
# AccessLog (ADR 0018): sem BaseModel, só inserção e leitura global explícita
# (`GlobalOnlyManager`). Exigem justificativa em ADR do projeto.
PROJECT_UNSCOPED_RECORDS: frozenset[str] = frozenset()
