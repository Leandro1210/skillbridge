# SkillBridge — Documentação Técnica

Documento de referência técnica do projeto: arquitetura, modelo de dados, endpoints da API e decisões de segurança. Para instruções de instalação e execução local, veja o [`README.md`](../README.md) na raiz do repositório.

## Visão geral

SkillBridge conecta estudantes de tecnologia a empresas por meio de desafios técnicos práticos. Em vez de currículo, o estudante constrói um portfólio comprovado: resolve projetos reais propostos por empresas, envia entregas por etapa, e ganha XP conforme as entregas são aprovadas por um recrutador. O nível do usuário sobe automaticamente com o XP acumulado.

## Arquitetura

Aplicação cliente-servidor simples, sem partes distribuídas: um backend Django expõe uma API REST, consumida por uma SPA React.

```
Frontend (React + Vite)  →  API REST (Django + DRF)  →  PostgreSQL (Supabase)
     Vercel                      Render                    Supabase
```

- **Frontend**: SPA React sem roteador (a navegação entre telas é feita por estado em memória, não por URLs). Toda comunicação com o backend passa por um cliente Axios central (`frontend/src/api.js`).
- **Backend**: Django REST Framework, autenticação via JWT. Um único app Django (`core`) concentra models, views, serializers e regras de negócio.
- **Banco de dados**: PostgreSQL gerenciado pela Supabase, acessado via `DATABASE_URL` (padrão `dj-database-url`).
- **Fila de tarefas**: o projeto usa Celery no `INSTALLED_APPS`, mas roda em modo síncrono (`CELERY_TASK_ALWAYS_EAGER=True`) porque o ambiente de deploy gratuito não tem Redis disponível — não existe processamento assíncrono real hoje.

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | Django 5 + Django REST Framework + SimpleJWT |
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Design | Material Design 3 (paleta tonal, tipografia, componentes próprios em `frontend/src/components/ui/`) |
| Ícones | Material Symbols (SVGs individuais, não a fonte completa — ver `frontend/src/lib/icons.js`) |
| Banco de dados | PostgreSQL (Supabase) |
| Hospedagem | Render (backend) + Vercel (frontend) |
| CI | GitHub Actions (`manage.py check`, `npm run lint`, `npm run build`) |

## Modelo de dados

Entidades principais (ver `core/models.py` para a definição completa):

```
Usuario (extende AbstractUser, login por e-mail)
├─ nivel, xp_total, taxa_sucesso — recalculados a cada entrega aprovada
└─ empresa (FK opcional) — se preenchido, o usuário representa uma empresa

PerfilUsuario (1:1 com Usuario)
└─ bio, titulo, portfolio_url, instituicao_ensino, tecnologias

Empresa
└─ PerfilEmpresa (1:1) — website, área de atuação, stack tecnológico

Projeto (desafio publicado por uma empresa)
├─ dificuldade (facil | medio | dificil) → define o XP por etapa (100 | 250 | 500)
├─ nivel_minimo — trava a inscrição de estudantes abaixo desse nível
├─ ativo — controla se aparece no catálogo
└─ etapas (1:N) — cada uma com critérios técnicos e formato de entrega esperado

Inscricao (Usuario x Projeto, única por par)
└─ status: em_andamento | concluido

Entrega (submissão de uma etapa)
└─ status: pendente | aprovado | reprovado — avaliação é sempre manual, feita pela empresa
```

`Habilidade`, `HabilidadeUsuario`, `Vaga` e `RequisitoVaga` também existem no modelo (pensados para recomendação de vagas por competência), mas hoje nenhuma tela do sistema alimenta `HabilidadeUsuario` — o endpoint de vagas recomendadas está implementado, mas não tem dado real para funcionar na prática.

## Autenticação e segurança

- **JWT** (`djangorestframework-simplejwt`): token de acesso válido por 1h, refresh por 7 dias. A cada uso, o refresh token é rotacionado e o anterior é invalidado (blacklist) — por isso o frontend precisa salvar o novo refresh token a cada renovação, não só o access token.
- **Logout real**: `POST /api/auth/logout/` recebe o refresh token e o coloca na blacklist no servidor — sem isso, um token continuaria válido mesmo depois do usuário sair.
- **Armazenamento no frontend**: os tokens ficam em `localStorage`, centralizados em `frontend/src/auth.js` (fonte única — não há mais duplicação em `sessionStorage`).
- **CORS**: nunca libera todas as origens. Em desenvolvimento, aceita `localhost:5173`/`localhost:3000` por padrão; em produção, só as origens listadas em `CORS_ALLOWED_ORIGINS`.
- **Configuração segura por padrão**: `DEBUG` é `False` a menos que explicitamente ligado; `DJANGO_SECRET_KEY` e `DATABASE_URL` são obrigatórios fora de modo de desenvolvimento (o servidor recusa subir sem eles, em vez de usar um valor padrão inseguro). Em produção, HTTPS obrigatório, cookies seguros e HSTS ficam ativos automaticamente.
- **Autorização**: `ProjetoViewSet` e `EtapaViewSet` são somente leitura para usuários comuns — a criação/edição de desafios é feita exclusivamente por `EmpresaProjetoViewSet`, que confere se o usuário é dono da empresa responsável.

