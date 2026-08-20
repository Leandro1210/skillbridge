"""
App Celery do projeto. Fica configurado em modo síncrono
(CELERY_TASK_ALWAYS_EAGER no settings.py) porque o deploy atual não tem
um broker (Redis) disponível — hoje não há nenhuma task assíncrona real
rodando, isso aqui é infraestrutura pronta pra quando precisar.
"""

import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillbridge.settings')

app = Celery('skillbridge')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Task de debug para verificar se o Celery está funcionando."""
    print(f'Request: {self.request!r}')
