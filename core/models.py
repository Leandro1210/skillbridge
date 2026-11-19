"""Models do core: usuário/perfil, projeto/etapa/entrega, empresa/vaga/habilidade."""

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class Dificuldade(models.TextChoices):
    FACIL = 'facil', 'Fácil'
    MEDIO = 'medio', 'Médio'
    DIFICIL = 'dificil', 'Difícil'


class FormatoEntrega(models.TextChoices):
    ARQUIVO = 'arquivo', 'Arquivo'
    REPOSITORIO = 'repositorio', 'Repositório'
    LINK = 'link', 'Link'


class StatusEntrega(models.TextChoices):
    PENDENTE = 'pendente', 'Pendente'
    APROVADO = 'aprovado', 'Aprovado'
    REPROVADO = 'reprovado', 'Reprovado'


class TipoVaga(models.TextChoices):
    REMOTO = 'remoto', 'Remoto'
    PRESENCIAL = 'presencial', 'Presencial'
    HIBRIDO = 'hibrido', 'Híbrido'


class TipoHabilidade(models.TextChoices):
    HARD = 'hard', 'Hard Skill'
    SOFT = 'soft', 'Soft Skill'


class StatusDesafio(models.TextChoices):
    RASCUNHO = 'rascunho', 'Rascunho'
    PUBLICADO = 'publicado', 'Publicado'
    ENCERRADO = 'encerrado', 'Encerrado'


class StatusInscricao(models.TextChoices):
    EM_ANDAMENTO = 'em_andamento', 'Em Andamento'
    CONCLUIDO = 'concluido', 'Concluído'


# Usuário e perfil

class Usuario(AbstractUser):
    """
    Modelo de usuário customizado.
    Usa o e-mail como campo de login principal.
    """
    nome = models.CharField('Nome completo', max_length=200)
    email = models.EmailField('E-mail', unique=True)
    avatar = models.ImageField(
        'Avatar',
        upload_to='avatars/',
        null=True,
        blank=True,
    )
    empresa = models.ForeignKey(
        'Empresa',
        on_delete=models.SET_NULL,
        related_name='usuarios',
        verbose_name='Empresa',
        null=True,
        blank=True,
        help_text='Se preenchido, este usuário representa a empresa.',
    )

    # Usa e-mail como identificador de login
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'nome']

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class PerfilUsuario(models.Model):
    """Perfil acadêmico do aluno (relação 1:1): o que a empresa consulta ao avaliar."""
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='perfil',
        verbose_name='Usuário',
    )
    bio = models.TextField('Bio', blank=True, default='')
    titulo = models.CharField('Título profissional', max_length=200, blank=True, default='')
    portfolio_url = models.URLField('URL do Portfólio', blank=True, default='')
    instituicao_ensino = models.CharField(
        'Instituição de Ensino',
        max_length=300,
        blank=True,
        default='',
        help_text='Universidade ou instituição onde estuda.',
    )
    tecnologias = models.TextField(
        'Tecnologias',
        blank=True,
        default='',
        help_text='Tecnologias e linguagens (separadas por vírgula).',
    )
    descricao_adicional = models.TextField(
        'Descrição Adicional',
        blank=True,
        default='',
        help_text='Informações adicionais sobre você.',
    )
    curso = models.CharField('Curso', max_length=200, blank=True, default='')
    periodo_atual = models.PositiveSmallIntegerField(
        'Período atual',
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
    )
    estudando_atualmente = models.CharField(
        'Estudando atualmente',
        max_length=300,
        blank=True,
        default='',
        help_text='Disciplinas ou assuntos do semestre (ex.: Estruturas de Dados, React).',
    )
    github_url = models.URLField('GitHub', blank=True, default='')
    linkedin_url = models.URLField('LinkedIn', blank=True, default='')
    mostrar_atividade = models.BooleanField(
        'Mostrar atividade para empresas',
        default=False,
        help_text='Se ligado, as empresas veem o XP e o gráfico de atividade do semestre.',
    )

    class Meta:
        verbose_name = 'Perfil de Usuário'
        verbose_name_plural = 'Perfis de Usuários'

    def __str__(self):
        return f'Perfil de {self.usuario.nome}'


