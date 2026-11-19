"""
Management command para popular o banco com dados de demonstração
e gerar um token JWT para testes.
"""

from django.contrib.auth import get_user_model
from datetime import datetime, time, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from core import xp
from core.models import (
    Empresa,
    Etapa,
    Habilidade,
    HabilidadeUsuario,
    LancamentoXP,
    OrigemXP,
    PerfilEmpresa,
    PerfilUsuario,
    Projeto,
    ProjetoAcademico,
    Publicacao,
    RequisitoVaga,
    StatusDesafio,
    Vaga,
)

Usuario = get_user_model()

# Conta de demonstração da empresa (só para ambiente local/demonstração)
SENHA_EMPRESA = 'TechBR#2026'


class Command(BaseCommand):
    help = 'Popula o banco com dados de demonstração e gera um token JWT.'

    def handle(self, *args, **options):
        self.stdout.write('Criando dados de demonstracao...\n')

        user = self._criar_usuario_demo()
        habilidades = self._criar_habilidades(user)
        empresas = self._criar_empresas_e_vagas(habilidades)
        self._criar_usuario_empresa(empresas['TechBR'])
        self._criar_projetos(empresas)
        self._criar_atividade_demo(user)
        self._criar_perfil_academico_demo(user)
        self._imprimir_credenciais(user)

    def _criar_usuario_demo(self):
        user, created = Usuario.objects.get_or_create(
            email='demo@skillbridge.com',
            defaults={
                'username': 'demo',
                'nome': 'Usuario Demo',
            },
        )
        if created:
            user.set_password('demo1234')
            user.save()
            self.stdout.write(self.style.SUCCESS('[OK] Usuario demo criado'))
        else:
            self.stdout.write('  Usuario demo ja existe')
        return user

    def _criar_usuario_empresa(self, empresa):
        rh, created = Usuario.objects.get_or_create(
            email='rh@techbr.com',
            defaults={'username': 'rh_techbr', 'nome': 'RH TechBR', 'empresa': empresa},
        )
        if created:
            rh.set_password(SENHA_EMPRESA)
            rh.save()
            self.stdout.write(self.style.SUCCESS('[OK] Usuario da empresa TechBR criado'))

        PerfilEmpresa.objects.get_or_create(
            empresa=empresa,
            defaults={
                'area_atuacao': 'SaaS B2B', 'cidade': 'Anapolis, GO', 'website': 'https://techbr.example.com',
                'email_contato': 'vagas@techbr.example.com', 'telefone': '(62) 3333-0000',
                'linkedin_url': 'https://www.linkedin.com/company/techbr-example',
                'instagram_url': 'https://www.instagram.com/techbr.example',
                'tecnologias': 'Python, Django, React, PostgreSQL',
                'descricao_adicional': 'Time pequeno, mentoria para quem esta comecando e trabalho remoto.',
            },
        )

    def _criar_projetos(self, empresas):
        """
        Cada processo seletivo = uma vaga (o que o aluno vê no feed) + um
        desafio relacionado a ela, com uma etapa de entrega e critérios claros.
        """
        projetos_data = [
            {
                'empresa': 'TechBR', 'status': 'publicado', 'periodo_recomendado': 3, 'dificuldade': 'iniciante',
                'vaga_titulo': 'Estagio em Desenvolvimento Back-end',
                'vaga_modalidade': 'remoto',
                'vaga_descricao': 'Voce vai apoiar o time na construcao e manutencao das APIs do nosso produto SaaS, '
                                  'com mentoria semanal e revisao de codigo. 6h por dia, totalmente remoto.',
                'vaga_tecnologias': 'Python, Django, SQL, Git',
                'titulo': 'API REST com Django',
                'descricao': 'Construa uma API de cadastro de tarefas com Django REST Framework: CRUD completo, '
                             'autenticacao JWT e testes automatizados dos endpoints principais.',
                'ferramentas': 'Python, Django, DRF, PostgreSQL',
                'criterios': 'CRUD de tarefas funcionando; rotas protegidas por JWT; testes cobrindo criacao, '
                             'listagem e permissao; README explicando como rodar o projeto.',
            },
            {
                'empresa': 'WebFactory', 'status': 'publicado', 'periodo_recomendado': 4, 'dificuldade': 'intermediario',
                'vaga_titulo': 'Estagio em Front-end',
                'vaga_modalidade': 'hibrido',
                'vaga_descricao': 'Agencia digital procura estagiario para desenvolver interfaces de clientes, '
                                  'transformando layouts em telas responsivas e acessiveis.',
                'vaga_tecnologias': 'React, JavaScript, CSS, Git',
                'titulo': 'Dashboard React com Graficos',
                'descricao': 'Desenvolva um dashboard que consome uma API publica e exibe os dados em graficos, '
                             'com filtros e estados de carregamento e erro.',
                'ferramentas': 'React, TypeScript, Recharts, Axios',
                'criterios': 'Dados carregados da API; pelo menos dois graficos com filtro; layout responsivo; '
                             'tratamento de erro e de carregamento.',
            },
            {
                'empresa': 'DataCorp', 'status': 'publicado', 'periodo_recomendado': 6, 'dificuldade': 'avancado',
                'vaga_titulo': 'Desenvolvedor Back-end Junior',
                'vaga_modalidade': 'presencial',
                'vaga_descricao': 'Consultoria de dados busca desenvolvedor junior para atuar em servicos que '
                                  'processam grandes volumes de dados. Presencial em Sao Paulo.',
                'vaga_tecnologias': 'Python, Docker, SQL, Linux',
                'titulo': 'Microsservicos com Docker',
                'descricao': 'Separe uma aplicacao em dois servicos que se comunicam por fila (RabbitMQ), '
                             'orquestrados com Docker Compose.',
                'ferramentas': 'Docker, Python, RabbitMQ, Redis',
                'criterios': 'Dois servicos independentes; comunicacao pela fila; docker compose up sobe tudo; '
                             'documentacao da arquitetura.',
            },
            {
                'empresa': 'WebFactory', 'status': 'publicado', 'periodo_recomendado': 5, 'dificuldade': 'intermediario',
                'vaga_titulo': 'Estagio em Desenvolvimento Mobile',
                'vaga_modalidade': 'remoto',
                'vaga_descricao': 'Participe do desenvolvimento de apps para clientes de varejo, do prototipo a '
                                  'publicacao nas lojas.',
                'vaga_tecnologias': 'React Native, JavaScript, Git',
                'titulo': 'App Mobile com React Native',
                'descricao': 'Crie um app de lista de compras com camera (foto do produto) e armazenamento local.',
                'ferramentas': 'React Native, Expo',
                'criterios': 'Adicionar, marcar e remover itens; foto pela camera; dados persistem ao fechar o app.',
            },
            {
                'empresa': 'DataCorp', 'status': 'publicado', 'periodo_recomendado': 6, 'dificuldade': 'avancado',
                'vaga_titulo': 'Estagio em Engenharia de Dados',
                'vaga_modalidade': 'hibrido',
                'vaga_descricao': 'Apoie o time na construcao de pipelines de dados para clientes do setor financeiro.',
                'vaga_tecnologias': 'Python, SQL, Pandas',
                'titulo': 'Pipeline de Dados com Airflow',
                'descricao': 'Monte um pipeline ETL que extrai dados de uma API, trata com Pandas e grava em um banco SQL.',
                'ferramentas': 'Python, Airflow, Pandas, SQL',
                'criterios': 'DAG agendada no Airflow; tratamento de dados faltantes; carga idempotente no banco.',
            },
            {
                'empresa': 'TechBR', 'status': 'rascunho', 'periodo_recomendado': None, 'dificuldade': 'iniciante',
                'vaga_titulo': 'Estagio em Design de Interfaces',
                'vaga_modalidade': 'remoto',
                'vaga_descricao': 'Vaga em preparacao.',
                'vaga_tecnologias': 'HTML, CSS, Figma',
                'titulo': 'Landing Page Responsiva',
                'descricao': 'Construa uma landing page responsiva a partir de um layout.',
                'ferramentas': 'HTML, CSS, JavaScript',
                'criterios': 'Fiel ao layout; responsiva do celular ao desktop; sem erros de acessibilidade basicos.',
            },
        ]

        for p_data in projetos_data:
            criterios = p_data.pop('criterios')
            p_data['empresa'] = empresas[p_data['empresa']]
            if p_data['status'] == StatusDesafio.PUBLICADO:
                p_data['publicado_em'] = timezone.now()
            projeto, created = Projeto.objects.get_or_create(
                titulo=p_data['titulo'],
                defaults=p_data,
            )
            if created:
                # uma etapa de entrega, como nos desafios criados pelas empresas
                Etapa.objects.create(
                    projeto=projeto,
                    ordem=1,
                    descricao='Entrega da solucao',
                    criterios_tecnicos=criterios,
                    formato_entrega='repositorio',
                )
                self.stdout.write(self.style.SUCCESS(f'[OK] Projeto: {projeto.titulo}'))

    def _criar_atividade_demo(self, user):
        """
        Acessos espalhados pela temporada atual, para o gráfico de atividade
        do aluno demo ter o que mostrar. Datas no passado; idempotente.
        """
        hoje = timezone.localdate()
        inicio, _ = xp.periodo_da_temporada(xp.temporada_atual())
        criados = 0
        dia = inicio
        while dia <= hoje:
            # mais ativo em algumas semanas do que em outras, como na vida real
            if dia.weekday() in (0, 2, 3) or (dia.isocalendar().week % 3 == 0 and dia.weekday() < 5):
                _, novo = LancamentoXP.objects.get_or_create(
                    usuario=user, origem=OrigemXP.ACESSO_DIARIO, referencia=dia.isoformat(),
                    defaults={
                        'xp': xp.REGRAS[OrigemXP.ACESSO_DIARIO].xp,
                        'temporada': xp.temporada_de(dia),
                        'criado_em': timezone.make_aware(datetime.combine(dia, time(10))),
                    },
                )
                criados += novo
            dia += timedelta(days=1)
        if criados:
            self.stdout.write(self.style.SUCCESS(f'[OK] Atividade demo: {criados} acessos na temporada'))

    def _criar_perfil_academico_demo(self, user):
        """Perfil acadêmico preenchido do aluno demo, com projetos e uma publicação."""
        perfil, _ = PerfilUsuario.objects.get_or_create(usuario=user)
        if not perfil.curso:
            perfil.curso = 'Engenharia de Software'
            perfil.instituicao_ensino = 'UniEVANGELICA'
            perfil.periodo_atual = 6
            perfil.estudando_atualmente = 'Engenharia de Requisitos, Testes de Software, React'
            perfil.titulo = 'Desenvolvedor em formacao'
            perfil.bio = 'Gosto de backend e de automatizar testes.'
            perfil.github_url = 'https://github.com/demo-skillbridge'
            perfil.save()
            xp.conceder(user, OrigemXP.PERFIL_SEMESTRE, xp.temporada_atual())

        projetos = [
            ('API de biblioteca', 'Programacao Web', 4, 'https://github.com/demo-skillbridge/api-biblioteca', 'Python, Django', True),
            ('Jogo da velha com IA', 'Inteligencia Artificial', 5, 'https://github.com/demo-skillbridge/velha-ia', 'Python', False),
        ]
        for titulo, disciplina, periodo, repo, tecnologias, destaque in projetos:
            projeto, novo = ProjetoAcademico.objects.get_or_create(
                usuario=user, repo_url=repo,
                defaults={'titulo': titulo, 'disciplina': disciplina, 'periodo': periodo,
                          'tecnologias': tecnologias, 'destaque': destaque},
            )
            if novo:
                xp.conceder(user, OrigemXP.PROJETO_ACADEMICO, projeto.pk)

        publicacao, nova = Publicacao.objects.get_or_create(
            usuario=user, url='https://doi.org/10.0000/demo.2026',
            defaults={'titulo': 'Testes automatizados em projetos academicos', 'tipo': 'resumo',
                      'veiculo': 'Semana de Tecnologia', 'ano': 2026},
        )
        if nova:
            xp.conceder(user, OrigemXP.PUBLICACAO, publicacao.pk)
            self.stdout.write(self.style.SUCCESS('[OK] Perfil academico demo preenchido'))

    def _criar_habilidades(self, user):
        """Cria o catálogo de habilidades e as do usuário demo; devolve {nome: Habilidade}."""
        habilidades_data = [
            ('Python', 'hard'), ('JavaScript', 'hard'), ('React', 'hard'),
            ('Django', 'hard'), ('Docker', 'hard'), ('SQL', 'hard'),
            ('Git', 'hard'), ('TypeScript', 'hard'), ('Node.js', 'hard'),
            ('Comunicacao', 'soft'), ('Trabalho em Equipe', 'soft'),
            ('Resolucao de Problemas', 'soft'),
        ]
        habilidades = {}
        for nome, tipo in habilidades_data:
            hab, _ = Habilidade.objects.get_or_create(nome=nome, defaults={'tipo': tipo})
            habilidades[nome] = hab

        # habilidades do usuário demo, pra alimentar a recomendação de vagas
        user_skills = [
            ('Python', 7), ('Django', 6), ('JavaScript', 5),
            ('React', 4), ('SQL', 6), ('Git', 8),
            ('Comunicacao', 7),
        ]
        for nome, nivel in user_skills:
            HabilidadeUsuario.objects.get_or_create(
                usuario=user,
                habilidade=habilidades[nome],
                defaults={'nivel': nivel},
            )
        self.stdout.write(self.style.SUCCESS('[OK] Habilidades do usuario configuradas'))
        return habilidades

    def _criar_empresas_e_vagas(self, habilidades):
        """Cria empresas e vagas de exemplo; devolve {nome: Empresa}."""
        empresas = {}
        empresas_vagas = [
            {
                'empresa': {'nome': 'TechBR', 'setor': 'Tecnologia', 'descricao': 'Startup brasileira de SaaS'},
                'vagas': [
                    {
                        'titulo': 'Desenvolvedor Backend Python',
                        'tipo': 'remoto',
                        'localizacao': 'Brasil',
                        'requisitos': [('Python', 5), ('Django', 4), ('SQL', 3)],
                    },
                ],
            },
            {
                'empresa': {'nome': 'DataCorp', 'setor': 'Data Science', 'descricao': 'Consultoria de dados'},
                'vagas': [
                    {
                        'titulo': 'Engenheiro de Dados Pleno',
                        'tipo': 'hibrido',
                        'localizacao': 'Sao Paulo, SP',
                        'requisitos': [('Python', 6), ('SQL', 7), ('Docker', 5)],
                    },
                ],
            },
            {
                'empresa': {'nome': 'WebFactory', 'setor': 'Desenvolvimento Web', 'descricao': 'Agencia digital'},
                'vagas': [
                    {
                        'titulo': 'Fullstack Developer',
                        'tipo': 'remoto',
                        'localizacao': 'Brasil',
                        'requisitos': [('Python', 4), ('JavaScript', 5), ('React', 4)],
                    },
                ],
            },
        ]

        for item in empresas_vagas:
            empresa, _ = Empresa.objects.get_or_create(
                nome=item['empresa']['nome'],
                defaults=item['empresa'],
            )
            for v_data in item['vagas']:
                requisitos = v_data.pop('requisitos')
                vaga, created = Vaga.objects.get_or_create(
                    titulo=v_data['titulo'],
                    empresa=empresa,
                    defaults=v_data,
                )
                if created:
                    for skill_nome, nivel_req in requisitos:
                        RequisitoVaga.objects.create(
                            vaga=vaga,
                            habilidade=habilidades[skill_nome],
                            nivel_requerido=nivel_req,
                        )
                    self.stdout.write(self.style.SUCCESS(f'[OK] Vaga: {vaga.titulo}'))
            empresas[empresa.nome] = empresa
        return empresas

    def _imprimir_credenciais(self, user):
        # já gera um token pronto pra colar no console e testar sem precisar logar
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('DADOS DE DEMONSTRACAO CRIADOS COM SUCESSO!'))
        self.stdout.write('=' * 60)
        self.stdout.write('\n  Email: demo@skillbridge.com')
        self.stdout.write('  Senha: demo1234')
        self.stdout.write('\n  Empresa (TechBR): rh@techbr.com')
        self.stdout.write(f'  Senha: {SENHA_EMPRESA}')
        self.stdout.write('\n  Access Token (copie para o localStorage):')
        self.stdout.write(self.style.WARNING(f'  {str(refresh.access_token)}'))
        self.stdout.write('\n  Refresh Token:')
        self.stdout.write(self.style.WARNING(f'  {str(refresh)}'))
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('  Para usar no frontend, abra o console do navegador (F12) e cole:')
        self.stdout.write(self.style.SUCCESS(
            f'  localStorage.setItem("access_token", "{str(refresh.access_token)}")'
        ))
        self.stdout.write('=' * 60 + '\n')
