# SkillBridge: Documentação Técnica

Este documento reúne a referência técnica do projeto: arquitetura, modelo de dados, regras de negócio, endpoints da API, telas, identidade visual, testes e decisões de segurança. As instruções de instalação e de execução local encontram-se no [`README.md`](../README.md), na raiz do repositório.

## Visão geral

O SkillBridge aproxima empresas e estudantes em busca da primeira experiência profissional. Em lugar de um currículo tradicional, o estudante demonstra o que sabe fazer:

- **As empresas publicam processos seletivos.** Cada processo é composto por uma **vaga**, que descreve o que a empresa oferece e espera, e por um **desafio** relacionado a ela, destinado a avaliar o conhecimento do candidato.
- **Os desafios são abertos a todos os estudantes.** A decisão sobre a aptidão do candidato cabe à empresa, que analisa a solução enviada e o perfil acadêmico, como ocorre em um processo seletivo convencional.
- **O perfil do estudante é acadêmico.** Reúne curso, período, estudos em andamento, projetos de disciplinas com repositório, produção científica, certificados, histórico de participações e um selo com a contagem de aprovações.
- **O XP mede atividade, e não competência.** Indica o nível de engajamento do estudante no semestre, é reiniciado a cada semestre e não concede nem restringe acesso a nenhuma funcionalidade.

## Arquitetura

A aplicação segue o modelo cliente-servidor, sem componentes distribuídos: um backend em Django expõe uma API REST consumida por uma aplicação de página única (SPA) em React.

```
Frontend (React + Vite)  →  API REST (Django + DRF)  →  PostgreSQL (Supabase)
     Vercel                      Render                    Supabase
```

