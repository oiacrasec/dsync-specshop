from django.db import transaction
from django.utils.cache import add_never_cache_headers
from django.utils.decorators import method_decorator
from django.utils.translation import gettext_lazy as _
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_post_parameters
from drf_spectacular.utils import PolymorphicProxySerializer, extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed, NotFound, ValidationError
from rest_framework.parsers import JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from apps.audit.models import AccessLogAction
from apps.audit.utils import mark_auth_access
from apps.core.exceptions import ContractInactive
from apps.core.openapi import temporary_password_response
from apps.core.responses import build_exception_response, build_result_response
from apps.core.views import UPLOAD_PARSERS, BaseAPIView, BaseModelViewSet
from apps.rbac import services as rbac_services
from apps.rbac.permissions import AllowAuthenticated
from apps.rbac.selectors import user_access
from apps.rbac.serializers import UserAccessOutputSerializer, UserAccessSerializer
from apps.users import services
from apps.users.constants import DEFAULT_PREFERENCES, SESSION_CLAIM
from apps.users.filters import UserFilterSet
from apps.users.mfa import MfaChallengesRevoked
from apps.users.models import User
from apps.users.selectors import active_sessions, recent_logins
from apps.users.serializers import (
    ContractUserSerializer,
    LoginHistorySerializer,
    LoginSerializer,
    MfaChallengeSerializer,
    MfaCodeSerializer,
    MfaDisableSerializer,
    MfaLoginSerializer,
    MfaRecoveryCodesSerializer,
    MfaSetupSerializer,
    MfaStatusSerializer,
    MyProfileSerializer,
    PasswordChangeSerializer,
    PreferencesSerializer,
    RefreshSerializer,
    UserSessionSerializer,
    UserSummarySerializer,
)
from apps.users.throttles import LoginThrottle, PasswordChangeThrottle


