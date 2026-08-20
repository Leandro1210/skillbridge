"""
Signals — Auto-criação de PerfilUsuario quando um Usuario é criado.
"""

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from core.models import PerfilUsuario


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def criar_perfil_usuario(sender, instance, created, **kwargs):
    """Cria automaticamente um PerfilUsuario quando um novo Usuario é salvo."""
    if created:
        PerfilUsuario.objects.create(usuario=instance)


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def salvar_perfil_usuario(sender, instance, **kwargs):
    """Garante que o perfil seja salvo junto com o usuário."""
    if hasattr(instance, 'perfil'):
        instance.perfil.save()
