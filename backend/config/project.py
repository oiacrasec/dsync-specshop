"""Apps do projeto derivado (ADR 0036, item 5): arquivo do projeto, vazio no core.

Cada projeto derivado lista aqui os próprios apps; o core nunca altera este arquivo e,
em conflito de merge, vale a versão do projeto.
"""

PROJECT_APPS: list[str] = [
    'apps.catalog',
]