class ProjetoAcademico(models.Model):
    """Projeto feito numa disciplina, com o repositório como evidência."""
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='projetos_academicos',
        verbose_name='Usuário',
    )
    titulo = models.CharField('Título', max_length=200)
    disciplina = models.CharField('Disciplina', max_length=200, blank=True, default='')
    periodo = models.PositiveSmallIntegerField(
        'Período', null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(12)],
    )
    repo_url = models.URLField('Repositório')
    tecnologias = models.CharField('Tecnologias', max_length=300, blank=True, default='')
    descricao = models.TextField('Descrição', blank=True, default='')
    destaque = models.BooleanField('Destaque', default=False, help_text='Aparece primeiro no perfil.')
    criado_em = models.DateTimeField('Criado em', auto_now_add=True)

    class Meta:
        verbose_name = 'Projeto acadêmico'
        verbose_name_plural = 'Projetos acadêmicos'
        ordering = ['-destaque', '-criado_em']
        constraints = [
            models.UniqueConstraint(fields=['usuario', 'repo_url'], name='repositorio_unico_por_aluno'),
        ]

    def __str__(self):
        return f'{self.titulo} ({self.usuario.nome})'


class TipoPublicacao(models.TextChoices):
    ARTIGO = 'artigo', 'Artigo'
    RESUMO = 'resumo', 'Resumo em evento'
    TCC = 'tcc', 'TCC'
    INICIACAO_CIENTIFICA = 'iniciacao_cientifica', 'Iniciação científica'
    OUTRO = 'outro', 'Outro'


class Publicacao(models.Model):
    """Produção científica do aluno (artigo, resumo, TCC...), com link ou DOI."""
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='publicacoes',
        verbose_name='Usuário',
    )
    titulo = models.CharField('Título', max_length=300)
    tipo = models.CharField('Tipo', max_length=25, choices=TipoPublicacao.choices, default=TipoPublicacao.ARTIGO)
    veiculo = models.CharField('Evento ou periódico', max_length=300, blank=True, default='')
    ano = models.PositiveSmallIntegerField('Ano', null=True, blank=True)
    url = models.URLField('Link ou DOI')
    coautores = models.CharField('Coautores', max_length=500, blank=True, default='')
    criado_em = models.DateTimeField('Criado em', auto_now_add=True)

    class Meta:
        verbose_name = 'Publicação'
        verbose_name_plural = 'Publicações'
        ordering = ['-ano', '-criado_em']
        constraints = [
            models.UniqueConstraint(fields=['usuario', 'url'], name='publicacao_unica_por_aluno'),
        ]

    def __str__(self):
        return f'{self.titulo} ({self.get_tipo_display()})'


# Projeto, etapa e entrega

