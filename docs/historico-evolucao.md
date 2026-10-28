# Histórico de Evolução do Projeto

Registro por fase do que foi implementado no SkillBridge — serve tanto de changelog quanto de histórico de versão do Projeto Integrador.

## Fase 1 — Base do produto (abril/maio de 2026)

Definição do nome e da proposta do produto, modelagem inicial do banco de dados, e primeira versão funcional do backend (Django + DRF) e do frontend (React).

## Fase 2 — Interface de empresa e perfis (30–31 de maio de 2026)

- Corrigido o fluxo de submissões: entregas paravam de ser aprovadas automaticamente por uma tarefa assíncrona e passaram a depender de avaliação manual da empresa.
- Adicionados os modelos `PerfilUsuario` (instituição de ensino, tecnologias, descrição) e `PerfilEmpresa` (website, área de atuação, stack tecnológico), com endpoints `GET`/`PATCH` próprios.
- Criadas as telas de perfil (visualizar e editar) para aluno e empresa, e a navegação para acessá-las.
- Ajustes de usabilidade: logo clicável para voltar ao início, botão "Voltar" nas telas de perfil, animações de entrada nos cards e formulários.

## Fase 3 — Auditoria de segurança e organização do repositório (agosto de 2026)

- **Vazamento de credenciais corrigido**: um arquivo `.env` com senha real do banco e chave secreta do Django havia sido commitado e removido do diretório de trabalho, mas continuava recuperável no histórico do git. As credenciais foram rotacionadas e o histórico do repositório foi reescrito para remover o arquivo de todos os commits.
- **Higiene do repositório**: `.gitignore` corrigido (arquivos de cache Python e do Vite estavam sendo versionados por engano), scripts soltos com senha fixa no código removidos, documentação solta na raiz organizada em `docs/`, README novo, CI (GitHub Actions) e template de Pull Request adicionados.
- **Correções de backend**: XP deixava de ser salvo ao aprovar uma entrega (bug real, silencioso); usuários comuns conseguiam editar desafios de outras empresas por falta de checagem de permissão; entregas eram aceitas sem checar se o aluno realmente tinha se inscrito no projeto; consultas N+1 no dashboard da empresa; `settings.py` com valores inseguros por padrão (`DEBUG` ligado, `ALLOWED_HOSTS` aberto).
- **Correções de frontend**: token de login duplicado e dessincronizado entre `sessionStorage` e `localStorage`, causando logout forçado; redirecionamento para uma rota `/login` que não existe (a aplicação não usa roteador); tela de carregamento que travava para sempre se o perfil falhasse ao carregar.
- **Logout de verdade**: antes, um token de acesso continuava válido mesmo depois do usuário sair. Foi adicionada uma blacklist de tokens no backend com endpoint de logout dedicado.

## Fase 4 — Reformulação visual (agosto de 2026)

A interface original usava um visual escuro genérico, sem uma direção de design própria: fundo azul-marinho, gradientes em roxo/indigo, glassmorphism, ícones misturando SVG, emoji e setas de texto.

- **Primeira passada**: nova paleta de cores e tipografia, mantendo a estrutura de tela igual.
- **Segunda passada**: adoção do **Material Design 3** (Google) como sistema de referência — paleta tonal (cores derivadas de papéis semânticos como `primary`/`secondary`/`tertiary` + níveis de superfície), escala tipográfica e de forma do M3, e substituição dos ícones por Material Symbols. Componentes de interface próprios (`Button`, `Card`, `Input`, `Badge`, `Modal` etc.) criados em `frontend/src/components/ui/` para eliminar duplicação de estilos entre telas.
- **Terceira passada**: mudanças estruturais de layout, não só de cor — navegação da empresa passou de abas no topo para uma *Navigation Rail* (padrão M3) em telas largas; botão de ação principal virou um *FAB* flutuante; listas de conteúdo sequencial (submissões) passaram a usar linhas densas com divisores em vez de um cartão para cada item; título padronizado no topo de cada página; layouts em colunas nos dashboards em vez de tudo empilhado.

## Fase 5 — Qualidade de código com SonarQube for IDE (outubro de 2026)

