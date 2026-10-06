"""
Django settings for the SkillBridge project.
"""

import os
from datetime import timedelta
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# Carrega variáveis do arquivo .env
load_dotenv()

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent

# Security
# DEBUG por padrão é False: um deploy que esquecer de definir DJANGO_DEBUG
# fica seguro por padrão, em vez de vazar tracebacks/config.
DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() in ('true', '1', 'yes')

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        # Só para rodar localmente sem configurar nada: gera uma chave aleatória a cada
        # inicialização. Produção (DEBUG=False, o padrão) exige DJANGO_SECRET_KEY.
        from django.core.management.utils import get_random_secret_key
        SECRET_KEY = get_random_secret_key()
    else:
        raise ImproperlyConfigured(
            'DJANGO_SECRET_KEY não foi definida. Gere uma com '
            '`python -c "from django.core.management.utils import get_random_secret_key; '
            'print(get_random_secret_key())"` e defina como variável de ambiente.'
        )

ALLOWED_HOSTS = [
    h.strip() for h in os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()
]

# Applications
INSTALLED_APPS = [
    # Django built-in
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_celery_results',
    # Local
    'core.apps.CoreConfig',
]

# Middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',          # CORS — antes de CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# URL Configuration
ROOT_URLCONF = 'skillbridge.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'skillbridge.wsgi.application'

# Database — PostgreSQL
# Evita UnicodeDecodeError no psycopg2 quando o caminho do perfil
# do Windows contém caracteres acentuados (ç, ã, etc.)
os.environ.setdefault('PGPASSFILE', '')
os.environ.setdefault('PGSERVICEFILE', '')

import dj_database_url

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    if DEBUG:
        # Sem Postgres configurado localmente, cai para SQLite só para não travar
        # quem está clonando o projeto pela primeira vez. Rode as migrations normalmente.
        DATABASE_URL = f"sqlite:///{BASE_DIR / 'db.sqlite3'}"
    else:
        raise ImproperlyConfigured('DATABASE_URL não foi definida.')

DATABASES = {
    'default': dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Auth
AUTH_USER_MODEL = 'core.Usuario'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# Static & Media files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# Simple JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS
# Nunca liberamos todas as origens, nem em DEBUG — só o que estiver
# explicitamente listado (com um default sensato para desenvolvimento local).
CORS_ALLOW_ALL_ORIGINS = False

cors_env = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if cors_env:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_env.split(',') if origin.strip()]
elif DEBUG:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
    ]
else:
    CORS_ALLOWED_ORIGINS = []

# Segurança adicional em produção
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 7  # 7 dias — aumentar depois de validar em produção
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# Celery
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'memory://')
CELERY_RESULT_BACKEND = 'django-db'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
# Como a plataforma em que o sistema está sendo lançado não possui Redis gratuito,
# forçamos a execução síncrona, eliminando a dependência de brokers e workers.
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
