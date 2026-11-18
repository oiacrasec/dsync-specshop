"""Correspondência entre o produto cadastrado e o que a fonte devolve (DT-04, etapa 3.2).

Regras textuais, iguais para todas as fontes, só com o que o PO definiu em `regras.md`
("comparar marca, modelo, geração, capacidade, unidade/embalagem"): na dúvida o produto
fica de fora, porque misturar o preço de outro aparelho é pior que perder uma oferta.
Cor e voltagem não restringem: o PO lista capacidade, não cor nem voltagem.

Sem listas por categoria (decisão de 18/11): texto não distingue variação de outro aparelho
("S24 Fe" × "S24, Galaxy Ai"). Irmãos se separam pelo código de fábrica como modelo, pela
família da fonte e, no caso geral, pela confirmação do usuário (melhoria F-1).
"""

import re
import unicodedata

from .constants import MODEL_CORE_MIN_LENGTH

_CAPACITY = re.compile(r'(\d+)\s*(GB|TB)\b')
# "Kit 02 Impressoras", "kit com 2", "2 unidades": preço de mais de uma unidade (unidade/embalagem).
_MULTI_UNIT = (
    re.compile(r'\bKIT\s+(?:COM\s+)?0*(?:[2-9]|[1-9]\d+)\b'),
    re.compile(r'\b0*(?:[2-9]|[1-9]\d+)\s+(?:UNIDADES|UNIDS?|UNS?)\b'),
)


def plain(text):
    """Sem acento e em maiúsculas."""
    return unicodedata.normalize('NFKD', text or '').encode('ascii', 'ignore').decode().upper()


def compact(text):
    """Só letras e dígitos: 'SM-S921B' e 'sm s921b' ficam iguais."""
    return re.sub(r'[^0-9A-Z]', '', plain(text))


def tokens(text):
    return re.findall(r'[0-9A-Z]+', plain(text))


def model_variants(model):
    """Formas aceitas do modelo: inteiro e, se começar por prefixo só de letras, o núcleo.

    'SM-S921B' -> ['SMS921B', 'S921B'] (o catálogo escreve "S921b"); 'L3250' -> ['L3250'].
    O núcleo só vale com dígito e pelo menos 4 caracteres, para continuar específico
    ("XL 2" não vira só "2").
    """
    parts = tokens(model)
    variants = [''.join(parts)] if parts else []
    if len(parts) > 1 and parts[0].isalpha():
        core = ''.join(parts[1:])
        if len(core) >= MODEL_CORE_MIN_LENGTH and any(char.isdigit() for char in core):
            variants.append(core)
    return [variant for variant in variants if variant]


def model_matches(text, model):
    """O modelo aparece como palavra inteira (juntando até 4 pedaços: "L-3250", "SM S921B").

    'L3250' casa com "Epson L3250 Wifi" e "L-3250", não com "L32505".
    """
    words = tokens(text)
    for wanted in model_variants(model):
        for start in range(len(words)):
            joined = ''
            for end in range(start, min(start + 4, len(words))):
                joined += words[end]
                if joined == wanted:
                    return True
                if not wanted.startswith(joined):
                    break
    return False


def brand_matches(product_brand, source_brand):
    """Com as duas marcas conhecidas, precisam bater; marca ausente não restringe."""
    wanted, found = compact(product_brand), compact(source_brand)
    if not wanted or not found:
        return True
    return wanted in found or found in wanted


def capacities(text):
    return {f'{int(number)}{unit}' for number, unit in _CAPACITY.findall(plain(text))}


def capacity_matches(product, text):
    """Capacidade pedida no nome/modelo (ex.: 256GB) precisa estar no texto da fonte."""
    wanted = capacities(f'{product.name} {product.model}')
    return not wanted or wanted <= capacities(text)


def is_multi_unit(text):
    upper = plain(text)
    return any(pattern.search(upper) for pattern in _MULTI_UNIT)
