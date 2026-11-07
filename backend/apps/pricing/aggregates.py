"""Agregados de preço que o ORM não oferece."""

from django.db.models import Aggregate, DecimalField


class Median(Aggregate):
    """Mediana contínua do PostgreSQL (`percentile_cont(0.5)`); com quantidade par, média dos centrais."""

    function = 'PERCENTILE_CONT'
    name = 'Median'
    template = '%(function)s(0.5) WITHIN GROUP (ORDER BY %(expressions)s)'
    output_field = DecimalField(max_digits=12, decimal_places=2)
