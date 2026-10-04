from django.db.models import Q

from .models import Assignment, Profile


def conflicting_profile_names(profile):
    candidates = Profile.objects.filter(name=profile.name).exclude(pk=profile.pk)
    if profile.contract_id is not None:
        candidates = candidates.filter(Q(contract_id=profile.contract_id) | Q(contract__isnull=True))
    else:
        candidates = candidates.filter(contract__isnull=True)
    return candidates.exists()


def duplicate_client_contracts(profile):
    """QuerySet de UUIDs para aviso paginável, sem carregar todos os contratos."""
    return (
        Profile.objects.filter(name=profile.name, contract__isnull=False)
        .values_list('contract__public_id', flat=True)
        .order_by('contract__public_id')
        .distinct()
    )


def profile_is_assigned(profile):
    return Assignment.objects.filter(profile=profile).exists()
