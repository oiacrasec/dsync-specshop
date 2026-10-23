"""Identificação do dispositivo pelo cabeçalho User-Agent (9.3, decisão 84).

Regras próprias para os casos comuns; o resto vira "Outro navegador"/"outro sistema". Os
navegadores atuais reduzem de propósito o que enviam, então não se busca modelo ou versão.
Trocar a estratégia (ex.: uma biblioteca) = mudar só esta classe.
"""

import re

# Ordem importa: Edge e Opera também dizem "Chrome"; Chrome também diz "Safari".
BROWSERS = (
    ('Edge', re.compile(r'\bEdg(?:e|A|iOS)?/')),
    ('Opera', re.compile(r'\bOPR/|\bOpera\b')),
    ('Samsung Internet', re.compile(r'\bSamsungBrowser/')),
    ('Firefox', re.compile(r'\bFirefox/|\bFxiOS/')),
    ('Chrome', re.compile(r'\bChrome/|\bCriOS/')),
    ('Safari', re.compile(r'\bVersion/[\d.]+.*\bSafari/')),
)
# Android e iOS antes de Linux e macOS: os celulares também citam esses nomes.
SYSTEMS = (
    ('Android', re.compile(r'\bAndroid\b')),
    ('iPadOS', re.compile(r'\biPad\b')),
    ('iOS', re.compile(r'\biPhone\b|\biPod\b')),
    ('Windows', re.compile(r'\bWindows\b')),
    ('ChromeOS', re.compile(r'\bCrOS\b')),
    ('macOS', re.compile(r'\bMac OS X\b|\bMacintosh\b')),
    ('Linux', re.compile(r'\bLinux\b')),
)
MOBILE = frozenset({'Android', 'iOS', 'iPadOS'})
MAX_LENGTH = 512


class UserAgent:
    """`UserAgent(cabeçalho).label` → 'Chrome no Windows'; vazio ou estranho não quebra nada."""

    def __init__(self, header):
        text = (header or '')[:MAX_LENGTH]
        self.browser = next((name for name, pattern in BROWSERS if pattern.search(text)), None)
        self.system = next((name for name, pattern in SYSTEMS if pattern.search(text)), None)

    @classmethod
    def from_request(cls, request):
        return cls(request.headers.get('User-Agent', '') if request is not None else '')

    @property
    def is_mobile(self):
        return self.system in MOBILE

    @property
    def label(self):
        return f'{self.browser or "Outro navegador"} no {self.system or "outro sistema"}'
