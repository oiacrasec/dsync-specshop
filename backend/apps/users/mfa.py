"""Primitivas de TOTP: segredo cifrado, códigos reserva e proteção contra reuso.

Espera crescente e last_t seguem as ideias de django-otp 1.7.5 (Unlicense),
reimplementadas com segredos cifrados, hashes de reserva e lock de linha obrigatório.
A orquestração/transação fica em users.services; nunca dormir segurando locks.
"""

import math
import re
import secrets
from datetime import UTC, datetime

import pyotp
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import AuthenticationFailed, Throttled, ValidationError

from apps.core.exceptions import MfaUnavailable

from .constants import (
    MFA_MAX_RETRY_SECONDS,
    MFA_RECOVERY_CODE_COUNT,
    MFA_TOTP_INTERVAL,
    MFA_TOTP_WINDOW,
)
from .models import UserRecoveryCode


class MfaChallengesRevoked(AuthenticationFailed):
    """Falhas seguidas demais no 2º passo: a view conta a falha no bloqueio do login."""

    def __init__(self, username):
        super().__init__()
        self.username = username


class Mfa:
    """Opera a credencial já travada por select_for_update, após travar seu usuário."""

    def __init__(self, device):
        self.device = device

    @staticmethod
    def cipher():
        key = settings.MFA_ENCRYPTION_KEY
        if not key or key in (settings.SECRET_KEY, settings.SIMPLE_JWT['SIGNING_KEY']):
            raise MfaUnavailable()
        try:
            return Fernet(key.encode())
        except ValueError, TypeError:
            raise MfaUnavailable() from None

    @classmethod
    def encrypt(cls, secret):
        return cls.cipher().encrypt(secret.encode()).decode()

    @classmethod
    def decrypt(cls, secret):
        try:
            return cls.cipher().decrypt(secret.encode()).decode()
        except InvalidToken, UnicodeError:
            raise MfaUnavailable() from None

    def provisioning(self, username):
        secret = self.decrypt(self.device.secret)
        uri = pyotp.TOTP(secret, interval=MFA_TOTP_INTERVAL).provisioning_uri(username, issuer_name=settings.APP_NAME)
        return {'secret': secret, 'otpauth_url': uri}

    def retry_after(self):
        if not self.device.failures or self.device.last_failure_at is None:
            return 0
        delay = min(MFA_MAX_RETRY_SECONDS, 2 ** min(self.device.failures - 1, 6))
        elapsed = (timezone.now() - self.device.last_failure_at).total_seconds()
        return max(0, math.ceil(delay - elapsed))

    def failure(self, *, field='code'):
        self.device.failures = min(self.device.failures + 1, 32)
        self.device.last_failure_at = timezone.now()
        self.device.save(update_fields=['failures', 'last_failure_at'])
        return ValidationError({field: _('Não foi possível confirmar. Verifique os dados e tente novamente.')})

    def verify(self, code, *, allow_recovery=False):
        """Retorna uma exceção sem lançá-la: o chamador confirma a transação das falhas
        antes de responder o erro. Assim ATOMIC_REQUESTS/DRF não apagam o contador.
        """
        wait = self.retry_after()
        if wait:
            return Throttled(wait=wait)
        if re.fullmatch(r'[0-9]{6}', code):
            otp = pyotp.TOTP(self.decrypt(self.device.secret), interval=MFA_TOTP_INTERVAL)
            now_t = int(timezone.now().timestamp()) // MFA_TOTP_INTERVAL
            for offset in range(-MFA_TOTP_WINDOW, MFA_TOTP_WINDOW + 1):
                candidate = now_t + offset
                if candidate <= self.device.last_t:
                    continue
                instant = datetime.fromtimestamp(candidate * MFA_TOTP_INTERVAL, tz=UTC)
                if constant_time_compare(otp.at(instant), code):
                    self.device.last_t = candidate
                    return self._success()
        elif allow_recovery:
            normalized = code.replace('-', '').replace(' ', '').upper()
            if re.fullmatch(r'[A-F0-9]{16}', normalized):
                deleted, _ = UserRecoveryCode.objects.filter(
                    mfa=self.device, digest=self.recovery_digest(normalized)
                ).delete()
                if deleted:
                    return self._success()
        return self.failure()

    def _success(self):
        self.device.failures = 0
        self.device.last_failure_at = None
        self.device.save(update_fields=['last_t', 'failures', 'last_failure_at'])
        return None

    def recovery_digest(self, raw):
        return salted_hmac('users.mfa.recovery', f'{self.device.user_id}:{raw}', algorithm='sha256').hexdigest()

    def new_recovery_codes(self):
        codes = [secrets.token_hex(8).upper() for _ in range(MFA_RECOVERY_CODE_COUNT)]
        UserRecoveryCode.objects.filter(mfa=self.device).delete()
        UserRecoveryCode.objects.bulk_create(
            [UserRecoveryCode(mfa=self.device, digest=self.recovery_digest(raw)) for raw in codes]
        )
        return ['-'.join(raw[index : index + 4] for index in range(0, len(raw), 4)) for raw in codes]
