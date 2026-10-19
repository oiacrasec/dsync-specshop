from django.utils.cache import add_never_cache_headers
from django.utils.decorators import method_decorator
from django.utils.translation import gettext_lazy as _
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_post_parameters
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.parsers import JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AccessLogAction
from apps.audit.utils import mark_auth_access
from apps.core.exceptions import ContractInactive
from apps.core.responses import build_exception_response, build_result_response
from apps.core.views import BaseModelViewSet
from apps.rbac.permissions import AllowAuthenticated
from apps.users import services
from apps.users.filters import UserFilterSet
from apps.users.models import User
from apps.users.serializers import (
    ContractUserSerializer,
    LoginSerializer,
    PasswordChangeSerializer,
    RefreshSerializer,
    UserSummarySerializer,
)
from apps.users.throttles import LoginThrottle, PasswordChangeThrottle


@method_decorator(never_cache, name='dispatch')
@method_decorator(sensitive_post_parameters('username', 'password', 'refresh'), name='dispatch')
class AuthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    renderer_classes = [JSONRenderer]


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


class RefreshView(AuthView):
    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = services.refresh_tokens(request=request, **serializer.validated_data)
        mark_auth_access(request, action=AccessLogAction.REFRESH_SUCCESS, user=request.user)
        return Response(tokens)


class LogoutView(AuthView):
    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.logout(**serializer.validated_data)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(never_cache, name='dispatch')
@method_decorator(
    sensitive_post_parameters('current_password', 'new_password', 'new_password_confirm'), name='dispatch'
)
class PasswordChangeView(APIView):
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
class UserViewSet(BaseModelViewSet):
    model = User
    serializer_class = ContractUserSerializer
    filterset_class = UserFilterSet
    permission_resource = 'user'
    required_permission = {'reset_password': 'user:manage'}
    options_label_field = 'username'
    options_search_fields = ('username', 'first_name')
    schema_columns = ('username', 'first_name', 'is_active', 'must_change_password')
    schema_column_overrides = {
        'username': {'label': _('Usuário')},
        'first_name': {'label': _('Nome')},
        'must_change_password': {'label': _('Troca de senha pendente')},
    }
    schema_filters = ('is_active',)

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
