from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils.translation import gettext_lazy as _

from apps.audit.models import AuditEventType as Event
from apps.audit.services import record
from apps.contracts.models import Contract, Organization
from apps.core.exceptions import ContractNotProvisionable
from apps.core.permission_registry import PermissionScope
from apps.core.tenancy import system_scope
from apps.rbac.constants import ESSENTIAL_PROFILE_KEY
from apps.rbac.models import Assignment, Profile
from apps.rbac.services import begin_write, save_assignment
from apps.users.services import save_user
from apps.users.utils import generate_temporary_password


@system_scope
@transaction.atomic
def provision_contract(*, contract, organization_name, username, name, actor):
    """Primeiro acesso do contrato: 1ª organização + admin com senha temporária (decisão 38).

    Só contrato disponível, sem usuários (inclusive inativos) e sem organizações não
    excluídos. A senha volta uma única vez ao chamador; nunca vai para log ou auditoria.
    Locks: configuração RBAC → contrato, a mesma ordem de save_assignment.
    """
    begin_write(actor)
    contract = Contract.objects.select_for_update().get(pk=contract.pk)
    user_model = get_user_model()
    if (
        not contract.is_available()
        or user_model.objects.filter(contract_id=contract.pk).exists()
        or Organization.objects.filter(contract_id=contract.pk).exists()
    ):
        raise ContractNotProvisionable()
    if user_model.all_objects.filter(username=username).exists():
        raise ValidationError({'username': _('Este nome de usuário já está em uso.')})

    organization = Organization(contract=contract, name=organization_name)
    organization.save(actor=actor)

    user = user_model(username=username, first_name=name, contract=contract, must_change_password=True)
    temporary_password = generate_temporary_password(user)
    user.set_password(temporary_password)
    try:
        with transaction.atomic():
            save_user(user=user, actor=actor)
    except IntegrityError:
        raise ValidationError({'username': _('Este nome de usuário já está em uso.')}) from None

    profile = Profile.objects.get(system_key=ESSENTIAL_PROFILE_KEY, contract__isnull=True)
    assignment = Assignment(contract=contract, user=user, profile=profile, scope=PermissionScope.CONTRACT)
    save_assignment(assignment=assignment, actor=actor)

    record(
        Event.CONTRACT_PROVISIONED,
        actor=actor,
        contract_id=contract.pk,
        target=contract,
        after={
            'organization': str(organization.public_id),
            'admin_user': str(user.public_id),
            'must_change_password': True,
        },
    )
    return organization, user, temporary_password
