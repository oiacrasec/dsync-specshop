from django.urls import path

from apps.core.routers import SchemaRouter
from apps.users.views import (
    EndOtherSessionsView,
    LoginView,
    LogoutView,
    MfaDisableView,
    MfaEnableView,
    MfaLoginView,
    MfaRecoveryCodesView,
    MfaSetupView,
    MyLoginHistoryView,
    MyMfaView,
    MyPreferencesView,
    MyProfileView,
    MySessionsView,
    MySessionView,
    PasswordChangeView,
    RefreshView,
    UserViewSet,
)

app_name = 'users'

router = SchemaRouter(use_regex_path=False)
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('auth/login/mfa/', MfaLoginView.as_view(), name='login-mfa'),
    path('me/mfa/', MyMfaView.as_view(), name='my-mfa'),
    path('me/mfa/setup/', MfaSetupView.as_view(), name='mfa-setup'),
    path('me/mfa/enable/', MfaEnableView.as_view(), name='mfa-enable'),
    path('me/mfa/disable/', MfaDisableView.as_view(), name='mfa-disable'),
    path('me/mfa/recovery-codes/', MfaRecoveryCodesView.as_view(), name='mfa-recovery-codes'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', RefreshView.as_view(), name='refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/change-password/', PasswordChangeView.as_view(), name='change-password'),
    path('me/preferences/', MyPreferencesView.as_view(), name='my-preferences'),
    path('me/profile/', MyProfileView.as_view(), name='my-profile'),
    path('me/sessions/', MySessionsView.as_view(), name='my-sessions'),
    path('me/logins/', MyLoginHistoryView.as_view(), name='my-logins'),
    path('me/sessions/end-others/', EndOtherSessionsView.as_view(), name='my-sessions-end-others'),
    path('me/sessions/<uuid:public_id>/', MySessionView.as_view(), name='my-session'),
    *router.urls,
]