Adoção da extensão **SonarQube for IDE** (antigo SonarLint) no VS Code para análise estática local do backend (Python) e do frontend (JavaScript/JSX). Os alertas apontados foram revisados um a um. Os que eram problemas reais foram corrigidos, e os falsos positivos foram identificados e mantidos como estavam. Até aqui o uso é só local: a análise no CI (SonarQube Cloud) ainda não foi configurada.

- **Chave secreta de desenvolvimento**: o `settings.py` tinha uma `SECRET_KEY` fixa no código, usada como fallback quando `DEBUG` está ligado. Ela passou a ser gerada aleatoriamente a cada inicialização (`get_random_secret_key()`). Assim não há mais segredo no código, e quem roda o projeto localmente continua sem precisar configurar nada. Produção segue exigindo `DJANGO_SECRET_KEY`.
- **Acessibilidade do modal**: o componente `Modal` usava uma `div` com `role="dialog"` e um fundo clicável que só funcionava com mouse, e o foco do teclado "vazava" para a página de trás. Ele passou a usar o elemento nativo `<dialog>` com `showModal()`: o navegador prende o foco dentro do modal e trata o Esc e o fundo escurecido.
- **Stepper do workspace acessível por teclado**: as etapas do projeto eram `div`s clicáveis. Viraram `<button>` com `aria-current`, então podem ser focadas e selecionadas pelo teclado.
- **Listas de tecnologias/ferramentas**: as `key` do React usavam o índice do array. Agora usam o próprio nome do item. Na mesma mudança, os itens passam por `trim`, entradas vazias são descartadas (vírgula sobrando gerava etiqueta vazia) e duplicadas são removidas. Isso afeta o perfil do estudante, o perfil da empresa, os desafios da empresa e o workspace do projeto.
- **Promises não tratadas**: chamadas assíncronas disparadas em `useEffect` e após ações (publicar, desativar, excluir desafio, avaliar submissão) agora são marcadas explicitamente com `void`, deixando claro que o erro já é tratado dentro da própria função. No cliente da API (`api.js`), `return Promise.reject(error)` dentro de função `async` virou `throw error`.
- **Legibilidade**: ternários aninhados foram substituídos por variáveis calculadas antes do JSX (texto do botão de login, cor do selo de taxa de sucesso, ícone e status de cada etapa, conteúdo da área do estudante em `App.jsx`), e `parseInt` virou `Number.parseInt`.
- **Comando `seed_demo`**: o método `handle` passou do limite de complexidade cognitiva (20 contra 15 permitidos) e foi dividido em métodos menores, um por etapa (usuário, projetos, habilidades, empresas/vagas, credenciais). Também foram removidas f-strings sem variáveis. O comportamento continua o mesmo.
- **Falso positivo identificado**: a extensão aponta a diretiva `@theme` do `index.css` como regra CSS desconhecida. Na verdade, `@theme` é sintaxe do Tailwind CSS 4 e gera as classes utilitárias do projeto. Trocá-la por `:root` (como o alerta sugere) quebraria o visual, então ela foi mantida.

Todas as mudanças foram verificadas com `manage.py check`, `npm run lint` e `npm run build`. O `seed_demo` também foi executado duas vezes contra um banco SQLite temporário, para confirmar que cria os dados e não os duplica.

## Fase 6 — Testes automatizados e SonarQube Cloud no CI (outubro de 2026)

Até aqui o projeto não tinha nenhum teste automatizado, e a análise do SonarQube era só local. Nesta fase o backend ganhou uma base de testes, e o pipeline do GitHub Actions passou a rodar os testes e enviar a análise e a cobertura ao SonarQube Cloud em todo Pull Request.

- **Infraestrutura de testes**: adoção do **pytest** com `pytest-django` e `pytest-cov`. Os testes rodam com settings próprios (`skillbridge/settings_test.py`), sobre um banco SQLite em memória. Assim não dependem do `.env` e nunca tocam o banco real. As fixtures compartilhadas (usuários, empresa, projeto, inscrição) ficam em `core/tests/conftest.py`.
- **Primeiros 32 testes**, concentrados nas regras de negócio de maior risco:
  - concessão de XP e recálculo de nível e taxa de sucesso;
  - bloqueio de reavaliação (que evita XP duplicado);
  - permissões entre empresas;
  - regras de envio de entrega (inscrição obrigatória, projeto ativo, etapa já aprovada);
  - registro de aluno e de empresa, incluindo a validação de senha;
  - logout, confirmando que o refresh token realmente deixa de funcionar.

  Cobertura alcançada: 100% nos serializers, 93% nos models e 68% nas views.
