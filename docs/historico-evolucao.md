# Histórico de Evolução do Projeto

Este documento registra, por fase, o que foi implementado no SkillBridge. Serve tanto como registro de alterações quanto como histórico de versões do Projeto Integrador.

## Fase 1: Base do produto (abril e maio de 2026)

Definição do nome e da proposta do produto, modelagem inicial do banco de dados e primeira versão funcional do backend (Django e DRF) e do frontend (React).

## Fase 2: Interface da empresa e perfis (30 e 31 de maio de 2026)

- Correção do fluxo de submissões: as entregas deixaram de ser aprovadas automaticamente por uma tarefa assíncrona e passaram a depender da avaliação manual da empresa.
- Inclusão dos modelos `PerfilUsuario` (instituição de ensino, tecnologias e descrição) e `PerfilEmpresa` (site, área de atuação e stack tecnológico), com endpoints `GET` e `PATCH` próprios.
- Criação das telas de visualização e edição de perfil para estudantes e empresas, bem como da navegação até elas.
- Ajustes de usabilidade: logo com retorno à página inicial, botão "Voltar" nas telas de perfil e animações de entrada em cartões e formulários.

## Fase 3: Auditoria de segurança e organização do repositório (agosto de 2026)

- **Correção de vazamento de credenciais:** um arquivo `.env` contendo a senha do banco e a chave secreta do Django havia sido versionado e, embora removido do diretório de trabalho, permanecia recuperável no histórico do Git. As credenciais foram substituídas e o histórico do repositório foi reescrito para eliminar o arquivo de todos os commits.
- **Organização do repositório:** correção do `.gitignore` (arquivos de cache do Python e do Vite estavam sendo versionados indevidamente), remoção de scripts avulsos com senha fixa no código, organização da documentação em `docs/`, elaboração de um novo README e inclusão de CI (GitHub Actions) e de modelo de Pull Request.
- **Correções no backend:** o XP deixava de ser registrado na aprovação de uma entrega; usuários comuns conseguiam editar desafios de outras empresas por ausência de verificação de permissão; entregas eram aceitas sem confirmar a inscrição do estudante; havia consultas N+1 no painel da empresa; e o `settings.py` adotava valores inseguros por padrão (`DEBUG` ativado e `ALLOWED_HOSTS` irrestrito).
- **Correções no frontend:** o token de login estava duplicado e dessincronizado entre `sessionStorage` e `localStorage`, provocando logout forçado; havia redirecionamento para uma rota `/login` inexistente; e a tela de carregamento permanecia indefinidamente quando o perfil não carregava.
- **Encerramento de sessão no servidor:** um token de acesso permanecia válido mesmo após a saída do usuário. Foi incluída uma blacklist de tokens no backend, com endpoint de logout dedicado.

## Fase 4: Reformulação visual (agosto de 2026)

A interface original adotava um visual escuro genérico, sem direção de design própria: fundo azul-marinho, gradientes em roxo e índigo, efeito de vidro e ícones que misturavam SVG, emoji e setas de texto.

- **Primeira etapa:** nova paleta de cores e tipografia, mantida a estrutura das telas.
- **Segunda etapa:** adoção do **Material Design 3** como sistema de referência, com paleta tonal (cores derivadas de papéis semânticos como `primary`, `secondary` e `tertiary`, além de níveis de superfície), escalas tipográfica e de forma do M3 e substituição dos ícones por Material Symbols. Componentes próprios (`Button`, `Card`, `Input`, `Badge`, `Modal` e outros) foram criados em `frontend/src/components/ui/` para eliminar a duplicação de estilos entre telas.
- **Terceira etapa:** alterações estruturais de layout. A navegação da empresa passou de abas no topo para um menu lateral (*Navigation Rail*) em telas largas; a ação principal passou a ser um botão flutuante; as listas sequenciais, como as submissões, passaram a usar linhas com divisores; os títulos de página foram padronizados; e os painéis passaram a ser organizados em colunas.

## Fase 5: Qualidade de código com SonarQube for IDE (outubro de 2026)

