from django.utils.cache import add_never_cache_headers
from django.utils.decorators import method_decorator
from django.utils.translation import gettext_lazy as _
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_post_parameters
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed
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
from apps.users.constants import DEFAULT_PREFERENCES
from apps.users.filters import UserFilterSet
from apps.users.models import User
from apps.users.serializers import (
    ContractUserSerializer,
    LoginSerializer,
    MyProfileSerializer,
    PasswordChangeSerializer,
    PreferencesSerializer,
    RefreshSerializer,
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


@extend_schema(request=LoginSerializer, responses={200: LOGIN_RESPONSE})
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


@method_decorator(never_cache, name='dispatch')
class UserViewSet(BaseModelViewSet):
    model = User
    serializer_class = ContractUserSerializer
    filterset_class = UserFilterSet
    permission_resource = 'user'
    required_permission = {
        'reset_password': 'user:manage',
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