class Projeto(models.Model):
    """
    Processo seletivo publicado por uma empresa: a VAGA que ela oferece (o que
    o aluno vê no feed) e o DESAFIO que testa o que a vaga pede (o que ele vê
    ao abrir e resolve em etapas). O desafio não precisa repetir a vaga — é
    algo relacionado, para avaliar o conhecimento do candidato.
    """
    empresa = models.ForeignKey(
        'Empresa',
        on_delete=models.CASCADE,
        related_name='projetos',
        verbose_name='Empresa',
        null=True,
        blank=True,
        help_text='Empresa responsável por este desafio (opcional).',
    )
    # A vaga
    vaga_titulo = models.CharField(
        'Título da vaga', max_length=200, blank=True, default='',
        help_text='Ex.: Estágio em Desenvolvimento Back-end.',
    )
    vaga_modalidade = models.CharField(
        'Modalidade', max_length=12, choices=TipoVaga.choices, blank=True, default='',
    )
    vaga_descricao = models.TextField(
        'Descrição da vaga', blank=True, default='',
        help_text='Atividades, o que a empresa oferece, como é o dia a dia.',
    )
    vaga_tecnologias = models.CharField(
        'Tecnologias esperadas', max_length=500, blank=True, default='',
        help_text='O que a empresa espera que o aluno saiba (separadas por vírgula).',
    )

    # O desafio
    titulo = models.CharField('Título do desafio', max_length=300)
    descricao = models.TextField('Enunciado do desafio')
    ferramentas = models.CharField(
        'Ferramentas',
        max_length=500,
        help_text='Ferramentas para resolver o desafio, separadas por vírgula.',
    )
    dificuldade = models.CharField(
        'Dificuldade',
        max_length=10,
        choices=Dificuldade.choices,
        default=Dificuldade.MEDIO,
    )
    # Ciclo de vida de um processo seletivo: a empresa prepara (rascunho),
    # abre para participações (publicado) e encerra. Desafios ficam abertos a
    # todos os alunos — quem avalia se o aluno está apto é a empresa.
    status = models.CharField(
        'Status',
        max_length=10,
        choices=StatusDesafio.choices,
        default=StatusDesafio.RASCUNHO,
        db_index=True,
    )
    publicado_em = models.DateTimeField('Publicado em', null=True, blank=True)
    prazo = models.DateField(
        'Prazo',
        null=True,
        blank=True,
        help_text='Último dia para participar e enviar entregas (opcional).',
    )
    periodo_recomendado = models.PositiveSmallIntegerField(
        'Período recomendado',
        null=True,
        blank=True,
        help_text='Período do curso a partir do qual o desafio é recomendado. Só informativo, não bloqueia.',
    )
    created_at = models.DateTimeField('Criado em', auto_now_add=True)

    class Meta:
        verbose_name = 'Projeto'
        verbose_name_plural = 'Projetos'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.titulo} [{self.get_dificuldade_display()}]'

    @property
    def aceita_entregas(self):
        """Publicado e dentro do prazo (se houver prazo)."""
        if self.status != StatusDesafio.PUBLICADO:
            return False
        return self.prazo is None or self.prazo >= timezone.localdate()


class Inscricao(models.Model):
    """Inscricao de um usuario em um projeto (controla progressao)."""
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='inscricoes',
        verbose_name='Usuario',
    )
    projeto = models.ForeignKey(
        Projeto,
        on_delete=models.CASCADE,
        related_name='inscricoes',
        verbose_name='Projeto',
    )
    status = models.CharField(
        'Status',
        max_length=15,
        choices=StatusInscricao.choices,
        default=StatusInscricao.EM_ANDAMENTO,
    )
    iniciado_em = models.DateTimeField('Iniciado em', auto_now_add=True)

    class Meta:
        verbose_name = 'Inscricao'
        verbose_name_plural = 'Inscricoes'
        unique_together = [('usuario', 'projeto')]
        ordering = ['-iniciado_em']

    def __str__(self):
        return f'{self.usuario.nome} -> {self.projeto.titulo} [{self.get_status_display()}]'


class Etapa(models.Model):
    """Etapa individual dentro de um projeto."""
    projeto = models.ForeignKey(
        Projeto,
        on_delete=models.CASCADE,
        related_name='etapas',
        verbose_name='Projeto',
    )
    ordem = models.PositiveIntegerField('Ordem')
    descricao = models.TextField('Descrição')
    criterios_tecnicos = models.TextField(
        'Critérios técnicos',
        help_text='Critérios que a entrega deve satisfazer para ser aprovada.',
    )
    formato_entrega = models.CharField(
        'Formato da entrega',
        max_length=15,
        choices=FormatoEntrega.choices,
        default=FormatoEntrega.REPOSITORIO,
    )

    class Meta:
        verbose_name = 'Etapa'
        verbose_name_plural = 'Etapas'
        ordering = ['projeto', 'ordem']
        unique_together = [('projeto', 'ordem')]

    def __str__(self):
        return f'{self.projeto.titulo} — Etapa {self.ordem}'