Adoção da extensão **SonarQube for IDE** (antigo SonarLint) no VS Code para a análise estática local do backend (Python) e do frontend (JavaScript e JSX). Os alertas foram revisados individualmente: os problemas reais foram corrigidos e os falsos positivos, identificados e mantidos. Nesta fase o uso foi apenas local, sem análise no CI.

- **Chave secreta de desenvolvimento:** o `settings.py` continha uma `SECRET_KEY` fixa, utilizada quando `DEBUG` estava ativado. A chave passou a ser gerada aleatoriamente a cada inicialização (`get_random_secret_key()`), eliminando o segredo do código sem exigir configuração adicional em ambiente local. A produção continua a exigir `DJANGO_SECRET_KEY`.
- **Acessibilidade do modal:** o componente `Modal` utilizava uma `div` com `role="dialog"` e um fundo acionável apenas pelo mouse, e o foco do teclado escapava para a página subjacente. O componente passou a utilizar o elemento nativo `<dialog>` com `showModal()`, que mantém o foco no modal e trata a tecla Esc e o fundo escurecido.
- **Etapas acessíveis por teclado:** as etapas do projeto eram elementos `div` clicáveis e passaram a ser elementos `<button>` com `aria-current`, acessíveis pelo teclado.
- **Listas de tecnologias e ferramentas:** as chaves (`key`) do React utilizavam o índice do array e passaram a utilizar o nome do item. Na mesma alteração, os itens passaram a ser normalizados com `trim`, as entradas vazias foram descartadas e as duplicadas, removidas.
- **Promises não tratadas:** chamadas assíncronas disparadas em `useEffect` e após ações (publicar, desativar, excluir desafio e avaliar submissão) passaram a ser marcadas explicitamente com `void`, indicando que o erro é tratado na própria função. No cliente da API (`api.js`), `return Promise.reject(error)` em função `async` foi substituído por `throw error`.
- **Legibilidade:** operadores ternários aninhados foram substituídos por variáveis calculadas antes do JSX, e `parseInt` foi substituído por `Number.parseInt`.
- **Comando `seed_demo`:** o método `handle` excedia o limite de complexidade cognitiva (20, para um máximo de 15) e foi dividido em métodos menores, um por etapa. Também foram removidas f-strings sem variáveis, mantido o comportamento.
- **Falso positivo identificado:** a extensão apontava a diretiva `@theme` do `index.css` como regra CSS desconhecida. Trata-se, porém, de sintaxe do Tailwind CSS 4, responsável pela geração das classes utilitárias; sua substituição por `:root`, como sugerido, comprometeria o visual, razão pela qual foi mantida.

Todas as alterações foram verificadas com `manage.py check`, `npm run lint` e `npm run build`. O `seed_demo` também foi executado duas vezes em um banco SQLite temporário, para confirmar que cria os dados sem duplicá-los.

## Fase 6: Testes automatizados e SonarQube Cloud no CI (outubro de 2026)

Até esta fase, o projeto não possuía testes automatizados, e a análise do SonarQube era apenas local. O backend passou a contar com uma base de testes, e o pipeline do GitHub Actions passou a executar os testes e a enviar a análise e a cobertura ao SonarQube Cloud em todo Pull Request.

- **Infraestrutura de testes:** adoção do **pytest** com `pytest-django` e `pytest-cov`. Os testes utilizam configurações próprias (`skillbridge/settings_test.py`) e um banco SQLite em memória, o que os torna independentes do `.env` e impede o acesso ao banco real. As fixtures compartilhadas ficam em `core/tests/conftest.py`.
- **Primeiros 32 testes**, concentrados nas regras de negócio de maior risco:
  - concessão de XP e recálculo de nível e de taxa de sucesso;
  - bloqueio de reavaliação, que evita XP em duplicidade;
  - permissões entre empresas;
  - regras de envio de entrega (inscrição obrigatória, projeto ativo e etapa já aprovada);
  - cadastro de estudante e de empresa, incluindo a validação de senha;
  - logout, com a confirmação de que o token de renovação deixa de funcionar.

  Cobertura alcançada: 100% nos serializers, 93% nos models e 68% nas views.
