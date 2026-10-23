from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle


class MediaDownloadThrottle(SimpleRateThrottle):
    """Limite por IP real do cliente (mesmo critério do registro de acesso) nos links de mídia."""

    scope = 'media_download'

    def get_rate(self):
        return settings.MEDIA_DOWNLOAD_RATE

    def get_cache_key(self, request, view):
        from apps.audit.utils import client_address

        ip, _port = client_address(request)
        return self.cache_format % {'scope': self.scope, 'ident': ip}
