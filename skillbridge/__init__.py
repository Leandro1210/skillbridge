# Garante que o Celery app seja carregado quando o Django iniciar,
# para que as tasks compartilhadas usem esse app.
from .celery import app as celery_app

__all__ = ('celery_app',)