- **Ampliação do CI:** o job de backend passou a instalar `requirements-dev.txt` e a executar o `pytest`, publicando o relatório de cobertura. Um novo job, **SonarQube Cloud**, executado somente após a aprovação dos testes, envia a análise estática (Python e JavaScript) e a cobertura. O resultado do quality gate passou a ser exibido em cada Pull Request.
- **Caminhos de cobertura:** a cobertura passou a ser medida a partir da raiz do repositório, com caminhos relativos. Na configuração inicial, os arquivos eram registrados sem o diretório (`urls.py` em vez de `core/urls.py`), o que impediria o SonarQube de distinguir `core/urls.py` de `skillbridge/urls.py`.
- **Escopo da métrica de cobertura:** os arquivos de configuração e os scripts (`settings`, `asgi`, `wsgi`, `supabase_config` e `seed_demo`) foram excluídos da métrica, para que ela represente as regras de negócio. O falso positivo do `@theme` (Fase 5) foi registrado na configuração da análise.
- **Cobertura integral do backend:** em uma segunda etapa, os testes passaram de 32 para **79**, abrangendo inscrições e catálogo, vagas recomendadas, gestão de desafios pela empresa com isolamento entre empresas, listagem e filtro de submissões e perfis. `views.py`, `models.py`, `serializers.py` e `signals.py` atingiram **100% de cobertura**. Os novos testes revelaram dois problemas, corrigidos na Fase 7:
  - a lista de desafios da empresa não retornava o campo `ativo`, e a tela exibia todos os desafios como "Rascunho";
  - as vagas recomendadas eram paginadas sem ordenação definida.
- **Testes do frontend:** adoção do **Vitest** com **Testing Library** e **jsdom**, com **98 testes** e 85% de cobertura de linhas, abrangendo o armazenamento dos tokens, os interceptors do Axios, as decisões de tela do `App`, o login, os fluxos de estudante e de empresa, o `Modal`, o `ErrorBoundary` e as telas de perfil. O CI passou a executar esses testes, com o Node atualizado da versão 20 para a 22 (requisito do Vitest), e a enviar a cobertura do frontend ao SonarQube. Os testes revelaram três problemas no frontend, também corrigidos na Fase 7:
  - campos de formulário com rótulo não associado ao campo;
  - atalhos do painel da empresa inacessíveis pelo teclado;
  - duas telas de visualização de perfil sem uso.

## Fase 7: Nova estrutura, com oportunidades, XP de atividade e perfis (novembro de 2026)

O produto foi reformulado a partir de uma questão central: o que uma empresa precisa observar para decidir se um estudante atende a uma vaga? A versão anterior tratava o XP como medida de competência e restringia os desafios pelo nível, o que contrariava a lógica de um processo seletivo, no qual a aptidão do candidato é avaliada pela empresa. O trabalho foi realizado na branch `feat/nova-estrutura`, em etapas, cada uma validada localmente antes da seguinte.

