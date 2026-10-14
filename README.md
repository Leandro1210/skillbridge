# SkillBridge

[![CI](https://github.com/Leandro1210/skillbridge/actions/workflows/ci.yml/badge.svg)](https://github.com/Leandro1210/skillbridge/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Leandro1210_skillbridge&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Leandro1210_skillbridge)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Leandro1210_skillbridge&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Leandro1210_skillbridge)

Plataforma que conecta talentos de tecnologia ao mercado de trabalho através da resolução de desafios práticos. Em vez de currículos, o estudante constrói um portfólio comprovado: resolve projetos reais propostos por empresas, ganha XP e sobe de nível conforme suas entregas são aprovadas.

Projeto Integrador do curso de Engenharia de Software (UniEVANGÉLICA).

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Django 5 + Django REST Framework + JWT (SimpleJWT) |
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Banco de dados | PostgreSQL (Supabase) |
| Hospedagem | Render (backend) + Vercel (frontend) |
| Testes | pytest + pytest-django + pytest-cov (backend) |
| Qualidade e CI | GitHub Actions + SonarQube Cloud (análise estática e cobertura) |

## Estrutura do repositório

```
skillbridge/
├── manage.py
├── skillbridge/                # projeto Django (settings, settings_test, urls, wsgi/asgi)
├── core/                       # app Django principal (models, views, serializers, urls)
│   └── tests/                  # testes automatizados do backend (pytest)
├── frontend/                   # SPA React (Vite)
├── docs/                       # documentação complementar (ver abaixo)
├── .github/workflows/ci.yml    # pipeline de CI (testes, lint, build, SonarQube)
├── requirements.txt            # dependências de produção
├── requirements-dev.txt        # + dependências de teste
├── pytest.ini / .coveragerc    # configuração dos testes e da cobertura
└── sonar-project.properties    # configuração da análise no SonarQube Cloud
```

## Como rodar localmente

### Pré-requisitos
- Python 3.12 (a mesma versão do CI; no 3.14 o `Pillow<11` do `requirements.txt` não instala)
- Node.js 18+
- Uma instância PostgreSQL acessível (local ou Supabase)

### 1. Backend (Django)

```bash
# criar e ativar um ambiente virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# instalar dependências (requirements-dev.txt inclui as de produção + as de teste)
pip install -r requirements-dev.txt

# configurar variáveis de ambiente
cp .env.example .env
# edite o .env com suas próprias credenciais — NUNCA use as do .env.example
# como valores reais, e NUNCA faça commit do .env

# aplicar migrations
python manage.py migrate

# (opcional) popular o banco com dados de demonstração
python manage.py seed_demo

# criar um usuário admin (para acessar /admin)
python manage.py createsuperuser

# subir o servidor
python manage.py runserver
```
API disponível em `http://localhost:8000/api/`.

### 2. Frontend (React)

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```
App disponível em `http://localhost:5173`.

### 3. Variáveis de ambiente

Veja `.env.example` na raiz para a lista completa. Resumo:

- **Backend**: `DATABASE_URL`, `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`.
- **Frontend**: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (colocadas em `frontend/.env`, se aplicável).

**Nunca** commite um arquivo `.env` real — ele já está no `.gitignore`. Se precisar de credenciais de desenvolvimento, peça a um mantenedor do projeto.

## Testes e lint

### Backend

```bash
pytest                                  # roda todos os testes e mostra a cobertura
pytest core/tests/test_entregas.py      # só um arquivo
pytest -k avaliar                       # só os testes com "avaliar" no nome
pytest --cov-report=html                # relatório navegável em htmlcov/index.html

python manage.py check                  # checagem de configuração do Django
```

Os testes usam `skillbridge/settings_test.py`: banco **SQLite em memória**, sem depender do `.env`. Eles nunca tocam o banco real (Supabase). Os testes ficam em `core/tests/`, e as fixtures compartilhadas (usuários, empresa, projeto, inscrição) estão em `core/tests/conftest.py`.

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

## Qualidade de código

- **CI (GitHub Actions)**: a cada push na `main` e em todo Pull Request, roda o `manage.py check` e o `pytest` com cobertura no backend, e o lint e o build no frontend. Depois envia o resultado para o SonarQube Cloud.
- **SonarQube Cloud**: análise estática de Python e JavaScript, mais a cobertura dos testes do backend. O quality gate aparece como comentário em cada Pull Request. Painel: <https://sonarcloud.io/summary/new_code?id=Leandro1210_skillbridge>.
- **SonarQube for IDE**: extensão do VS Code que mostra os mesmos alertas enquanto se edita o código. Recomendada em modo conectado (*Connected Mode*) ao projeto `Leandro1210_skillbridge`.

## Documentação complementar

A pasta [`docs/`](docs/) reúne documentação técnica mais aprofundada:

- [`documentacao-tecnica.md`](docs/documentacao-tecnica.md) — arquitetura, modelo de dados, endpoints da API e segurança.
- [`historico-evolucao.md`](docs/historico-evolucao.md) — histórico de versão do projeto por fase.

## Contribuindo

1. Crie uma branch a partir de `main`: `git checkout -b feature/nome-da-sua-mudanca`.
2. Faça commits pequenos e com mensagens descritivas.
3. Rode `pytest` localmente antes de abrir o PR. Mudanças em regras de negócio devem vir com testes.
4. Abra um Pull Request para `main`. O CI roda testes, lint, build e a análise do SonarQube Cloud automaticamente.
5. Só faça o merge com o CI verde e o quality gate aprovado. Peça revisão antes.

## Licença

Ainda não definida.
