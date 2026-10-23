from django.urls import path

from apps.core.routers import SchemaRouter
from apps.users.views import (
    LoginView,
    LogoutView,
    MyPreferencesView,
    MyProfileView,
    PasswordChangeView,
    RefreshView,
    UserViewSet,
)

app_name = 'users'

router = SchemaRouter(use_regex_path=False)
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', RefreshView.as_view(), name='refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/change-password/', PasswordChangeView.as_view(), name='change-password'),
    path('me/preferences/', MyPreferencesView.as_view(), name='my-preferences'),
    path('me/profile/', MyProfileView.as_view(), name='my-profile'),
    *router.urls,
]