## Referência de endpoints

Todos os caminhos abaixo têm prefixo `/api/`.

| Método | Endpoint | Autenticação | Descrição |
|---|---|---|---|
| POST | `auth/register/` | não | Cria um novo usuário (aluno ou empresa) |
| POST | `auth/token/` | não | Login — retorna access + refresh |
| POST | `auth/token/refresh/` | não | Renova o access token |
| POST | `auth/logout/` | sim | Invalida o refresh token (blacklist) |
| GET/PATCH | `auth/me/` | sim | Perfil resumido do usuário logado |
| GET/PATCH | `perfil/usuario/` | sim | Perfil estendido do aluno |
| GET/PATCH | `perfil/empresa/` | sim | Perfil estendido da empresa |
| GET | `projetos/` | sim | Catálogo de desafios ativos |
| GET | `projetos/{id}/` | sim | Detalhe de um desafio, com etapas |
| POST | `projetos/{id}/iniciar/` | sim | Inscreve o usuário no desafio (checa nível mínimo) |
| GET | `inscricoes/` | sim | Inscrições do usuário logado |
| POST | `entregas/` | sim | Envia uma entrega para uma etapa |
| GET | `vagas/recomendadas/` | sim | Vagas compatíveis com as habilidades do usuário (sem dado real hoje) |
| GET/POST/PATCH/DELETE | `empresa/projetos/` | sim + empresa | CRUD dos desafios da própria empresa |
| POST | `empresa/projetos/{id}/publicar/` | sim + empresa | Publica um desafio (fica visível no catálogo) |
| POST | `empresa/projetos/{id}/desativar/` | sim + empresa | Remove o desafio do catálogo sem apagar dados |
| GET | `empresa/submissoes/` | sim + empresa | Lista entregas recebidas (filtro `?status=`) |
| PATCH | `empresa/submissoes/{id}/avaliar/` | sim + empresa | Aprova/reprova uma entrega e concede XP |
| GET | `empresa/dashboard/` | sim + empresa | Estatísticas agregadas da empresa |

## Fluxo principal (aluno → empresa)

1. Aluno se cadastra e faz login → recebe tokens JWT.
2. Aluno navega o catálogo (`GET /projetos/`) e inicia um desafio (`POST /projetos/{id}/iniciar/`), que cria uma `Inscricao`.
3. Aluno resolve a etapa localmente e envia a entrega (`POST /entregas/`) com o link do repositório — status inicial `pendente`.
4. Empresa vê a entrega em `empresa/submissoes/` e avalia manualmente (`PATCH .../avaliar/`) — não existe validação automática hoje, quem decide é a empresa.
5. Se aprovado: XP da etapa é somado ao usuário, o nível é recalculado (a cada 1000 XP sobe um nível), e a etapa seguinte é liberada.

## Variáveis de ambiente

Lista completa em [`.env.example`](../.env.example) na raiz. Resumo:

| Variável | Onde | Descrição |
|---|---|---|
| `DATABASE_URL` | Backend | Connection string do PostgreSQL |
| `DJANGO_SECRET_KEY` | Backend | Chave secreta do Django (obrigatória em produção) |
| `DJANGO_DEBUG` | Backend | `True`/`False` — padrão `False` |
| `DJANGO_ALLOWED_HOSTS` | Backend | Hosts aceitos, separados por vírgula |
| `CORS_ALLOWED_ORIGINS` | Backend | Origens do frontend aceitas pelo CORS |
| `VITE_API_URL` | Frontend | URL base da API |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` | Frontend | Credenciais públicas da Supabase (anon key) |

## Possíveis evoluções futuras

Ideias que ainda não foram implementadas, mantidas aqui como registro — não são compromissos de entrega:

- Popular `HabilidadeUsuario` de fato, pra deixar a recomendação de vagas funcional.
- Testes automatizados (não existe nenhum hoje, nem backend nem frontend).
- Notificação ao aluno quando uma entrega é avaliada (hoje ele só descobre ao abrir o app de novo).
- Upload de avatar.
- Adoção de um roteador real no frontend (`react-router-dom` está instalado mas não é usado).
