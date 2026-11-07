"""Partições mensais da base global de preços (ADR 2003 §2, decisão 2 da 2.1).

A filha do mês é criada na primeira gravação daquele mês, junto com a do mês seguinte, e o
processo guarda em memória o que já garantiu: as demais gravações não executam DDL. A
partição DEFAULT da migration recebe as linhas se a criação falhar, sem derrubar a pesquisa.
"""

import logging
from datetime import date

from django.db import DatabaseError, connection, transaction

logger = logging.getLogger(__name__)

PARENT_TABLE = 'dsc_price_observation'
# Trava de transação do PostgreSQL para duas pesquisas simultâneas na virada do mês.
_PARTITION_LOCK = 2_003_002
_ensured: set[tuple[int, int]] = set()


def _next_month(year, month):
    return (year + 1, 1) if month == 12 else (year, month + 1)


def partition_name(year, month):
    return f'{PARENT_TABLE}_{year:04d}_{month:02d}'


def ensure_partitions(days):
    """Garante as filhas dos meses de `days` e do mês seguinte a cada um."""
    months = set()
    for day in days:
        months.add((day.year, day.month))
        months.add(_next_month(day.year, day.month))
    for year, month in sorted(months - _ensured):
        if _create_partition(year, month):
            _ensured.add((year, month))


def _create_partition(year, month):
    start = date(year, month, 1)
    end = date(*_next_month(year, month), 1)
    try:
        with transaction.atomic(), connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_xact_lock(%s)', [_PARTITION_LOCK])
            # Nomes e datas vêm do código (ano/mês inteiros), nunca da requisição.
            cursor.execute(
                f'CREATE TABLE IF NOT EXISTS {partition_name(year, month)} PARTITION OF {PARENT_TABLE} '  # noqa: S608
                f"FOR VALUES FROM ('{start.isoformat()}') TO ('{end.isoformat()}')"
            )
    except DatabaseError:
        # Ex.: a DEFAULT já tem linhas do mês. As novas continuam caindo nela.
        logger.warning('Partição %s não criada; as observações seguem na DEFAULT.', partition_name(year, month))
        return False
    return True


def forget_ensured_partitions():
    """Para testes: o banco de teste é recriado e a memória do processo precisa acompanhar."""
    _ensured.clear()
