"""Constantes de users: só valores literais (e o catálogo de fusos do sistema)."""

from zoneinfo import available_timezones

# Campos que mexem em papel, contrato, licença ou último admin (save_user).
RULE_FIELDS = frozenset({'is_active', 'is_superuser', 'contract', 'contract_id', 'deleted_at'})

# Limite exclusivo da troca de senha autenticada, antes do hash e do lock.
AUTH_CHANGE_RATE = '5/min'

# Senha temporária do provisionamento/reset: devolvida uma vez, nunca gravada em claro.
TEMPORARY_PASSWORD_LENGTH = 16
TEMPORARY_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*-_=+?'  # noqa: S105 alfabeto
TEMPORARY_PASSWORD_ATTEMPTS = 10

# Preferências de interface do usuário (tela de Configurações): só valores conhecidos do frontend.
THEME_PRESETS = ('Aura', 'Lara', 'Nora')
THEME_PRIMARY_COLORS = (
    'noir',
    'emerald',
    'green',
    'lime',
    'orange',
    'amber',
    'yellow',
    'teal',
    'cyan',
    'sky',
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
)
MENU_MODES = ('static', 'overlay', 'slim', 'compact', 'reveal', 'drawer', 'horizontal')
DEFAULT_PREFERENCES = {'preset': 'Aura', 'primary': 'blue', 'dark_mode': False, 'menu_mode': 'static'}

# Fusos IANA aceitos no perfil, lidos uma vez por processo.
TIME_ZONES = tuple(sorted(available_timezones()))

# Claim do JWT com o public_id da sessão (9.3); refresh e access carregam.
SESSION_CLAIM = 'sid'

# TOTP: 30 segundos e tolerância de um intervalo de relógio (RFC 6238).
MFA_TOTP_INTERVAL = 30
MFA_TOTP_WINDOW = 1
MFA_CHALLENGE_SECONDS = 300
MFA_MAX_LOGIN_CHALLENGES = 5
# O teto acompanha o bloqueio temporário de 60 s do login; nunca dormir sob lock.
MFA_MAX_RETRY_SECONDS = 60
MFA_RECOVERY_CODE_COUNT = 10