@method_decorator(sensitive_post_parameters('username', 'password', 'refresh'), name='dispatch')
class AuthView(BaseAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    renderer_classes = [JSONRenderer]


TOKENS = {'access': serializers.CharField(), 'refresh': serializers.CharField()}
LOGIN_RESPONSE = inline_serializer('LoginResponse', {**TOKENS, 'user': UserSummarySerializer()})
USER_RESPONSE = inline_serializer('PasswordChangeResponse', {'user': UserSummarySerializer()})


@extend_schema(
    request=LoginSerializer,
    responses={
        200: PolymorphicProxySerializer(
            component_name='LoginResult',
            serializers=[LOGIN_RESPONSE, MfaChallengeSerializer],
            resource_type_field_name=None,
        )
    },
)
class LoginView(AuthView):
    throttle_classes = [LoginThrottle]

    def get_throttles(self):
        self.login_throttles = super().get_throttles()
        return self.login_throttles

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            tokens = services.login(request=request, **serializer.validated_data)
        except AuthenticationFailed:
            mark_auth_access(request, action=AccessLogAction.LOGIN_FAILURE)
            for throttle in self.login_throttles:
                throttle.record_failure()
            raise
        except ContractInactive:
            mark_auth_access(request, action=AccessLogAction.LOGIN_FAILURE)
            raise
        if tokens.get('mfa_required'):
            return Response(tokens)
        mark_auth_access(request, action=AccessLogAction.LOGIN_SUCCESS, user=request.user)
        return Response({**tokens, 'user': UserSummarySerializer(request.user).data})


@extend_schema(request=RefreshSerializer, responses={200: inline_serializer('TokenPair', TOKENS)})
class RefreshView(AuthView):
    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = services.refresh_tokens(request=request, **serializer.validated_data)
        mark_auth_access(request, action=AccessLogAction.REFRESH_SUCCESS, user=request.user)
        return Response(tokens)


@extend_schema(request=RefreshSerializer, responses={204: None})
class LogoutView(AuthView):
    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.logout(**serializer.validated_data)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(
    sensitive_post_parameters('current_password', 'new_password', 'new_password_confirm'), name='dispatch'
)
@extend_schema(request=PasswordChangeSerializer, responses={200: USER_RESPONSE})
class PasswordChangeView(BaseAPIView):
    permission_classes = [AllowAuthenticated]
    parser_classes = [JSONParser]
    renderer_classes = [JSONRenderer]
    throttle_classes = [PasswordChangeThrottle]
    allow_password_change_required = True

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = services.change_password(
            user=request.user,
            current_password=serializer.validated_data['current_password'],
            new_password=serializer.validated_data['new_password'],
        )
        return Response({'user': UserSummarySerializer(user).data})


@method_decorator(never_cache, name='dispatch')
@extend_schema(request=PreferencesSerializer, responses={200: PreferencesSerializer})
class MyPreferencesView(BaseAPIView):
    """Aparência da interface do próprio usuário; sem X-Organization-Id (vale para o superadmin)."""

    permission_classes = [AllowAuthenticated]
    parser_classes = [JSONParser]

    def get(self, request):
        return Response(self.current(request.user))

    def put(self, request):
        serializer = PreferencesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.preferences = serializer.validated_data
        user.save(update_fields=['preferences'], actor=user)
        return Response(self.current(user))

    @staticmethod
    def current(user):
        stored = PreferencesSerializer(data={**DEFAULT_PREFERENCES, **user.preferences})
        return stored.validated_data if stored.is_valid() else dict(DEFAULT_PREFERENCES)


@extend_schema(request={'multipart/form-data': MyProfileSerializer}, responses={200: MyProfileSerializer})
class MyProfileView(BaseAPIView):
    """Perfil do próprio usuário (9.2): nome, fuso e foto num envio só (multipart)."""

    permission_classes = [AllowAuthenticated]
    parser_classes = UPLOAD_PARSERS

    def get(self, request):
        return Response(MyProfileSerializer(request.user).data)

    def put(self, request):
        serializer = MyProfileSerializer(request.user, data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(MyProfileSerializer(serializer.save()).data)


def current_session_id(request):
    """public_id da sessão deste navegador, vindo do access token (claim `sid`)."""
    token = getattr(request, 'auth', None)
    return token.get(SESSION_CLAIM) if token is not None else None


@extend_schema(responses={200: UserSessionSerializer(many=True)})
class MySessionsView(BaseAPIView):
    """Sessões em vigor da própria conta (9.3)."""

    permission_classes = [AllowAuthenticated]

    def get(self, request):
        context = {'current_session': current_session_id(request)}
        return Response(UserSessionSerializer(active_sessions(request.user), many=True, context=context).data)


@extend_schema(responses={200: LoginHistorySerializer(many=True)})
class MyLoginHistoryView(BaseAPIView):
    """Últimos logins da própria conta (só leitura)."""

    permission_classes = [AllowAuthenticated]

    def get(self, request):
        return Response(LoginHistorySerializer(recent_logins(request.user), many=True).data)


@extend_schema(request=None, responses={204: None})
class MySessionView(BaseAPIView):
    """Encerra uma sessão da própria conta; de outra conta (ou inexistente) → 404."""

    permission_classes = [AllowAuthenticated]

    def delete(self, request, public_id):
        if not services.end_sessions(user=request.user, session_ids=[public_id]):
            raise NotFound()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(request=None, responses={200: inline_serializer('EndedSessions', {'ended': serializers.IntegerField()})})
class EndOtherSessionsView(BaseAPIView):
    """Encerra todas as sessões da conta, menos a deste navegador."""

    permission_classes = [AllowAuthenticated]

    def post(self, request):
        ended = services.end_sessions(user=request.user, keep=current_session_id(request))
        return Response({'ended': ended})


@method_decorator(never_cache, name='dispatch')
class UserViewSet(BaseModelViewSet):
    model = User
    serializer_class = ContractUserSerializer
    filterset_class = UserFilterSet
    permission_resource = 'user'
    required_permission = {
        'reset_password': 'user:manage',
        'reset_mfa': 'user:manage',
        'access': 'user:view',
        'replace_access': 'assignment:create',
    }
    options_label_field = 'username'
    options_search_fields = ('username', 'first_name')
    schema_columns = ('username', 'first_name', 'is_active', 'must_change_password')
    schema_column_overrides = {
        'username': {'label': _('Usuário')},
        'first_name': {'label': _('Nome')},
        'must_change_password': {'label': _('Troca de senha pendente')},
    }
    schema_filters = ('is_active',)

    @extend_schema(
        request=None,
        responses={200: temporary_password_response('ContractUserPasswordReset', ContractUserSerializer())},
    )
    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, *args, **kwargs):
        try:
            user, temporary_password = services.reset_password(user=self.get_object(), actor=request.user)
            result = {'user': self.get_serializer(user).data, 'temporary_password': temporary_password}
            response = build_result_response(result)
        except Exception as exc:
            response = build_exception_response(exception=exc, request=request)
        add_never_cache_headers(response)
        return response

    @extend_schema(request=None, responses={204: None})
    @action(detail=True, methods=['post'], url_path='reset-mfa')
    def reset_mfa(self, request, *args, **kwargs):
        try:
            services.reset_mfa(user=self.get_object(), actor=request.user)
            return build_result_response(None, status_code=status.HTTP_204_NO_CONTENT)
        except Exception as exc:
            return build_exception_response(exception=exc, request=request)

    @extend_schema(request=None, responses={200: UserAccessOutputSerializer})
    @action(detail=True, methods=['get'])
    def access(self, request, *args, **kwargs):
        return Response(user_access(self.get_object()))

    @extend_schema(request=UserAccessSerializer, responses={200: UserAccessOutputSerializer})
    @access.mapping.put
    def replace_access(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = UserAccessSerializer(data=request.data, context={'request': request, 'user': user})
        serializer.is_valid(raise_exception=True)
        rbac_services.replace_user_access(user=user, actor=request.user, **serializer.validated_data)
        return Response(user_access(user))


@method_decorator(transaction.non_atomic_requests, name='dispatch')
@method_decorator(sensitive_post_parameters('mfa_token', 'code'), name='dispatch')
@extend_schema(request=MfaLoginSerializer, responses={200: LOGIN_RESPONSE})
class MfaLoginView(AuthView):
    def post(self, request):
        serializer = MfaLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            tokens = services.login_mfa(request=request, **serializer.validated_data)
        except MfaChallengesRevoked as exc:
            mark_auth_access(request, action=AccessLogAction.LOGIN_FAILURE)
            throttle = LoginThrottle()
            throttle.key = throttle.username_key(exc.username)
            throttle.record_failure()
            raise
        except AuthenticationFailed, ContractInactive, ValidationError:
            mark_auth_access(request, action=AccessLogAction.LOGIN_FAILURE)
            raise
        mark_auth_access(request, action=AccessLogAction.LOGIN_SUCCESS, user=request.user)
        return Response({**tokens, 'user': UserSummarySerializer(request.user).data})


@extend_schema(responses={200: MfaStatusSerializer})
class MyMfaView(BaseAPIView):
    permission_classes = [AllowAuthenticated]

    def get(self, request):
        from .selectors import mfa_status

        return Response(mfa_status(request.user))


@method_decorator(sensitive_post_parameters(), name='dispatch')
@extend_schema(request=None, responses={200: MfaSetupSerializer})
class MfaSetupView(BaseAPIView):
    permission_classes = [AllowAuthenticated]
    throttle_classes = [PasswordChangeThrottle]

    def post(self, request):
        return Response(services.setup_mfa(user=request.user))


@method_decorator(transaction.non_atomic_requests, name='dispatch')
@method_decorator(sensitive_post_parameters('code', 'password'), name='dispatch')
class MfaChangeView(BaseAPIView):
    permission_classes = [AllowAuthenticated]
    serializer_class = MfaCodeSerializer
    operation = None

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.change_mfa(user=request.user, operation=self.operation, **serializer.validated_data)
        response_status = status.HTTP_204_NO_CONTENT if self.operation == 'disable' else status.HTTP_200_OK
        return Response(result, status=response_status)


@extend_schema(request=MfaCodeSerializer, responses={200: MfaRecoveryCodesSerializer})
class MfaEnableView(MfaChangeView):
    operation = 'enable'


@extend_schema(request=MfaDisableSerializer, responses={204: None})
class MfaDisableView(MfaChangeView):
    serializer_class = MfaDisableSerializer
    operation = 'disable'


@extend_schema(request=MfaCodeSerializer, responses={200: MfaRecoveryCodesSerializer})
class MfaRecoveryCodesView(MfaChangeView):
    operation = 'regenerate'