- **Frontend:** SPA em React com **React Router**, na qual cada tela possui URL própria (ver [Telas e rotas](#telas-e-rotas)). Toda comunicação com o backend passa por um cliente Axios centralizado (`frontend/src/api.js`). O arquivo `frontend/vercel.json` redireciona todas as rotas para o `index.html`, o que evita o erro 404 ao recarregar uma rota interna na Vercel.
- **Backend:** Django REST Framework com autenticação por JWT. Um único app Django (`core`) concentra models, views e serializers. As regras do XP de atividade estão isoladas em `core/xp.py`.
- **Banco de dados:** PostgreSQL gerenciado pela Supabase, acessado por meio da variável `DATABASE_URL` (padrão `dj-database-url`). Em desenvolvimento, na ausência de `DATABASE_URL` e com `DJANGO_DEBUG=True`, utiliza-se SQLite local.
- **Fila de tarefas:** o Celery consta em `INSTALLED_APPS`, porém opera em modo síncrono (`CELERY_TASK_ALWAYS_EAGER=True`), pois o ambiente gratuito de implantação não dispõe de Redis. Atualmente não há processamento assíncrono.

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | Django 5, Django REST Framework e SimpleJWT |
| Frontend | React 19, Vite, Tailwind CSS 4 e React Router 7 |
| Identidade visual | Manual de marca (`docs/SkillBridge-Manual-de-Marca.pdf`), descrito em [Identidade visual e interface](#identidade-visual-e-interface) |
| Tipografia | Montserrat (títulos) e Inter (texto e interface), via `@fontsource` |
| Ícones | Material Symbols, importados como SVGs individuais (`frontend/src/lib/icons.js`) |
| Banco de dados | PostgreSQL (Supabase) |
| Hospedagem | Render (backend) e Vercel (frontend) |
| Testes | pytest, pytest-django e pytest-cov (backend); Vitest e Testing Library (frontend) |
| Integração contínua | GitHub Actions (`manage.py check`, `pytest`, `npm run lint`, `npm run coverage`, `npm run build`) |
| Qualidade de código | SonarQube Cloud (no CI) e SonarQube for IDE (no editor) |

## Modelo de dados

Principais entidades (a definição completa está em `core/models.py`):

```
Usuario (estende AbstractUser; login por e-mail)
└─ empresa (FK opcional): quando preenchida, o usuário representa uma empresa

PerfilUsuario (1:1 com Usuario): perfil acadêmico do estudante
├─ curso, instituicao_ensino, periodo_atual (1 a 12), estudando_atualmente
├─ titulo, bio, tecnologias, github_url, linkedin_url, portfolio_url
├─ certificados: texto livre redigido pelo estudante (um certificado por linha)
└─ mostrar_atividade: define se as empresas veem o XP e o gráfico do semestre (padrão: não)

ProjetoAcademico (N:1 com Usuario): projeto de disciplina
└─ titulo, disciplina, periodo, repo_url (obrigatório), tecnologias, descricao, destaque
   único por (estudante, repo_url)

Publicacao (N:1 com Usuario): produção científica
└─ titulo, tipo (artigo | resumo | tcc | iniciacao_cientifica | outro), veiculo, ano, url, coautores
   único por (estudante, url)

Empresa: nome, setor, descricao
└─ PerfilEmpresa (1:1): área de atuação, cidade, site, e-mail e telefone de contato,
   LinkedIn, Instagram, GitHub, logo (URL), stack e cultura

Projeto: um processo seletivo, composto pela VAGA e pelo DESAFIO
├─ vaga: vaga_titulo, vaga_modalidade (remoto | presencial | hibrido), vaga_descricao, vaga_tecnologias
├─ desafio: titulo, descricao (enunciado), ferramentas e dificuldade, que representa o nível
│  (iniciante | intermediario | avancado)
├─ status: rascunho, publicado ou encerrado; publicado_em; prazo (opcional)
├─ periodo_recomendado (opcional): apenas informativo, sem caráter restritivo
├─ aceita_entregas (propriedade): verdadeira quando publicado e dentro do prazo
└─ etapas (1:N): cada uma com critérios técnicos e formato de entrega

Inscricao (Usuario x Projeto, única por par): participação do estudante
└─ status: em_andamento | concluido

Entrega (submissão de uma etapa)
└─ repo_url, status (pendente | aprovado | reprovado), feedback_validacao; avaliação sempre manual

LancamentoXP: registro de um ganho de XP de atividade
└─ usuario, origem, referencia, xp, temporada ("2026.2"), criado_em
   único por (usuário, origem, referência), o que impede contagem em duplicidade
```

Os models `Habilidade`, `HabilidadeUsuario`, `Vaga` e `RequisitoVaga` também existem, concebidos para a recomendação de vagas por competência. Contudo, nenhuma tela alimenta `HabilidadeUsuario`, de modo que o endpoint de vagas recomendadas, embora implementado, não dispõe de dados reais. A vaga exibida no feed corresponde aos campos `vaga_*` do `Projeto`, e não ao model `Vaga`.

### Migrações recentes

| Migração | Conteúdo |
|---|---|
| `0011_nivel_do_desafio` | Converte os valores de dificuldade (`facil`, `medio`, `dificil`) para os níveis `iniciante`, `intermediario` e `avancado`, com reversão disponível |
| `0012_perfil_certificados` | Adiciona o campo de texto `certificados` ao perfil do estudante |

## Regras de negócio

### Vaga e desafio

Cada processo seletivo possui duas partes, apresentadas em momentos distintos:
1. **A vaga** é exibida no feed: título, modalidade, descrição e o que a empresa espera que o candidato saiba. Título, descrição e tecnologias da vaga são obrigatórios na criação.
2. **O desafio** é exibido ao acionar "Ver desafio": enunciado, ferramentas, nível (iniciante, intermediário ou avançado), etapas e critérios de avaliação. O desafio não repete a vaga; trata-se de uma atividade relacionada, destinada a verificar o conhecimento do candidato.

Desafios criados antes dessa separação, sem dados de vaga, continuam funcionais: o título e a descrição do desafio ocupam o lugar da vaga.

### Ciclo de vida do desafio

- Todo desafio é criado como **rascunho** e somente aparece no feed após ser **publicado**. A empresa pode **encerrá-lo**, o que o retira do feed e interrompe participações e entregas, e pode **reabri-lo**.
- O status é alterado exclusivamente pelas ações `publicar` e `encerrar`, nunca por edição direta.
- Um desafio com **prazo vencido** deixa o feed e para de aceitar entregas, ainda que publicado.
- A página de um desafio encerrado permanece acessível aos participantes, para consulta das entregas e do retorno da empresa.

### Participação e avaliação

- **Qualquer estudante pode participar de qualquer desafio publicado.** Não há restrição por nível; o período recomendado tem caráter apenas orientativo.
- Uma entrega exige inscrição no desafio e que o desafio esteja aceitando entregas. Uma etapa já aprovada não admite nova entrega.
- A **avaliação é sempre manual** e cabe à empresa responsável pelo desafio, que aprova a solução ou solicita ajustes, sempre com um retorno escrito. Uma entrega aprovada não pode ser reavaliada.
- Na tela do estudante, cada etapa apresenta o acompanhamento em três passos (**Participando**, **Solução enviada** e **Avaliação**), o retorno da empresa e o histórico de envios. Quando há solicitação de ajustes, o estudante pode enviar uma nova versão.

### XP de atividade

O XP mede o **comprometimento no semestre, e não a competência**. Todas as regras estão em `core/xp.py`.

- **A temporada corresponde ao semestre do calendário:** 2026.1 compreende janeiro a junho, e 2026.2, julho a dezembro. O XP é reiniciado a cada temporada sem que nenhum registro seja apagado: o XP vigente é a soma dos lançamentos da temporada atual, e as anteriores compõem o histórico.
- **Fontes de XP:**

| Origem | XP | Limite | Momento da concessão |
|---|---|---|---|
| Acesso diário | 5 | 1 por dia | Ao abrir a aplicação (`POST atividade/acesso/`) |
| Perfil do semestre | 50 | 1 por temporada | Ao salvar o perfil com período e estudos em andamento preenchidos |
| Projeto acadêmico | 40 | 4 por mês | Ao adicionar um projeto; a remoção estorna o XP |
| Publicação | 80 | 2 por mês | Ao adicionar uma publicação; a remoção estorna o XP |
| Participação em desafio | 60 | 1 por desafio | No primeiro envio de solução |
| Avaliação recebida | 20 | 1 por desafio | Quando a empresa avalia, **seja a solução aprovada ou não** |

- **Níveis de atividade:** Inativo (abaixo de 100), Ativo (a partir de 100), Muito ativo (a partir de 500) e Destaque (a partir de 1000).
- **A aprovação não gera XP de competência.** Ela é apresentada no perfil como um **selo com a contagem geral de aprovações**, correspondente ao número de desafios distintos com entrega aprovada, sem identificar quais.
- Os certificados não geram XP.
- Usuários de empresa não acumulam XP.

### Certificados

Os certificados são informados pelo estudante em **texto livre**, um por linha, no campo `certificados` do perfil. Para a exibição, o frontend interpreta cada linha (`frontend/src/lib/certificados.js`):

- as partes podem ser separadas por vírgula, ponto e vírgula, barra vertical ou hífen entre espaços;
- marcadores no início da linha ("-", "•", "*", "1.") são desconsiderados;
- o ano (de 1950 a 2099) e a carga horária ("40h", "40 horas") são reconhecidos e exibidos como etiquetas;
- a primeira parte restante é tratada como o nome do curso, e as demais, como detalhes (por exemplo, a instituição).

Nenhum elemento é obrigatório: uma linha que contenha apenas o nome do curso também é exibida.

### Privacidade do perfil do estudante

- O perfil público do estudante (`alunos/{id}/`) é visível para **empresas** e para o **próprio estudante**. Um estudante não tem acesso ao perfil de outro.
- O **histórico de desafios informa apenas a participação** (desafio, empresa e data), nunca o resultado. O retorno da empresa é visível somente para o estudante.
- A **atividade** (XP e gráfico do semestre) só é incluída na resposta da API quando o estudante habilita a opção "mostrar atividade". Com a opção desabilitada, o dado não é enviado, em vez de apenas ocultado na tela.

## Autenticação e segurança

- **JWT** (`djangorestframework-simplejwt`): o token de acesso é válido por 1 hora e o de renovação, por 7 dias. A cada uso, o token de renovação é substituído e o anterior é invalidado (blacklist). Por esse motivo, o frontend armazena o novo token de renovação a cada renovação, e não apenas o token de acesso.
- **Encerramento de sessão no servidor:** `POST /api/auth/logout/` recebe o token de renovação e o inclui na blacklist, impedindo que permaneça válido após a saída do usuário.
- **Armazenamento no frontend:** os tokens são mantidos em `localStorage`, com acesso centralizado em `frontend/src/auth.js`.
- **CORS:** nenhuma configuração libera todas as origens. Em desenvolvimento, aceitam-se `localhost:5173` e `localhost:3000`; em produção, apenas as origens listadas em `CORS_ALLOWED_ORIGINS`.
- **Configuração segura por padrão:** `DEBUG` permanece `False` salvo ativação explícita; `DJANGO_SECRET_KEY` e `DATABASE_URL` são obrigatórios fora do modo de desenvolvimento. Em produção, HTTPS obrigatório, cookies seguros e HSTS são ativados automaticamente.
- **Validação de identificadores vindos da URL:** as páginas que leem um `:id` da rota (`/alunos/:id`, `/empresas/:id` e `/desafios/:id`) aceitam apenas números inteiros positivos (`frontend/src/lib/rotas.js`). Qualquer outro valor resulta na mensagem de item não encontrado, sem chamada à API. A medida impede que um link forjado, como `/alunos/..%2Fempresa%2Fsubmissoes`, leve a página a acionar outro endpoint com o token do usuário.
- **Autorização:**
  - `ProjetoViewSet` e `EtapaViewSet` são somente leitura para usuários comuns. A criação e a edição de desafios ocorrem exclusivamente por `EmpresaProjetoViewSet`, que apresenta a cada empresa apenas os próprios desafios (os de outras empresas retornam 404).
  - As rotas de atividade e de projetos e publicações acadêmicas são restritas a estudantes (`IsStudentUser`); as rotas `empresa/...`, a empresas (`IsCompanyUser`).
  - Cada estudante visualiza e altera apenas os próprios projetos, publicações, entregas e inscrições.

## Referência de endpoints

Todos os caminhos abaixo possuem o prefixo `/api/`. As listagens são paginadas, com os itens no campo `results`.

**Autenticação e usuário**

| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| POST | `auth/register/` | Público | Cria um usuário (estudante ou empresa) |
| POST | `auth/token/` | Público | Autenticação; retorna os tokens de acesso e de renovação |
| POST | `auth/token/refresh/` | Público | Renova o token de acesso |
| POST | `auth/logout/` | Autenticado | Invalida o token de renovação (blacklist) |
| GET, PATCH | `auth/me/` | Autenticado | Dados básicos do usuário autenticado |

**Estudante**

| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| GET | `projetos/` | Autenticado | Feed com os desafios publicados e dentro do prazo, dos mais recentes aos mais antigos. Filtros `?q=` (vaga ou desafio), `?dificuldade=` (nível) e `?tecnologia=`. Cada item informa a empresa, `participantes` e `ja_participa` |
| GET | `projetos/{id}/` | Autenticado | Página do desafio (publicado ou encerrado), com vaga, etapas e `aceita_entregas` |
| POST | `projetos/{id}/iniciar/` | Autenticado | Inscrição no desafio (403 quando o desafio não aceita participações) |
| GET | `etapas/?projeto_id=` | Autenticado | Etapas de um desafio |
| GET | `inscricoes/` | Autenticado | Desafios dos quais o estudante participa |
| GET, POST | `entregas/` | Autenticado | Entregas do próprio estudante e envio de uma entrega |
| GET, PATCH | `perfil/usuario/` | Autenticado | Perfil acadêmico do estudante, incluindo o campo `certificados` |
| GET, POST, PATCH, DELETE | `perfil/projetos/` | Estudante | Projetos acadêmicos (a criação retorna `xp_ganho`) |
| GET, POST, PATCH, DELETE | `perfil/publicacoes/` | Estudante | Publicações (a criação retorna `xp_ganho`) |
| POST | `atividade/acesso/` | Estudante | Registra o acesso do dia (5 XP, uma vez por dia) |
| GET | `perfil/atividade/` | Estudante | XP e nível da temporada, série semanal, temporadas anteriores e limites do mês |
| GET | `alunos/{id}/` | Empresa ou o próprio estudante | Perfil público do estudante (ver [Privacidade](#privacidade-do-perfil-do-estudante)) |
| GET | `empresas/{id}/` | Autenticado | Perfil público da empresa, com indicadores e desafios publicados e encerrados |
| GET | `vagas/recomendadas/` | Autenticado | Vagas compatíveis com as habilidades do usuário (sem dados reais no momento) |

**Empresa**

| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| GET, POST, PATCH, DELETE | `empresa/projetos/` | Empresa | Vagas e desafios da própria empresa, com `participantes`, `submissoes` e `aprovados` |
| POST | `empresa/projetos/{id}/publicar/` | Empresa | Publica ou reabre o desafio |
| POST | `empresa/projetos/{id}/encerrar/` | Empresa | Encerra o desafio |
| GET | `empresa/submissoes/` | Empresa | Entregas recebidas, com candidato, etapa e desafio. Filtros `?status=`, `?desafio=` e `?q=` (nome ou e-mail) |
| PATCH | `empresa/submissoes/{id}/avaliar/` | Empresa | Aprova a entrega ou solicita ajustes, com retorno escrito |
| GET | `empresa/dashboard/` | Empresa | Dados do painel, descritos a seguir |
| GET, PATCH | `perfil/empresa/` | Empresa | Perfil da empresa (nome, setor, contatos e redes sociais) |

O endpoint `empresa/dashboard/` retorna, além dos totais por status de desafios e de soluções:
- a identificação da empresa (nome, área de atuação, cidade e logo);
- a quantidade de soluções recebidas nos últimos 7 dias;
- a série semanal de soluções recebidas nas últimas 12 semanas, com semanas sem envios incluídas;
- a fila de até cinco soluções pendentes, das mais antigas às mais recentes, com candidato e vaga;
- até cinco processos publicados, cada um com o funil de participantes, soluções e aprovados, além das soluções pendentes;
- a lista de itens ainda não preenchidos no perfil da empresa.

## Telas e rotas

| Rota | Usuário | Tela |
|---|---|---|
| `/` | Estudante | Feed de oportunidades, com o resumo da atividade do semestre e a faixa "Seus desafios" |
| `/desafios/:id` | Estudante | Vaga, desafio e área de participação (acompanhamento, critérios, envio e histórico) |
| `/perfil` | Estudante | Perfil acadêmico do próprio estudante, com a atividade sempre visível |
| `/perfil/editar` | Estudante | Edição do perfil, dos certificados, dos projetos e das publicações |
| `/empresas/:id` | Estudante e empresa | Perfil público da empresa; para o estudante, os desafios abertos levam à página de cada um |
| `/empresa` | Empresa | Painel com indicadores, gráfico semanal, fila de avaliação e funil dos processos |
| `/empresa/desafios` | Empresa | Criação e gestão de vagas e desafios |
| `/empresa/submissoes` | Empresa | Avaliação das entregas; o nome do candidato leva ao respectivo perfil |
| `/empresa/perfil` | Empresa | Edição do perfil da empresa, com acesso ao perfil público |
| `/alunos/:id` | Empresa | Perfil acadêmico de um candidato |

Rotas desconhecidas, ou pertencentes a outro tipo de usuário, redirecionam para a página inicial do usuário autenticado.

## Identidade visual e interface

A interface segue o manual de marca (`docs/SkillBridge-Manual-de-Marca.pdf`). Os tokens de design estão definidos em `frontend/src/index.css`, e os componentes reutilizáveis, em `frontend/src/components/ui/`.

### Cores e tipografia

| Cor | Valor | Uso aproximado | Aplicação |
|---|---|---|---|
| Azul Bridge | `#0058F0` | 18% | Ações principais, links, foco e destaques |
| Azul-noturno | `#01183A` | 20% | Texto, menu lateral e superfícies de maior peso |
| Verde Conexão | `#02BC9A` | 7% | Sucesso e indicação do próximo passo |
| Branco e névoa | `#FFFFFF` e `#F4F7FC` | 55% | Fundo da página (névoa) e cartões (branco) |

O Verde Conexão não oferece contraste suficiente para texto sobre fundo branco; por isso, textos e ícones de sucesso utilizam uma variação mais escura do mesmo tom, e o verde original é reservado a preenchimentos.

Os títulos utilizam **Montserrat** (Bold e ExtraBold) e os demais textos, **Inter** (Regular, Medium e Semibold). Os raios de borda seguem a orientação do manual (8 px, 16 px e formato de pílula).

### Componentes

- **Botões em formato de pílula:** primário (Azul Bridge), secundário (contorno azul), sucesso (Verde Conexão com texto Azul-noturno), tonal e uma variante para fundos escuros.
- **Etiquetas em pílula:** tons de destaque, sucesso, alerta, erro, neutro e Azul-noturno (utilizado na etiqueta "Desafio de seleção").
- **Cartões:** fundo branco, borda sutil e sombra suave; quando interativos, elevam-se levemente sob o cursor.
- **Textos:** nenhum texto de cartão é truncado. Títulos, nomes e descrições quebram em várias linhas, e uma regra global de quebra de palavras impede que URLs ou palavras extensas ultrapassem os limites dos cartões.

### Grafismos

O componente `ui/Grafismo.jsx` reproduz os grafismos de apoio do manual em SVG: faixas diagonais paralelas, círculos posicionados no prolongamento das faixas e uma grade de pontos interligados. As composições seguem regras fixas (mesmo ângulo de 27 graus, espaçamento uniforme e área de desenho calculada a partir das formas), de modo que nenhum elemento é cortado. Cada local utiliza uma variação distinta, para evitar repetição:

| Variação | Local |
|---|---|
| Ponte (três faixas em escada e dois círculos) | Tela de entrada e capa do perfil da empresa |
| Trilhas (duas faixas e um círculo) | Destaque do feed |
| Pessoas (duas faixas, cada uma com um círculo) | Capa do perfil do estudante |
| Pontos (grade com dois pontos interligados) | Painel da empresa e estados vazios |

### Movimento e carregamento

- As páginas entram com transição suave de opacidade e deslocamento, e os itens de listas e grades surgem em sequência.
- Os elementos dos grafismos entram deslizando e, em seguida, flutuam em ritmos próprios; as barras dos funis crescem ao serem exibidas.
- O carregamento de tela inteira apresenta o símbolo da marca e três faixas animadas (`ui/Carregando.jsx`); carregamentos menores utilizam um indicador circular em azul e verde, e os blocos de espera exibem um brilho azulado.
- Todas as animações são desativadas quando o sistema operacional do usuário solicita redução de movimento.

### Estrutura das páginas

- **Telas largas:** menu lateral em Azul-noturno, com o símbolo da marca no topo, os destinos de navegação e a opção "Sair" na base. Nessas telas não há barra superior.
- **Telas pequenas:** barra superior com a logo e a opção "Sair", e barra de navegação inferior.
- **Rodapé:** discreto, na cor da página, separado por uma linha fina e com a logo centralizada; permanece sempre ao final da página.

## Fluxo principal

1. A empresa cria um processo seletivo (vaga e desafio), inicialmente como rascunho, e o publica.
2. O estudante visualiza a vaga no feed, abre o desafio e seleciona **Participar**, o que gera uma `Inscricao`.
3. O estudante resolve o desafio e envia o link do repositório (`POST entregas/`). A entrega fica com status `pendente`, e o estudante recebe o XP de participação.
4. A empresa visualiza a entrega no painel ou em `empresa/submissoes/`, consulta o perfil acadêmico do candidato e realiza a avaliação, aprovando a solução ou solicitando ajustes, sempre com um retorno. O estudante recebe o XP de avaliação recebida.
5. Havendo solicitação de ajustes, o estudante consulta o retorno e envia uma nova versão. Havendo aprovação, ela passa a integrar o selo do perfil.

## Variáveis de ambiente

A lista completa encontra-se em [`.env.example`](../.env.example), na raiz do repositório. Resumo:

| Variável | Local | Descrição |
|---|---|---|
| `DATABASE_URL` | Backend | String de conexão do PostgreSQL; na ausência dela, em desenvolvimento, utiliza-se SQLite local |
| `DJANGO_SECRET_KEY` | Backend | Chave secreta do Django (obrigatória em produção) |
| `DJANGO_DEBUG` | Backend | `True` ou `False`; o padrão é `False` |
| `DJANGO_ALLOWED_HOSTS` | Backend | Hosts aceitos, separados por vírgula |
| `CORS_ALLOWED_ORIGINS` | Backend | Origens do frontend aceitas pelo CORS |
| `VITE_API_URL` | Frontend | URL base da API |
| `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY` | Frontend | Credenciais públicas da Supabase (chave anônima) |

**Dados de demonstração:** o comando `python manage.py seed_demo` cria empresas com perfil, processos seletivos (vaga e desafio, com uma etapa e seus critérios), um estudante com perfil acadêmico e atividade na temporada, e uma conta de empresa. As credenciais são exibidas ao final da execução. O comando pode ser executado novamente sem duplicar dados.

## Testes automatizados

O backend é testado com **pytest** (por meio do `pytest-django`), em `core/tests/`. O frontend é testado com **Vitest** e **Testing Library**, conforme descrito em [Testes do frontend](#testes-do-frontend).

### Configuração

| Arquivo | Função |
|---|---|
| `pytest.ini` | Aponta para `skillbridge.settings_test`, define `core/tests` como diretório de testes e ativa a medição de cobertura (`--cov`), com saída no terminal e em `coverage.xml` |
| `skillbridge/settings_test.py` | Importa as configurações padrão e substitui o banco por **SQLite em memória**. Também define `DJANGO_DEBUG=True`, pois, sem isso, o `SECURE_SSL_REDIRECT` de produção faria todas as requisições de teste receberem o código 301. Os testes nunca acessam o banco da Supabase |
| `.coveragerc` | Mede a cobertura a partir da raiz, com `relative_files = True`, para que os caminhos sejam registrados como `core/views.py`, formato exigido pelo SonarQube. Desconsidera migrações, os próprios testes, `asgi`, `wsgi` e `settings_test` |
| `requirements-dev.txt` | Dependências de `requirements.txt` acrescidas de `pytest`, `pytest-django` e `pytest-cov` |
| `core/tests/conftest.py` | Fixtures compartilhadas: `api_client`, `estudante`, `outro_estudante`, `empresa`, `usuario_empresa`, `usuario_outra_empresa`, `projeto` (vaga e desafio publicados, com uma etapa) e `inscrito` |

Os testes de API utilizam o `APIClient` do DRF com `force_authenticate`, que autentica sem gerar JWT. Cada teste prepara os dados, chama o endpoint e verifica **o código HTTP e o estado do banco após a operação**, por exemplo, que uma reavaliação recusada não deixou alterações.

### Cobertura do backend

| Arquivo | Testes | Escopo |
|---|---|---|
| `test_xp.py` | 28 | Temporadas, concessão, unicidade, limite mensal e liberação no mês seguinte, estorno, níveis, série semanal, temporadas anteriores, contagem de aprovações e endpoints de acesso diário e de atividade |
| `test_projetos.py` | 25 | Feed (apenas publicados e dentro do prazo, ordenação, filtros por vaga, desafio e nível, empresa e participantes), página do desafio, participação aberta, desafios encerrados, vencidos e em rascunho, bloqueio de escrita, etapas e inscrições isoladas por estudante |
| `test_perfil_academico.py` | 23 | Campos do semestre, projetos e publicações (XP, limite, estorno e duplicidade), certificados em texto livre, perfil público com regras de privacidade e submissões com os dados do candidato |
| `test_empresa_desafios.py` | 18 | Obrigatoriedade da vaga, criação como rascunho, publicação, encerramento e reabertura, isolamento entre empresas, submissões e filtro por status |
| `test_auth.py` | 13 | Cadastro de estudante e de empresa, senha criptografada e nunca retornada, validações e invalidação do token de renovação no logout |
| `test_empresa.py` | 13 | Avaliação (aprovação e reprovação contam como atividade uma única vez por desafio, isolamento entre empresas, entrega aprovada não reavaliada, status inválido) e painel (identidade, desafios por status, série semanal, fila de pendentes, funil dos processos e itens pendentes do perfil) |
| `test_empresa_perfil.py` | 12 | Edição do perfil da empresa, perfil público com indicadores, números de participação na gestão e filtros de submissões por desafio e candidato |
| `test_perfis.py` | 10 | `auth/me`, perfis de estudante e de empresa e isolamento das entregas |
| `test_vagas.py` | 8 | Vagas recomendadas, considerando todos os requisitos no nível exigido |
| `test_models.py` | 7 | `aceita_entregas` (status e prazo), criação automática do perfil e representação textual dos models |
| `test_entregas.py` | 6 | Envio de entrega: inscrição obrigatória, etapa inexistente, desafio encerrado, etapa já aprovada e URL inválida |

Na última medição, o backend contava com **163 testes** e **100% de cobertura** em `views.py`, `models.py`, `serializers.py` e `xp.py`.

### Testes do frontend

Os testes são executados com **Vitest** em ambiente **jsdom** (navegador simulado) e utilizam a **Testing Library** para renderizar os componentes e reproduzir a interação do usuário (`user-event`). A configuração está no bloco `test` de `frontend/vite.config.js`, e a preparação comum, em `frontend/src/test/setup.js`, que inclui:
- os matchers do jest-dom (`toBeInTheDocument`, `toBeDisabled` e outros);
- a limpeza do DOM, do `localStorage` e dos mocks entre os testes;
- uma implementação mínima de `showModal()` e `close()`, não oferecida pelo jsdom e utilizada pelo componente `Modal`.

Componentes que utilizam rotas são renderizados com o auxiliar `src/test/renderComRotas.jsx`, que monta um roteador em memória na URL desejada. A API é sempre simulada com `vi.mock('../api')`, de modo que os testes não dependem do backend. A exceção é `api.test.js`, que verifica os interceptors reais do Axios substituindo apenas o *adapter*, responsável pela requisição de rede.

O ambiente jsdom não aplica as folhas de estilo. Por esse motivo, elementos exibidos ou ocultados conforme a largura da tela (como os dois botões "Sair", um no menu lateral e outro na barra do celular) estão ambos presentes durante os testes.

| Arquivo | Escopo |
|---|---|
| `auth.test.js`, `api.test.js` | Tokens e evento de logout; renovação do token com substituição do token de renovação, renovação única para várias respostas 401 simultâneas e logout quando a renovação falha |
| `App.test.jsx` | Sessão (login, carregamento, erro e logout), rotas de estudante e de empresa, incluindo o bloqueio entre elas, e registro do acesso diário apenas para estudantes |
| `AuthPage.test.jsx` | Login, cadastro e recusa de conta do tipo incorreto sem revelar a validade da senha |
| `FeedPage`, `DesafioPage`, `ProjectWorkspace` | Cartão da vaga, filtros, vaga e desafio na página, participação, acompanhamento em três passos, ajustes solicitados, aprovação, envio, histórico e abas exibidas apenas com várias etapas |
| `AtividadeResumo`, `GraficoAtividade`, `GraficoSolucoes` | XP, nível e progresso; gráficos semanais com tooltip por mouse e teclado, visão em tabela, escala e estado vazio |
| `PerfilAlunoPage`, `PerfilEditarPage` | Perfil acadêmico nas visões da empresa e do estudante, privacidade da atividade, histórico sem resultado, certificados em cartões e edição com pré-visualização |
| `PerfilEmpresaPage`, `ProfileEdit`, `ui/EmpresaLogo` | Perfil público da empresa, edição do perfil e logo com alternativa textual |
| `CompanyChallenges`, `CompanySubmissions`, `CompanyDashboard` | Formulário de vaga e desafio, publicação, encerramento e reabertura, filtros e avaliação de submissões, e painel (cabeçalho, indicadores, resumo semanal, fila de avaliação, funil, situação das soluções e pendências do perfil) |
| `ui/Modal`, `ErrorBoundary`, `lib/*` | Modal, tela de recuperação de erro, datas relativas, vocabulários, listas de tecnologias, leitura dos certificados e validação de identificadores de rota |

Na última medição, o frontend contava com **215 testes** em 26 arquivos e **96% de cobertura de linhas**.

## Integração contínua e análise de qualidade

O workflow `.github/workflows/ci.yml` é executado a cada push na branch `main` e em todo Pull Request destinado a ela:

| Job | Etapas |
|---|---|
| `Backend (Django)` | Python 3.12, instalação de `requirements-dev.txt`, `manage.py check`, `pytest` e publicação do `coverage.xml` como artefato |
| `Frontend (React)` | Node 22, `npm ci`, `npm run lint`, `npm run coverage`, ajuste dos caminhos do `lcov.info` (prefixo `frontend/`), publicação do relatório como artefato e `npm run build` |
| `SonarQube Cloud` | Executado após os jobs de backend e frontend (`needs: [backend, frontend]`). Obtém o `coverage.xml` e o `lcov.info` e executa o scanner (`SonarSource/sonarqube-scan-action`) com o secret `SONAR_TOKEN`. Na ausência do secret, como em Pull Requests de forks, a etapa é ignorada sem interromper o CI |

A configuração da análise está em `sonar-project.properties`:
- **Projeto:** organização `leandro1210`, chave `Leandro1210_skillbridge`.
- **Código analisado:** `core`, `skillbridge` e `frontend/src`, com os testes declarados separadamente (`core/tests` e os arquivos `*.test.js` e `*.test.jsx` do frontend) por meio de `sonar.test.inclusions`. Migrações e assets são excluídos.
- **Cobertura:** obtida de `coverage.xml` (backend) e de `frontend/coverage/lcov.info` (frontend). Ficam fora da métrica os arquivos de configuração (`settings*`, `asgi`, `wsgi`, `supabase_config`), o comando `seed_demo` e o `main.jsx`.
- **Falso positivo desconsiderado:** a regra `css:S4662` em `frontend/src/index.css`, uma vez que `@theme` é uma diretiva do Tailwind CSS 4.

A análise automática (*Automatic Analysis*) do SonarQube Cloud deve permanecer **desativada**, pois a análise é realizada pelo CI. No editor, a extensão SonarQube for IDE pode ser conectada ao mesmo projeto (*Connected Mode*), de modo a utilizar as mesmas regras e os alertas já revisados.

## Possíveis evoluções futuras

As propostas a seguir ainda não foram implementadas e estão registradas apenas como referência, sem constituir compromisso de entrega:

- **Testes de ponta a ponta com Playwright:** os testes atuais verificam backend e frontend de forma isolada, e duas falhas de integração já passaram despercebidas por eles (o campo `ativo` ausente na API e as submissões sem o nome do candidato). Um teste de toda a jornada (publicação pela empresa, participação do estudante, avaliação e consulta do retorno) detectaria esse tipo de falha.
- **Validação dos projetos acadêmicos e dos certificados:** atualmente as informações são declaradas pelo próprio estudante. Poderia haver validação por professores ou confirmação pela empresa.
- **Notificação ao estudante quando uma entrega for avaliada:** hoje o retorno é consultado ao abrir o desafio.
- Alimentar efetivamente `HabilidadeUsuario`, ou remover o model `Vaga`, que se tornou redundante em relação à vaga do `Projeto`.
- Proteger a branch `main` por meio de ruleset do GitHub, exigindo CI aprovado e quality gate satisfeito para o merge.
- Remover ou passar a utilizar `skillbridge/supabase_config.py`, que atualmente não é importado.
- Permitir o envio de avatar e de logo; atualmente a logo da empresa é informada por URL, pois o disco do servidor de implantação é efêmero.