class Entrega(models.Model):
    """Entrega de um usuário para uma etapa de um projeto."""
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='entregas',
        verbose_name='Usuário',
    )
    etapa = models.ForeignKey(
        Etapa,
        on_delete=models.CASCADE,
        related_name='entregas',
        verbose_name='Etapa',
    )
    caminho_arquivo = models.FileField(
        'Arquivo',
        upload_to='entregas/',
        null=True,
        blank=True,
    )
    repo_url = models.URLField('URL do Repositório', blank=True, default='')
    status = models.CharField(
        'Status',
        max_length=10,
        choices=StatusEntrega.choices,
        default=StatusEntrega.PENDENTE,
        db_index=True,
    )
    feedback_validacao = models.TextField(
        'Feedback da Validação',
        blank=True,
        default='',
    )
    entregue_em = models.DateTimeField('Entregue em', auto_now_add=True)

    class Meta:
        verbose_name = 'Entrega'
        verbose_name_plural = 'Entregas'
        ordering = ['-entregue_em']

    def __str__(self):
        return (
            f'{self.usuario.nome} → {self.etapa} '
            f'[{self.get_status_display()}]'
        )


# XP de atividade

class OrigemXP(models.TextChoices):
    ACESSO_DIARIO = 'acesso_diario', 'Acesso diário'
    PERFIL_SEMESTRE = 'perfil_semestre', 'Perfil atualizado no semestre'
    PROJETO_ACADEMICO = 'projeto_academico', 'Projeto acadêmico'
    PUBLICACAO = 'publicacao', 'Publicação'
    PARTICIPACAO_DESAFIO = 'participacao_desafio', 'Participação em desafio'
    AVALIACAO_RECEBIDA = 'avaliacao_recebida', 'Avaliação recebida'


class LancamentoXP(models.Model):
    """
    Um ganho de XP de atividade. O XP mede comprometimento no semestre (não
    competência) e é a soma dos lançamentos da temporada — as regras ficam em
    core/xp.py. A restrição de unicidade impede ganhar duas vezes pela mesma
    coisa (o mesmo desafio, o mesmo dia de acesso...).
    """
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='lancamentos_xp',
        verbose_name='Usuário',
    )
    origem = models.CharField('Origem', max_length=25, choices=OrigemXP.choices)
    referencia = models.CharField(
        'Referência',
        max_length=100,
        help_text='O que gerou o XP: a data do acesso, o id do desafio, a temporada...',
    )
    xp = models.PositiveIntegerField('XP')
    temporada = models.CharField('Temporada', max_length=6, db_index=True, help_text='Ex.: 2026.2')
    criado_em = models.DateTimeField('Criado em', default=timezone.now, db_index=True)

    class Meta:
        verbose_name = 'Lançamento de XP'
        verbose_name_plural = 'Lançamentos de XP'
        ordering = ['-criado_em']
        constraints = [
            models.UniqueConstraint(fields=['usuario', 'origem', 'referencia'], name='xp_unico_por_origem_e_referencia'),
        ]

    def __str__(self):
        return f'{self.usuario.nome} +{self.xp} XP ({self.get_origem_display()}, {self.temporada})'


# Mercado: empresa, vaga, habilidade

class Empresa(models.Model):
    """Empresa que publica vagas na plataforma."""
    nome = models.CharField('Nome', max_length=300)
    setor = models.CharField('Setor', max_length=200)
    descricao = models.TextField('Descrição', blank=True, default='')

    class Meta:
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class PerfilEmpresa(models.Model):
    """Perfil público da empresa: área, contatos e redes (relação 1:1)."""
    empresa = models.OneToOneField(
        Empresa,
        on_delete=models.CASCADE,
        related_name='perfil',
        verbose_name='Empresa',
    )
    website = models.URLField(
        'Website',
        blank=True,
        default='',
        help_text='URL do site da empresa.',
    )
    tecnologias = models.TextField(
        'Tecnologias',
        blank=True,
        default='',
        help_text='Tecnologias utilizadas pela empresa (separadas por vírgula).',
    )
    area_atuacao = models.CharField(
        'Área de Atuação',
        max_length=200,
        blank=True,
        default='',
        help_text='Área principal da empresa (ex: SaaS, Fintech, E-commerce).',
    )
    descricao_adicional = models.TextField(
        'Descrição Adicional',
        blank=True,
        default='',
        help_text='Informações adicionais sobre a empresa, cultura, etc.',
    )
    # A logo é um link (e não upload): o disco do servidor de deploy é efêmero.
    logo_url = models.URLField('Logo (URL da imagem)', blank=True, default='')
    email_contato = models.EmailField('E-mail de contato', blank=True, default='')
    telefone = models.CharField('Telefone', max_length=30, blank=True, default='')
    cidade = models.CharField('Cidade', max_length=150, blank=True, default='', help_text='Ex.: Anápolis, GO — ou "Remoto".')
    linkedin_url = models.URLField('LinkedIn', blank=True, default='')
    instagram_url = models.URLField('Instagram', blank=True, default='')
    github_url = models.URLField('GitHub', blank=True, default='')

    class Meta:
        verbose_name = 'Perfil de Empresa'
        verbose_name_plural = 'Perfis de Empresas'

    def __str__(self):
        return f'Perfil de {self.empresa.nome}'


