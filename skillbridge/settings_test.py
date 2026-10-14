"""
Settings usados só pelos testes: banco SQLite em memória e nada
dependendo do .env (os testes nunca tocam o banco real).
"""
import os

# Força o modo de desenvolvimento antes de carregar os settings reais:
# gera SECRET_KEY aleatória e não liga SECURE_SSL_REDIRECT (que faria
# toda requisição de teste receber 301).
os.environ['DJANGO_DEBUG'] = 'True'

from skillbridge.settings import *  # noqa: E402,F401,F403

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}