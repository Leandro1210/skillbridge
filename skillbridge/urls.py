"""
SkillBridge — Root URL Configuration

Inclui:
  • /admin/ — Django Admin
  • /api/   — API REST (core.urls)
  • /api/auth/token/ — JWT Token Obtain Pair
  • /api/auth/token/refresh/ — JWT Token Refresh
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT auth endpoints
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token-obtain'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # Core API
    path('api/', include('core.urls')),
]

# Serve media files em desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
