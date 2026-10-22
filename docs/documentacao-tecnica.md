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
| Testes | pytest + pytest-django + pytest-cov (backend) |
| CI | GitHub Actions (`manage.py check`, `pytest`, `npm run lint`, `npm run build`) |
| Qualidade | SonarQube Cloud (no CI) + SonarQube for IDE (no editor) |

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

## Testes automatizados

O backend tem testes com **pytest** (via `pytest-django`), em `core/tests/`. O frontend ainda não tem testes.

### Configuração

| Arquivo | Papel |
|---|---|
| `pytest.ini` | Aponta para `skillbridge.settings_test`, define `core/tests` como pasta de testes e liga a cobertura (`--cov`), com saída no terminal e em `coverage.xml` |
| `skillbridge/settings_test.py` | Importa os settings normais e troca o banco por **SQLite em memória**. Também força `DJANGO_DEBUG=True`: sem isso, o `SECURE_SSL_REDIRECT` de produção faria toda requisição de teste receber 301. Os testes nunca acessam o banco do Supabase. |
| `.coveragerc` | Mede a cobertura a partir da raiz, com `relative_files = True`, para os caminhos saírem como `core/views.py`, o formato que o SonarQube precisa. Ignora migrations, os próprios testes, `asgi`/`wsgi` e `settings_test` |
| `requirements-dev.txt` | `requirements.txt` + `pytest`, `pytest-django`, `pytest-cov` |
| `core/tests/conftest.py` | Fixtures compartilhadas: `api_client`, `estudante`, `empresa`, `usuario_empresa`, `projeto` (com 1 etapa) e `inscrito` |

Os testes de API usam o `APIClient` do DRF com `force_authenticate`, que autentica sem precisar gerar JWT. O padrão de cada teste é preparar os dados, chamar o endpoint e conferir **o status HTTP e o estado do banco depois**: por exemplo, que uma reavaliação recusada não concedeu XP de novo.

### O que já está coberto

| Arquivo | Cobre |
|---|---|
| `test_models.py` | XP por dificuldade, recálculo de nível (a cada 1000 XP), taxa de sucesso (ignorando pendentes, e zero sem entregas avaliadas), criação automática do perfil, `__str__` de todos os models |
| `test_auth.py` | Registro de aluno e de empresa, senha criptografada e nunca devolvida na resposta, senhas diferentes, senha fraca, e-mail duplicado, campos obrigatórios de empresa, logout (incluindo que o refresh token deixa de funcionar depois dele) |
| `test_entregas.py` | Envio de entrega: aluno não inscrito, etapa inexistente, projeto inativo, etapa já aprovada, URL inválida, caminho feliz (fica `pendente`) |
| `test_empresa.py` | Avaliação: aprovação concede XP e sobe nível, reprovação com feedback, outra empresa não pode avaliar, entrega aprovada não pode ser reavaliada, status inválido, estudante não acessa rota de empresa. Dashboard com as contagens |
| `test_empresa_desafios.py` | Gestão de desafios: criação vincula a empresa e gera a etapa principal; cada empresa vê, edita, exclui, publica e desativa só os próprios desafios (os da concorrente retornam 404). Submissões: só as dos próprios desafios, com filtro `?status=` |
| `test_projetos.py` | Iniciar projeto (inscrição, duplicada, nível insuficiente, projeto inativo); catálogo (esconde inativos, filtro `?disponiveis=true`, lista resumida e detalhe com etapas, exige login); escrita bloqueada em `projetos/` e `etapas/` para não administradores; filtro de etapas por projeto; lista de inscrições isolada por aluno |
| `test_vagas.py` | Vagas recomendadas: aparece só com **todos** os requisitos no nível exigido (incluindo o nível exato); some com nível abaixo ou requisito faltando; vaga sem requisitos não é recomendada; habilidade de outro aluno não conta |
| `test_perfis.py` | `auth/me` (dados do logado, exige login, altera nome, **não** altera XP/nível/taxa); perfil do aluno (GET/PATCH, URL inválida); perfil da empresa (bloqueado para estudante, criado no primeiro acesso, PATCH); lista de entregas isolada por aluno |

