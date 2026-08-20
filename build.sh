#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
# Dados de demonstração não são populados automaticamente em cada deploy.
# Rode manualmente quando precisar: python manage.py seed_demo
