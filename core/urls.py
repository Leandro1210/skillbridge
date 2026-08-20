"""
SkillBridge — Core URL Configuration

Registra todas as rotas da API usando o DefaultRouter do DRF.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from core.views import (
    EntregaViewSet,
    EmpresaAvaliarSubmissaoView,
    EmpresaDashboardView,
    EmpresaProjetoViewSet,
    EmpresaSubmissaoListView,
    EtapaViewSet,
    InscricaoListView,
    LogoutView,
    PerfilEmpresaView,
    PerfilUsuarioView,
    ProjetoViewSet,
    RegistroView,
    UsuarioMeView,
    VagaRecomendadaView,
)

router = DefaultRouter()
router.register(r'projetos', ProjetoViewSet, basename='projeto')
router.register(r'etapas', EtapaViewSet, basename='etapa')
router.register(r'entregas', EntregaViewSet, basename='entrega')
router.register(r'empresa/projetos', EmpresaProjetoViewSet, basename='empresa-projeto')

urlpatterns = [
    # Auth
    path('auth/register/', RegistroView.as_view(), name='auth-register'),
    path('auth/me/', UsuarioMeView.as_view(), name='auth-me'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),

    # Perfis
    path('perfil/usuario/', PerfilUsuarioView.as_view(), name='perfil-usuario'),
    path('perfil/empresa/', PerfilEmpresaView.as_view(), name='perfil-empresa'),

    # Inscricoes do usuario
    path('inscricoes/', InscricaoListView.as_view(), name='inscricoes-list'),

    # Matching de vagas
    path('vagas/recomendadas/', VagaRecomendadaView.as_view(), name='vagas-recomendadas'),

    # Empresa
    path('empresa/submissoes/', EmpresaSubmissaoListView.as_view(), name='empresa-submissoes'),
    path('empresa/submissoes/<int:pk>/avaliar/', EmpresaAvaliarSubmissaoView.as_view(), name='empresa-avaliar'),
    path('empresa/dashboard/', EmpresaDashboardView.as_view(), name='empresa-dashboard'),

    # Router (projetos, etapas, entregas, empresa/projetos)
    path('', include(router.urls)),
]
