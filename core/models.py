"""Models do core: usuário/perfil, projeto/etapa/entrega, empresa/vaga/habilidade."""

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


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
    nivel = models.PositiveIntegerField('Nível', default=1)
    xp_total = models.PositiveIntegerField('XP Total', default=0, db_index=True)
    taxa_sucesso = models.FloatField(
        'Taxa de Sucesso (%)',
        default=0.0,
        help_text='Percentual de entregas aprovadas sobre o total.',
    )

    # Usa e-mail como identificador de login
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'nome']

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
        ordering = ['-xp_total']

    def __str__(self):
        return f'{self.nome} (Nv. {self.nivel})'

    def recalcular_nivel(self, save=True):
        """Recalcula o nível com base no XP total (1 nível a cada 1000 XP)."""
        self.nivel = 1 + (self.xp_total // 1000)
        if save:
            self.save(update_fields=['nivel'])

    def recalcular_taxa_sucesso(self, save=True):
        """Recalcula a taxa de sucesso baseada nas entregas."""
        total = self.entregas.exclude(status=StatusEntrega.PENDENTE).count()
        if total > 0:
            aprovadas = self.entregas.filter(status=StatusEntrega.APROVADO).count()
            self.taxa_sucesso = round((aprovadas / total) * 100, 2)
        else:
            self.taxa_sucesso = 0.0
        if save:
            self.save(update_fields=['taxa_sucesso'])


class PerfilUsuario(models.Model):
    """Perfil estendido com informações profissionais (relação 1:1)."""
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

    class Meta:
        verbose_name = 'Perfil de Usuário'
        verbose_name_plural = 'Perfis de Usuários'

    def __str__(self):
        return f'Perfil de {self.usuario.nome}'


# Projeto, etapa e entrega

class Projeto(models.Model):
    """Projeto de aprendizado com etapas progressivas."""
    empresa = models.ForeignKey(
        'Empresa',
        on_delete=models.CASCADE,
        related_name='projetos',
        verbose_name='Empresa',
        null=True,
        blank=True,
        help_text='Empresa responsável por este desafio (opcional).',
    )
    titulo = models.CharField('Título', max_length=300)
    descricao = models.TextField('Descrição')
    ferramentas = models.CharField(
        'Ferramentas',
        max_length=500,
        help_text='Lista de ferramentas separadas por vírgula.',
    )
    dificuldade = models.CharField(
        'Dificuldade',
        max_length=10,
        choices=Dificuldade.choices,
        default=Dificuldade.MEDIO,
    )
    nivel_minimo = models.PositiveIntegerField(
        'Nível mínimo',
        default=0,
        help_text='Nível mínimo do usuário para acessar este projeto.',
    )
    ativo = models.BooleanField(
        'Ativo',
        default=True,
        db_index=True,
        help_text='Se desativado, estudantes não podem se inscrever.',
    )
    created_at = models.DateTimeField('Criado em', auto_now_add=True)

    class Meta:
        verbose_name = 'Projeto'
        verbose_name_plural = 'Projetos'
        ordering = ['nivel_minimo', 'titulo']

    def __str__(self):
        return f'{self.titulo} [{self.get_dificuldade_display()}]'

    @property
    def xp_por_etapa(self):
        """XP concedido por etapa concluída, baseado na dificuldade."""
        mapa = {
            Dificuldade.FACIL: 100,
            Dificuldade.MEDIO: 250,
            Dificuldade.DIFICIL: 500,
        }
        return mapa.get(self.dificuldade, 100)


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
    xp_ganho = models.PositiveIntegerField('XP ganho', default=0)
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
    """Perfil estendido da empresa com informações adicionais (relação 1:1)."""
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