Na última medição eram **79 testes** (mais 1 marcado como falha esperada, abaixo), com **100% de cobertura** em `views.py`, `models.py`, `serializers.py` e `signals.py`.

### Problemas conhecidos, revelados pelos testes

- **Desafios da empresa sem o campo `ativo`**: o `ProjetoSerializer` não devolve `ativo`, mas a tela de desafios da empresa usa esse campo para mostrar "Ativo" ou "Rascunho". O teste `test_lista_de_desafios_informa_se_esta_ativo` documenta isso com `xfail(strict=True)`: ele "falha como esperado" hoje e passa a acusar erro assim que o campo for adicionado, lembrando de remover a marcação.
- **Vagas recomendadas sem ordenação**: o `annotate(Count(...))` em `VagaRecomendadaView` faz o Django ignorar a ordenação padrão de `Vaga` (`-publicada_em`), e o DRF avisa (`UnorderedObjectListWarning`) que a paginação pode repetir ou pular itens entre páginas. A correção é acrescentar `.order_by('-publicada_em')` ao queryset.

## Integração contínua e análise de qualidade

O workflow `.github/workflows/ci.yml` roda a cada push na `main` e em todo Pull Request para a `main`:

| Job | Etapas |
|---|---|
| `Backend (Django)` | Python 3.12 → `pip install -r requirements-dev.txt` → `manage.py check` → `pytest` → publica o `coverage.xml` como artefato |
| `Frontend (React)` | Node 20 → `npm ci` → `npm run lint` → `npm run build` |
| `SonarQube Cloud` | Roda depois do backend (`needs: backend`). Baixa o `coverage.xml` e executa o scanner (`SonarSource/sonarqube-scan-action`) com o secret `SONAR_TOKEN`. Se o secret não estiver disponível (por exemplo, em PR vindo de fork), o passo é pulado em vez de quebrar o CI |

A configuração da análise fica em `sonar-project.properties`:
- **Projeto**: organização `leandro1210`, chave `Leandro1210_skillbridge`.
- **Código analisado**: `core`, `skillbridge` e `frontend/src`, com os testes declarados à parte (`sonar.tests=core/tests`). Migrations e assets ficam fora.
- **Cobertura**: lida de `coverage.xml`. O frontend fica fora da métrica de cobertura até ganhar testes, assim como arquivos de configuração (`settings*`, `asgi`, `wsgi`, `supabase_config`) e o comando `seed_demo`.
- **Falso positivo ignorado**: a regra `css:S4662` em `frontend/src/index.css`, porque `@theme` é diretiva do Tailwind CSS 4.

O "Automatic Analysis" do SonarQube Cloud precisa ficar **desligado**, porque a análise é feita pelo CI. No editor, a extensão SonarQube for IDE pode ser conectada ao mesmo projeto (Connected Mode) para usar as mesmas regras e os mesmos alertas já revisados.

## Possíveis evoluções futuras

Ideias que ainda não foram implementadas, mantidas aqui como registro — não são compromissos de entrega:

- Popular `HabilidadeUsuario` de fato, pra deixar a recomendação de vagas funcional.
- Corrigir os dois [problemas conhecidos](#problemas-conhecidos-revelados-pelos-testes) apontados pelos testes do backend.
- Criar os testes do frontend (Vitest + Testing Library), incluindo a cobertura do frontend no SonarQube.
- Proteger a branch `main` (ruleset do GitHub) exigindo CI verde e quality gate aprovado para fazer merge.
- Remover ou passar a usar `skillbridge/supabase_config.py`, que hoje não é importado em lugar nenhum.
- Notificação ao aluno quando uma entrega é avaliada (hoje ele só descobre ao abrir o app de novo).
- Upload de avatar.
- Adoção de um roteador real no frontend (`react-router-dom` está instalado mas não é usado).