class Vaga(models.Model):
    """Vaga de emprego publicada por uma empresa."""
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='vagas',
        verbose_name='Empresa',
    )
    titulo = models.CharField('Título', max_length=300)
    tipo = models.CharField(
        'Tipo',
        max_length=12,
        choices=TipoVaga.choices,
        default=TipoVaga.REMOTO,
    )
    localizacao = models.CharField('Localização', max_length=300, blank=True, default='')
    publicada_em = models.DateTimeField('Publicada em', auto_now_add=True)

    class Meta:
        verbose_name = 'Vaga'
        verbose_name_plural = 'Vagas'
        ordering = ['-publicada_em']

    def __str__(self):
        return f'{self.titulo} — {self.empresa.nome}'


class Habilidade(models.Model):
    """Habilidade (skill) catalogada na plataforma."""
    nome = models.CharField('Nome', max_length=200, unique=True)
    tipo = models.CharField(
        'Tipo',
        max_length=5,
        choices=TipoHabilidade.choices,
        default=TipoHabilidade.HARD,
    )

    class Meta:
        verbose_name = 'Habilidade'
        verbose_name_plural = 'Habilidades'
        ordering = ['nome']

    def __str__(self):
        return f'{self.nome} ({self.get_tipo_display()})'


class HabilidadeUsuario(models.Model):
    """Associação entre um usuário e uma habilidade, com nível."""
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='habilidades_usuario',
        verbose_name='Usuário',
    )
    habilidade = models.ForeignKey(
        Habilidade,
        on_delete=models.CASCADE,
        related_name='habilidades_usuario',
        verbose_name='Habilidade',
    )
    nivel = models.PositiveIntegerField(
        'Nível',
        default=1,
        help_text='Nível de proficiência (1-10).',
    )
    ultima_atualizacao = models.DateTimeField('Última atualização', auto_now=True)

    class Meta:
        verbose_name = 'Habilidade do Usuário'
        verbose_name_plural = 'Habilidades dos Usuários'
        unique_together = [('usuario', 'habilidade')]

    def __str__(self):
        return f'{self.usuario.nome} — {self.habilidade.nome} (Nv. {self.nivel})'


class RequisitoVaga(models.Model):
    """Habilidade exigida por uma vaga, com nível mínimo requerido."""
    vaga = models.ForeignKey(
        Vaga,
        on_delete=models.CASCADE,
        related_name='requisitos',
        verbose_name='Vaga',
    )
    habilidade = models.ForeignKey(
        Habilidade,
        on_delete=models.CASCADE,
        related_name='requisitos_vaga',
        verbose_name='Habilidade',
    )
    nivel_requerido = models.PositiveIntegerField(
        'Nível requerido',
        default=1,
        help_text='Nível mínimo exigido para a habilidade.',
    )

    class Meta:
        verbose_name = 'Requisito de Vaga'
        verbose_name_plural = 'Requisitos de Vagas'
        unique_together = [('vaga', 'habilidade')]

    def __str__(self):
        return f'{self.vaga.titulo} requer {self.habilidade.nome} Nv.{self.nivel_requerido}'