- **Rotas:** o frontend adotou o React Router. Cada tela passou a ter URL própria (`/`, `/desafios/:id`, `/perfil`, `/empresa/desafios` e outras), o botão de voltar do navegador passou a funcionar e os links passaram a poder ser compartilhados. O `vercel.json` permite que a Vercel sirva a aplicação em qualquer rota.
- **Processo seletivo composto por vaga e desafio:** o feed apresenta a **vaga** (título, modalidade, descrição e conhecimentos esperados), e a opção "Ver desafio" apresenta o **desafio** relacionado. Desafios antigos, sem vaga, permanecem funcionais.
- **Desafios abertos, com ciclo de vida:** a restrição por nível foi eliminada. Todo desafio é criado como rascunho, e a empresa decide quando publicá-lo, encerrá-lo ou reabri-lo, podendo definir prazo e período recomendado (informativo). A tela inicial do estudante passou a ser um **feed de oportunidades**, com busca e filtro por nível.
- **XP de atividade por semestre:** o XP passou a medir o engajamento do estudante, e não a competência. Ele decorre do acesso diário, da atualização do perfil no semestre, da inclusão de projetos e publicações, da participação em desafios e do recebimento de avaliações, aprovadas ou não. Cada fonte possui limite (diário, mensal, semestral ou por desafio), e nenhum lançamento é contabilizado em duplicidade. O XP é reiniciado a cada semestre do calendário, e os semestres anteriores compõem o histórico. Os pontos antigos, apenas de demonstração, foram descartados. O estudante acompanha sua atividade em um **gráfico semanal** acessível, com tooltip por teclado e visão em tabela.
- **Perfil acadêmico do estudante:** curso, período, estudos em andamento, links, projetos de disciplinas com repositório e produção científica. O histórico de desafios informa apenas a **participação**, e as aprovações são apresentadas como um **selo com a contagem geral**, sem identificar os desafios. O gráfico de atividade somente é exibido às empresas mediante autorização do estudante; sem ela, a API não envia esses dados.
- **Perfil completo da empresa:** área de atuação, cidade, contatos, redes sociais e logo, além do histórico de desafios abertos e encerrados com o número de participantes. Na gestão, cada desafio apresenta participantes, submissões e aprovados. As submissões passaram a contar com filtros por desafio e por candidato, e o nome do candidato direciona ao seu perfil acadêmico.
- **Área de participação reformulada:** a tela do estudante no desafio apresenta o acompanhamento em três passos (participando, solução enviada e avaliação), o retorno da empresa em destaque, os critérios de avaliação e o histórico de envios. As três etapas fixas dos desafios de demonstração, redundantes, foram unificadas em uma etapa ("Entrega da solução"), e as abas de etapa passaram a ser exibidas apenas quando há mais de uma.
- **Correções:**
  - a lista de desafios da empresa exibia todos como "Rascunho", pois o campo `ativo` não era retornado pela API; o campo foi substituído pelo status;
  - as vagas recomendadas e a lista de desafios da empresa passaram a ter ordenação definida;
  - a lista de submissões da empresa retornava apenas identificadores e exibia o candidato em branco; passou a retornar nome, etapa e desafio;
  - os rótulos dos formulários foram associados aos respectivos campos, e os atalhos do painel da empresa tornaram-se links acessíveis pelo teclado;
  - o texto do botão "Ver desafio" não era exibido em branco, pois uma regra base do CSS prevalecia sobre as classes do Tailwind; a regra foi movida para `@layer base`;
  - o ícone de passo concluído não havia sido registrado e era exibido vazio;
  - os filtros do feed foram alinhados e passaram a ter a mesma altura do campo de busca;
  - as telas antigas sem uso (painel, catálogo e telas de perfil anteriores) foram removidas.
- **Testes:** o backend passou de 79 para **156 testes**, com 100% de cobertura em `views.py`, `models.py`, `serializers.py` e no novo `xp.py`. O frontend passou de 98 para **185 testes**, com cerca de 96% de cobertura de linhas. Os testes de regras extintas (restrição por nível e XP por aprovação) foram substituídos pelos das novas regras.

## Fase 8: Identidade visual da marca e refinamentos (novembro de 2026)

Esta fase aplicou o manual de marca a toda a interface, corrigiu os problemas apontados pelo SonarQube Cloud no Pull Request da nova estrutura e incorporou ajustes solicitados durante a validação local.

- **Correções apontadas pelo SonarQube Cloud (16 ocorrências):**
  - *Segurança:* a página de perfil do estudante utilizava o identificador da URL diretamente no caminho da API, o que permitiria a um link forjado direcionar a requisição a outro endpoint com o token do usuário. Foi criada a função `idDaRota` (`frontend/src/lib/rotas.js`), que aceita apenas números inteiros positivos, aplicada também às páginas de desafio e de perfil da empresa;
  - *Manutenção:* rótulos repetidos nos models foram convertidos em constantes; uma variável sem uso foi removida; os componentes de formulário de projetos e publicações foram extraídos para o nível do módulo;
  - *Acessibilidade:* mensagens de estado passaram a utilizar o elemento `<output>`, as abas de etapa passaram a ser um `<fieldset>`, a barra de progresso passou a ser um `<progress>` nativo e um texto ambíguo junto a uma caixa de seleção foi delimitado.
