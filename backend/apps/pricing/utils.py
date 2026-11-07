import os

from .constants import BROWSER_CONFIRMATIONS_DEFAULT, BROWSER_CONFIRMATIONS_ENV


def browser_confirmations():
    """Limite de confirmações para oferta do navegador (variável de ambiente, mínimo 1)."""
    return max(1, int(os.environ.get(BROWSER_CONFIRMATIONS_ENV, BROWSER_CONFIRMATIONS_DEFAULT)))
