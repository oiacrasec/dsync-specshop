from django.conf import settings
from django.core.checks import Tags, Warning, register


@register(Tags.security, deploy=True)
def check_access_log_proxy_headers(app_configs, **kwargs):
    """Em produção, atrás do proxy, IP e porta reais vêm de headers (Marco Civil art. 15)."""
    warnings = []
    if not settings.ACCESS_LOG_CLIENT_IP_HEADER:
        warnings.append(
            Warning(
                'DJANGO_ACCESS_LOG_IP_HEADER não configurado: o registro de acesso gravaria o IP do proxy.',
                hint='Configure o header do IP real do cliente (ex.: X-Real-IP, com $remote_addr no nginx).',
                id='audit.W001',
            )
        )
    if not settings.ACCESS_LOG_CLIENT_PORT_HEADER:
        warnings.append(
            Warning(
                'DJANGO_ACCESS_LOG_PORT_HEADER não configurado: o registro de acesso ficaria sem a porta real.',
                hint='Configure o header da porta de origem (ex.: X-Real-Port, com $remote_port no nginx).',
                id='audit.W002',
            )
        )
    return warnings