- **Novo painel da empresa:** cabeçalho com a identidade da empresa e a situação das avaliações; quatro indicadores (desafios abertos, candidatos, soluções recebidas e taxa de aprovação); gráfico de soluções recebidas por semana nas últimas 12 semanas, com resumo da semana atual, média e melhor semana; fila de soluções aguardando avaliação, das mais antigas às mais recentes; funil de cada processo aberto (participantes, soluções e aprovados); situação das soluções por status; e lembrete dos itens pendentes no perfil. O endpoint `empresa/dashboard/` foi ampliado para fornecer esses dados.
- **Níveis dos desafios:** as classificações "fácil", "médio" e "difícil" foram substituídas por **iniciante**, **intermediário** e **avançado** em todo o sistema, inclusive nos valores armazenados. A migração `0011_nivel_do_desafio` converte os desafios existentes e admite reversão. Na interface, o campo passou a ser denominado "Nível".
- **Textos sem truncamento:** títulos, nomes e descrições dos cartões deixaram de ser cortados com reticências e passaram a quebrar em várias linhas. Uma regra global de quebra de palavras impede que URLs ou palavras extensas ultrapassem os limites dos cartões.
- **Aplicação do manual de marca:**
  - cores oficiais (Azul Bridge, Azul-noturno, Verde Conexão e névoa) e tipografia **Montserrat** nos títulos e **Inter** no texto, em substituição à Roboto;
  - componentes revistos conforme o manual: botões e etiquetas em formato de pílula, raios de 8 e 16 px, cartões com borda sutil e sombras suaves;
  - grafismos de apoio do manual (faixas diagonais, círculos e pontos interligados) implementados em SVG animado, com composições alinhadas, sem cortes e com variações distintas por tela;
  - animações de entrada de páginas e listas, flutuação dos grafismos e indicadores de carregamento próprios da marca, todos desativados quando o usuário solicita redução de movimento;
  - nova tela de entrada, com painel em Azul Bridge, título "Mostre o que você já construiu." e a logo sobre o fundo branco do formulário;
  - capas com grafismos nos perfis do estudante e da empresa e destaque no topo do feed;
  - menu lateral em Azul-noturno nas telas largas, com a opção "Sair" na base e sem barra superior; rodapé discreto, sempre posicionado ao final da página.
- **Certificados no perfil do estudante:** campo de texto livre no perfil (migração `0012_perfil_certificados`), preenchido com um certificado por linha. Na exibição, cada linha torna-se um cartão, com reconhecimento automático do ano e da carga horária; na edição, há orientação de preenchimento e pré-visualização do resultado. Os certificados não geram XP.
- **Ajustes de interface:**
  - a ação "Novo Desafio" deixou de ser um botão flutuante e passou a ocupar o cabeçalho da página de desafios; o componente de botão flutuante, sem outros usos, foi removido;
  - o botão "Perfil público" foi retirado do painel da empresa, uma vez que o acesso ao perfil público permanece disponível na tela de perfil;
  - os textos da interface deixaram de utilizar travessões; os intervalos de datas passaram a ser escritos como "02/11 a 08/11".
- **Testes:** o backend passou de 156 para **163 testes**, e o frontend, de 185 para **215 testes** em 26 arquivos, com cerca de 96% de cobertura de linhas.

## Pendências

Para registro do estado atual do projeto:
- não há testes de ponta a ponta (Playwright) que verifiquem a jornada completa entre empresa e estudante;
- os projetos acadêmicos e os certificados são declarados pelo próprio estudante, sem validação por professores ou pela empresa;
- não há validação automática de código nas entregas, cuja avaliação é sempre manual;
- não há notificações; o estudante consulta o retorno da empresa ao abrir o desafio;
- não há envio de imagens; a logo da empresa é informada por URL;
- a recomendação de vagas por habilidade está implementada, porém sem dados reais;
- a branch `main` ainda não está protegida por regra que exija CI aprovado para o merge.

Essas pendências estão detalhadas em [`documentacao-tecnica.md`](documentacao-tecnica.md#possíveis-evoluções-futuras).


Seguranca
Complexidade
Declaracao implicita
Usabilidade para pc e mobile
