from django.urls import path

from apps.users.views import LoginView, LogoutView, PasswordChangeView, RefreshView

app_name = 'users'

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', RefreshView.as_view(), name='refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('change-password/', PasswordChangeView.as_view(), name='change-password'),
]
