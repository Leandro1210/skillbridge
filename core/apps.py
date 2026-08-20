from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    verbose_name = 'SkillBridge Core'

    def ready(self):
        # Registra os signals (auto-criação de PerfilUsuario, etc.)
        import core.signals  # noqa: F401
