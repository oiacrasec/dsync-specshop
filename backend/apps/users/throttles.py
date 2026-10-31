from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.crypto import salted_hmac
from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle

from .constants import AUTH_CHANGE_RATE


class PasswordChangeThrottle(UserRateThrottle):
    scope = 'auth_password_change'
    rate = AUTH_CHANGE_RATE


class LoginThrottle(SimpleRateThrottle):
    scope = 'auth_login'

    def get_rate(self):
        return settings.AUTH_LOGIN_RATE

    def get_cache_key(self, request, view):
        # Contas inexistentes seguem a mesma política, sem revelar sua existência.
        data = request.data
        return self.username_key(data.get('username') if isinstance(data, dict) else None)

    def username_key(self, username):
        if not isinstance(username, str) or not username.strip():
            return None
        username = get_user_model().normalize_username(username.strip())
        identity = salted_hmac('users.auth_login', username, algorithm='sha256').hexdigest()
        return self.cache_format % {'scope': self.scope, 'ident': identity}

    def allow_request(self, request, view):
        self.key = self.get_cache_key(request, view)
        self.blocked_until = None
        if self.key is None:
            return True
        self.blocked_until = self.cache.get(f'{self.key}:blocked')
        return self.blocked_until is None or self.blocked_until <= self.timer()

    def wait(self):
        return max(0, self.blocked_until - self.timer()) if self.blocked_until is not None else None

    def record_failure(self):
        if self.key is None:
            return
        now = self.timer()
        # Janela fixa; add/incr são atômicos no cache local e no Redis do Django.
        window = int(now // self.duration)
        counter_key = f'{self.key}:{window}'
        if self.cache.add(counter_key, 1, timeout=self.duration):
            count = 1
        else:
            try:
                count = self.cache.incr(counter_key)
            except ValueError:
                # O contador pode ter expirado entre add e incr.
                if self.cache.add(counter_key, 1, timeout=self.duration):
                    count = 1
                else:
                    count = self.cache.incr(counter_key)
        if count >= self.num_requests:
            self.cache.add(f'{self.key}:blocked', now + self.duration, timeout=self.duration)