- **CI ampliado**: o job de backend passou a instalar `requirements-dev.txt` e rodar o `pytest`, publicando o relatório de cobertura. Um novo job, **SonarQube Cloud**, roda só depois dos testes passarem e envia a análise estática (Python e JavaScript) e a cobertura. O resultado do quality gate aparece em cada Pull Request.
- **Cobertura com caminhos corretos**: a cobertura passou a ser medida a partir da raiz do repositório, com caminhos relativos. Na configuração inicial, os arquivos saíam sem a pasta (`urls.py` em vez de `core/urls.py`), e o SonarQube não conseguiria distinguir `core/urls.py` de `skillbridge/urls.py`.
- **Escopo da métrica de cobertura**: o frontend (ainda sem testes) e os arquivos de configuração e scripts (`settings`, `asgi`/`wsgi`, `supabase_config`, `seed_demo`) ficaram fora da métrica, para que ela reflita as regras de negócio. O falso positivo do `@theme` (Fase 5) foi registrado na configuração da análise.
- **Backend com cobertura completa**: numa segunda rodada, os testes passaram de 32 para **79**, cobrindo o que faltava:
  - inscrição em projetos e catálogo;
  - vagas recomendadas;
  - gestão de desafios pela empresa, incluindo o isolamento entre empresas;
  - listagem e filtro de submissões;
  - perfis, e o isolamento das listas de cada aluno.

  `views.py`, `models.py`, `serializers.py` e `signals.py` chegaram a **100% de cobertura**. Os novos testes revelaram dois problemas, registrados na [documentação técnica](documentacao-tecnica.md#problemas-conhecidos-revelados-pelos-testes):
  - a lista de desafios da empresa não devolve o campo `ativo`, então a tela mostra tudo como "Rascunho";
  - as vagas recomendadas são paginadas sem ordenação definida.
- **Testes do frontend**: adoção do **Vitest** com **Testing Library** e **jsdom**, com **98 testes** e 85% de cobertura de linhas. Os testes cobrem:
  - o armazenamento dos tokens;
  - os interceptors do Axios: renovação do token com o refresh girado, um único refresh para vários 401 simultâneos, logout quando a renovação falha;
  - as decisões de tela do `App`;
  - o login, incluindo a recusa de uma conta do tipo errado sem revelar que a senha estava certa;
  - os fluxos do aluno (catálogo, workspace, dashboard) e da empresa (desafios, submissões, painel);
  - o `Modal`, o `ErrorBoundary` e as telas de perfil.

  O CI passou a rodar esses testes, com o Node atualizado de 20 para 22 (exigência do Vitest), e a enviar a cobertura do frontend ao SonarQube. Como o Vitest grava os caminhos relativos a `frontend/`, o CI acrescenta esse prefixo ao relatório antes da análise, o mesmo tipo de ajuste feito na cobertura do backend.

  Os testes revelaram três problemas no frontend, registrados na [documentação técnica](documentacao-tecnica.md#testes-do-frontend):
  - campos de formulário cujo rótulo não está ligado ao campo;
  - atalhos do painel da empresa que não funcionam pelo teclado;
  - duas telas de visualização de perfil que não são usadas em lugar nenhum.

## O que ainda não existe

Para não deixar dúvida sobre o estado atual do projeto:
- dois problemas do backend apontados pelos testes ainda não foram corrigidos (campo `ativo` na lista de desafios da empresa e ordenação das vagas recomendadas);
- os problemas do frontend apontados pelos testes também não foram corrigidos (rótulos de formulário, atalhos sem teclado, telas de perfil não usadas);
- não há validação automática de código nas entregas (a avaliação é sempre manual pela empresa);
- não há notificações;
- o sistema de recomendação de vagas por habilidade está implementado, mas sem dado real para funcionar;
- a branch `main` ainda não está protegida por regra que exija CI verde para o merge.

Essas lacunas estão detalhadas em [`documentacao-tecnica.md`](documentacao-tecnica.md#possíveis-evoluções-futuras).


Seguranca
Complexidade
Declaracao implicita
Usabilidade para pc e mobile
