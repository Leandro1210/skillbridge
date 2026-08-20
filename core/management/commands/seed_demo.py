"""
Management command para popular o banco com dados de demonstração
e gerar um token JWT para testes.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.models import (
    Empresa,
    Etapa,
    Habilidade,
    HabilidadeUsuario,
    Projeto,
    RequisitoVaga,
    Vaga,
)

Usuario = get_user_model()


class Command(BaseCommand):
    help = 'Popula o banco com dados de demonstração e gera um token JWT.'

    def handle(self, *args, **options):
        self.stdout.write('Criando dados de demonstracao...\n')

        # usuário de demonstração
        user, created = Usuario.objects.get_or_create(
            email='demo@skillbridge.com',
            defaults={
                'username': 'demo',
                'nome': 'Usuario Demo',
                'nivel': 2,
                'xp_total': 2500,
                'taxa_sucesso': 85.0,
            },
        )
        if created:
            user.set_password('demo1234')
            user.save()
            self.stdout.write(self.style.SUCCESS('[OK] Usuario demo criado'))
        else:
            self.stdout.write('  Usuario demo ja existe')

        # projetos de exemplo
        projetos_data = [
            {
                'titulo': 'API REST com Django',
                'descricao': 'Construa uma API RESTful completa usando Django REST Framework, incluindo autenticacao JWT, serializers, views e testes automatizados.',
                'ferramentas': 'Python, Django, DRF, PostgreSQL',
                'dificuldade': 'facil',
                'nivel_minimo': 0,
            },
            {
                'titulo': 'Dashboard React com Graficos',
                'descricao': 'Desenvolva um dashboard interativo com React, consumindo APIs REST e exibindo dados em graficos dinamicos com Recharts.',
                'ferramentas': 'React, TypeScript, Recharts, Axios',
                'dificuldade': 'medio',
                'nivel_minimo': 1,
            },
            {
                'titulo': 'Microsservicos com Docker',
                'descricao': 'Arquitete e implemente uma aplicacao baseada em microsservicos usando Docker, Docker Compose e comunicacao via RabbitMQ.',
                'ferramentas': 'Docker, Python, RabbitMQ, Redis',
                'dificuldade': 'dificil',
                'nivel_minimo': 3,
            },
            {
                'titulo': 'App Mobile com React Native',
                'descricao': 'Crie um aplicativo mobile cross-platform com React Native, integrando camera, geolocalizacao e notificacoes push.',
                'ferramentas': 'React Native, Expo, Firebase',
                'dificuldade': 'medio',
                'nivel_minimo': 2,
            },
            {
                'titulo': 'Pipeline de Dados com Airflow',
                'descricao': 'Implemente um pipeline ETL automatizado usando Apache Airflow, extraindo dados de APIs, transformando com Pandas e carregando em Data Warehouse.',
                'ferramentas': 'Python, Airflow, Pandas, SQL',
                'dificuldade': 'dificil',
                'nivel_minimo': 4,
            },
            {
                'titulo': 'Landing Page Responsiva',
                'descricao': 'Construa uma landing page moderna e responsiva utilizando HTML5, CSS3 e JavaScript vanilla, com animações e design mobile-first.',
                'ferramentas': 'HTML, CSS, JavaScript',
                'dificuldade': 'facil',
                'nivel_minimo': 0,
            },
        ]

        for p_data in projetos_data:
            projeto, created = Projeto.objects.get_or_create(
                titulo=p_data['titulo'],
                defaults=p_data,
            )
            if created:
                # Criar etapas para cada projeto
                etapas = [
                    ('Setup do Projeto', 'Inicializar o projeto com todas as dependencias', 'repositorio'),
                    ('Implementacao Core', 'Desenvolver a funcionalidade principal', 'repositorio'),
                    ('Testes e Documentacao', 'Adicionar testes e documentacao completa', 'repositorio'),
                ]
                for i, (desc, criterio, formato) in enumerate(etapas, 1):
                    Etapa.objects.create(
                        projeto=projeto,
                        ordem=i,
                        descricao=desc,
                        criterios_tecnicos=criterio,
                        formato_entrega=formato,
                    )
                self.stdout.write(self.style.SUCCESS(f'[OK] Projeto: {projeto.titulo}'))

        # catálogo de habilidades
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

        # empresas e vagas de exemplo
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

        # já gera um token pronto pra colar no console e testar sem precisar logar
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('DADOS DE DEMONSTRACAO CRIADOS COM SUCESSO!'))
        self.stdout.write('=' * 60)
        self.stdout.write(f'\n  Email: demo@skillbridge.com')
        self.stdout.write(f'  Senha: demo1234')
        self.stdout.write(f'\n  Access Token (copie para o localStorage):')
        self.stdout.write(self.style.WARNING(f'  {str(refresh.access_token)}'))
        self.stdout.write(f'\n  Refresh Token:')
        self.stdout.write(self.style.WARNING(f'  {str(refresh)}'))
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('  Para usar no frontend, abra o console do navegador (F12) e cole:')
        self.stdout.write(self.style.SUCCESS(
            f'  localStorage.setItem("access_token", "{str(refresh.access_token)}")'
        ))
        self.stdout.write('=' * 60 + '\n')
