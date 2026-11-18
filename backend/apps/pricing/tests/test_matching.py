"""Correspondência com nomes reais do catálogo do Mercado Livre vistos em 18/11/2026."""

import pytest

from apps.catalog.models import TrackedProduct
from apps.pricing import matching


def product(name, model, brand=''):
    return TrackedProduct(name=name, model=model, brand=brand)


@pytest.mark.parametrize(
    ('text', 'model', 'expected'),
    [
        ('Impressora multifuncional cor Epson EcoTank L3250', 'L3250', True),
        ('L-3250', 'L3250', True),  # atributo MODEL escrito com hífen
        ('Impressora Epson L32505', 'L3250', False),  # outro dígito colado
        ('Impressora Epson L4260', 'L3250', False),
        ('Celular Samsung Galaxy S24 5g 8gb Ram 128gb S921b Cor Creme', 'SM-S921B', True),  # núcleo do código
        ('Flexor Main compatível com Samsung S24 SM-S921b Flex Main', 'SM-S921B', True),
        ('Celular Samsung Galaxy S24 Fe 128gb Graphite SM-S721bzkllep', 'SM-S921B', False),  # FE tem outro código
        ('Samsung Galaxy S24 128gb 8gb cor amarela', 'S24', True),
        # Sem listas por categoria: nome comercial como modelo não separa irmãos (F-1 resolve).
        ('Samsung Galaxy S24 Fe 5g 128gb', 'S24', True),
    ],
)
def test_model_matches_whole_word(text, model, expected):
    assert matching.model_matches(text, model) is expected


def test_model_core_only_when_prefix_is_letters_and_core_has_digits():
    assert matching.model_variants('SM-S921B') == ['SMS921B', 'S921B']
    assert matching.model_variants('L3250') == ['L3250']
    assert matching.model_variants('XL 2') == ['XL2']  # núcleo curto demais não vale
    assert matching.model_variants('AB CD') == ['ABCD']  # núcleo sem dígito não vale


@pytest.mark.parametrize(
    ('wanted', 'found', 'expected'),
    [('Epson', 'EPSON', True), ('Epson', 'Rodtec', False), ('Epson', '', True), ('', 'Genesis', True)],
)
def test_brand_restricts_only_when_both_are_known(wanted, found, expected):
    assert matching.brand_matches(wanted, found) is expected


def test_capacity_in_the_registered_name_restricts():
    s24_256 = product('Smartphone Samsung Galaxy S24 256GB', 'SM-S921B')
    assert matching.capacity_matches(s24_256, 'Samsung Galaxy S24, roxo, 8gb_256gb') is True
    assert matching.capacity_matches(s24_256, 'Samsung Galaxy S24 Galaxy Ai 256GB Preto 8GB RAM') is True
    assert matching.capacity_matches(s24_256, 'Samsung Galaxy S24 Galaxy AI 128 GB Creme 8 GB RAM') is False
    # Sem capacidade no cadastro, todas as variações entram (a variação fica no título).
    assert matching.capacity_matches(product('Galaxy S24', 'SM-S921B'), 'Galaxy S24 512gb') is True


@pytest.mark.parametrize(
    ('title', 'expected'),
    [
        ('Kit 02 Impressoras Multifuncionais Epson Ecotank L3250 Wifi', True),
        ('Kit com 3 impressoras Epson L3250', True),
        ('Impressora Epson L3250 - 2 unidades', True),
        ('Impressora 3x1 Multifuncional Epson Ecotank L3250 Wifi Bivol Preto', False),  # 3 em 1, não 3 unidades
        ('Impressora Ecotank Epson L3250 + 01 Kit Tinta T544 Cor Preta', False),  # adicional: pendente de decisão
        ('Impressora multifuncional cor Epson EcoTank L3250', False),
    ],
)
def test_multi_unit_is_detected_only_by_explicit_patterns(title, expected):
    assert matching.is_multi_unit(title) is expected
