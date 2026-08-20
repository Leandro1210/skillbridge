# SkillBridge

Plataforma que conecta talentos de tecnologia ao mercado de trabalho através da resolução de desafios práticos. Em vez de currículos, o estudante constrói um portfólio comprovado: resolve projetos reais propostos por empresas, ganha XP e sobe de nível conforme suas entregas são aprovadas.

Projeto Integrador do curso de Engenharia de Software (UniEVANGÉLICA).

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Django 5 + Django REST Framework + JWT (SimpleJWT) |
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Banco de dados | PostgreSQL (Supabase) |
| Hospedagem | Render (backend) + Vercel (frontend) |

## Estrutura do repositório

```
skillbridge/
├── manage.py
├── skillbridge/         # projeto Django (settings, urls, wsgi/asgi)
├── core/                 # app Django principal (models, views, serializers, urls)
├── frontend/              # SPA React (Vite)
├── docs/                  # documentação complementar (ver abaixo)
└── requirements.txt
```

## Como rodar localmente

### Pré-requisitos
- Python 3.11+
- Node.js 18+
- Uma instância PostgreSQL acessível (local ou Supabase)

### 1. Backend (Django)

```bash
# criar e ativar um ambiente virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# instalar dependências
pip install -r requirements.txt

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

```bash
# backend
python manage.py check

# frontend
cd frontend
npm run lint
npm run build
```

## Documentação complementar

A pasta [`docs/`](docs/) reúne documentação técnica mais aprofundada:

- [`documentacao-tecnica.md`](docs/documentacao-tecnica.md) — arquitetura, modelo de dados, endpoints da API e segurança.
- [`checklist-deploy.md`](docs/checklist-deploy.md) — passo a passo e checklist para deploy no Render/Vercel.
- [`guia-empresa.md`](docs/guia-empresa.md) — guia de uso da interface de empresas.
- [`historico-evolucao.md`](docs/historico-evolucao.md) — histórico de versão do projeto por fase.

## Contribuindo

1. Crie uma branch a partir de `main`: `git checkout -b feature/nome-da-sua-mudanca`.
2. Faça commits pequenos e com mensagens descritivas.
3. Abra um Pull Request para `main` — o CI vai rodar `manage.py check`, `npm run lint` e `npm run build` automaticamente.
4. Peça revisão antes de fazer merge.

## Licença

Ainda não definida.
