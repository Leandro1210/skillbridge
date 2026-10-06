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

## O que ainda não existe

Para não deixar dúvida sobre o estado atual do projeto: não há testes automatizados (nem backend, nem frontend), não há validação automática de código nas entregas (a avaliação é sempre manual pela empresa), não há notificações, e o sistema de recomendação de vagas por habilidade está implementado mas sem dado real para funcionar. A análise estática com SonarQube ainda é só local, pela extensão no editor: falta integrar o SonarQube Cloud ao CI (GitHub Actions), com quality gate nos Pull Requests. Essas lacunas estão detalhadas em [`documentacao-tecnica.md`](documentacao-tecnica.md#possíveis-evoluções-futuras).
