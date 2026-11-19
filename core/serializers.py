"""Serializers da API: registro/autenticação e todos os modelos do core."""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from core.models import (
    Empresa,
    Entrega,
    Etapa,
    Habilidade,
    HabilidadeUsuario,
    Inscricao,
    PerfilUsuario,
    PerfilEmpresa,
    Projeto,
    ProjetoAcademico,
    Publicacao,
    RequisitoVaga,
    Vaga,
)

Usuario = get_user_model()


# Auth

class RegistroSerializer(serializers.ModelSerializer):
    """Serializer para criação de novos usuários."""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    is_company = serializers.BooleanField(write_only=True, required=False, default=False)
    empresa_nome = serializers.CharField(write_only=True, required=False, allow_blank=True)
    empresa_setor = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'nome', 'email', 'password', 'password_confirm', 'is_company', 'empresa_nome', 'empresa_setor']

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError(
                {'password_confirm': 'As senhas não conferem.'}
            )
        try:
            validate_password(attrs.get('password'))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        if attrs.get('is_company'):
            if not attrs.get('empresa_nome'):
                raise serializers.ValidationError({'empresa_nome': 'Nome da empresa é obrigatório.'})
            if not attrs.get('empresa_setor'):
                raise serializers.ValidationError({'empresa_setor': 'Setor da empresa é obrigatório.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        is_company = validated_data.pop('is_company', False)
        empresa_nome = validated_data.pop('empresa_nome', '')
        empresa_setor = validated_data.pop('empresa_setor', '')
        
        password = validated_data.pop('password')
        
        if is_company:
            from core.models import Empresa
            empresa = Empresa.objects.create(nome=empresa_nome, setor=empresa_setor)
            validated_data['empresa'] = empresa
            
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        return usuario


# Usuário & perfil

class PerfilUsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerfilUsuario
        fields = [
            'bio', 'titulo', 'portfolio_url',
            'instituicao_ensino', 'tecnologias', 'descricao_adicional',
            'curso', 'periodo_atual', 'estudando_atualmente',
            'github_url', 'linkedin_url', 'mostrar_atividade', 'certificados',
        ]


class _UnicoPorAlunoMixin:
    """
    Valida a unicidade (aluno, campo) antes de salvar. O aluno não vem no
    payload (é o usuário logado), então o DRF não checaria sozinho e o banco
    devolveria um erro 500 em vez de uma mensagem.
    """
    campo_unico = None
    mensagem_duplicado = ''

    def _validar_unico(self, valor):
        usuario = self.context['request'].user
        existentes = self.Meta.model.objects.filter(usuario=usuario, **{self.campo_unico: valor})
        if self.instance is not None:
            existentes = existentes.exclude(pk=self.instance.pk)
        if existentes.exists():
            raise serializers.ValidationError(self.mensagem_duplicado)
        return valor


class ProjetoAcademicoSerializer(_UnicoPorAlunoMixin, serializers.ModelSerializer):
    campo_unico = 'repo_url'
    mensagem_duplicado = 'Este repositório já está no seu perfil.'

    class Meta:
        model = ProjetoAcademico
        fields = [
            'id', 'titulo', 'disciplina', 'periodo', 'repo_url',
            'tecnologias', 'descricao', 'destaque', 'criado_em',
        ]
        read_only_fields = ['id', 'criado_em']

    def validate_repo_url(self, valor):
        return self._validar_unico(valor)


class PublicacaoSerializer(_UnicoPorAlunoMixin, serializers.ModelSerializer):
    campo_unico = 'url'
    mensagem_duplicado = 'Esta publicação já está no seu perfil.'

    class Meta:
        model = Publicacao
        fields = ['id', 'titulo', 'tipo', 'veiculo', 'ano', 'url', 'coautores', 'criado_em']
        read_only_fields = ['id', 'criado_em']

    def validate_url(self, valor):
        return self._validar_unico(valor)


class UsuarioSerializer(serializers.ModelSerializer):
    perfil = PerfilUsuarioSerializer(read_only=True)
    empresa = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'nome', 'email', 'avatar', 'perfil', 'empresa']


class PerfilEmpresaSerializer(serializers.ModelSerializer):
    """
    Perfil da empresa para edição. Nome, setor e descrição moram na Empresa;
    o resto, no PerfilEmpresa — a tela edita tudo de uma vez.
    """
    empresa_id = serializers.IntegerField(read_only=True)
    nome = serializers.CharField(source='empresa.nome', max_length=300)
    setor = serializers.CharField(source='empresa.setor', max_length=200)
    descricao = serializers.CharField(source='empresa.descricao', allow_blank=True, required=False)

    class Meta:
        model = PerfilEmpresa
        fields = [
            'empresa_id', 'nome', 'setor', 'descricao', 'area_atuacao', 'cidade',
            'website', 'email_contato', 'telefone', 'linkedin_url', 'instagram_url', 'github_url',
            'logo_url', 'tecnologias', 'descricao_adicional',
        ]

    def update(self, instance, validated_data):
        dados_empresa = validated_data.pop('empresa', {})
        if dados_empresa:
            for campo, valor in dados_empresa.items():
                setattr(instance.empresa, campo, valor)
            instance.empresa.save(update_fields=list(dados_empresa))
        return super().update(instance, validated_data)


# Projeto & etapa

class EtapaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Etapa
        fields = [
            'id', 'projeto', 'ordem', 'descricao',
            'criterios_tecnicos', 'formato_entrega',
        ]
        read_only_fields = ['id']


class ProjetoSerializer(serializers.ModelSerializer):
    """
    Vaga + desafio na visão de gestão da empresa. A vaga é obrigatória: é o que
    o aluno vê primeiro no feed. O status muda só pelas ações publicar/encerrar.
    """
    etapas = EtapaSerializer(many=True, read_only=True)

    class Meta:
        model = Projeto
        fields = [
            'id', 'vaga_titulo', 'vaga_modalidade', 'vaga_descricao', 'vaga_tecnologias', 'titulo', 'descricao', 'ferramentas', 'dificuldade',
            'periodo_recomendado', 'prazo', 'status', 'publicado_em',
            'created_at', 'etapas',
        ]
        read_only_fields = ['id', 'status', 'publicado_em', 'created_at']
        extra_kwargs = {
            'vaga_titulo': {'required': True, 'allow_blank': False},
            'vaga_descricao': {'required': True, 'allow_blank': False},
            'vaga_tecnologias': {'required': True, 'allow_blank': False},
        }


class DesafioGestaoSerializer(ProjetoSerializer):
    """
    Desafio na tela de gestão da empresa, com os números de participação.
    Os números vêm anotados no queryset da listagem; logo após criar, ainda
    não existem — valem 0.
    """
    participantes = serializers.SerializerMethodField()
    submissoes = serializers.SerializerMethodField()
    aprovados = serializers.SerializerMethodField()

    class Meta(ProjetoSerializer.Meta):
        fields = ProjetoSerializer.Meta.fields + ['participantes', 'submissoes', 'aprovados']

    def get_participantes(self, projeto):
        return getattr(projeto, 'num_participantes', 0)

    def get_submissoes(self, projeto):
        return getattr(projeto, 'num_submissoes', 0)

    def get_aprovados(self, projeto):
        return getattr(projeto, 'num_aprovados', 0)


class EmpresaResumoSerializer(serializers.ModelSerializer):
    """O que o aluno vê da empresa ao lado de cada desafio."""
    area_atuacao = serializers.SerializerMethodField()
    cidade = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Empresa
        fields = ['id', 'nome', 'setor', 'area_atuacao', 'cidade', 'logo_url']

    @staticmethod
    def _do_perfil(empresa, campo):
        # o perfil estendido é opcional: getattr evita o RelatedObjectDoesNotExist
        perfil = getattr(empresa, 'perfil', None)
        return getattr(perfil, campo) if perfil else ''

    def get_area_atuacao(self, empresa):
        return self._do_perfil(empresa, 'area_atuacao')

    def get_cidade(self, empresa):
        return self._do_perfil(empresa, 'cidade')

    def get_logo_url(self, empresa):
        return self._do_perfil(empresa, 'logo_url')


class FeedDesafioSerializer(serializers.ModelSerializer):
    """Item do feed. `participantes` e `ja_participa` vêm anotados no queryset."""
    empresa = EmpresaResumoSerializer(read_only=True)
    participantes = serializers.IntegerField(read_only=True)
    ja_participa = serializers.BooleanField(read_only=True)

    class Meta:
        model = Projeto
        fields = [
            'id', 'vaga_titulo', 'vaga_modalidade', 'vaga_descricao', 'vaga_tecnologias', 'titulo', 'descricao', 'ferramentas', 'dificuldade',
            'periodo_recomendado', 'prazo', 'publicado_em',
            'empresa', 'participantes', 'ja_participa',
        ]


class DesafioDetalheSerializer(FeedDesafioSerializer):
    """Página do desafio: o item do feed mais as etapas e se ainda aceita participações."""
    etapas = EtapaSerializer(many=True, read_only=True)
    aceita_entregas = serializers.BooleanField(read_only=True)

    class Meta(FeedDesafioSerializer.Meta):
        fields = FeedDesafioSerializer.Meta.fields + ['status', 'aceita_entregas', 'etapas']


class InscricaoSerializer(serializers.ModelSerializer):
    """Serializer para inscricoes em projetos."""
    projeto_titulo = serializers.CharField(source='projeto.titulo', read_only=True)
    projeto_dificuldade = serializers.CharField(source='projeto.dificuldade', read_only=True)
    projeto_ferramentas = serializers.CharField(source='projeto.ferramentas', read_only=True)
    projeto_descricao = serializers.CharField(source='projeto.descricao', read_only=True)

    class Meta:
        model = Inscricao
        fields = [
            'id', 'usuario', 'projeto', 'projeto_titulo',
            'projeto_dificuldade', 'projeto_ferramentas', 'projeto_descricao',
            'status', 'iniciado_em',
        ]
        read_only_fields = ['id', 'usuario', 'projeto', 'status', 'iniciado_em']


# Entrega

class EntregaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Entrega
        fields = [
            'id', 'usuario', 'etapa', 'caminho_arquivo', 'repo_url',
            'status', 'feedback_validacao', 'entregue_em',
        ]
        read_only_fields = [
            'id', 'usuario', 'status', 'feedback_validacao',
            'entregue_em',
        ]


class SubmissaoEmpresaSerializer(serializers.ModelSerializer):
    """
    Entrega na visão da empresa, com o candidato, a etapa e o desafio por
    extenso (o EntregaSerializer só traz ids, e a tela precisa dos nomes e
    do link para o perfil do candidato).
    """
    usuario = serializers.SerializerMethodField()
    etapa = serializers.SerializerMethodField()
    desafio = serializers.SerializerMethodField()

    class Meta:
        model = Entrega
        fields = ['id', 'usuario', 'etapa', 'desafio', 'repo_url', 'status', 'feedback_validacao', 'entregue_em']

    def get_usuario(self, entrega):
        return {'id': entrega.usuario_id, 'nome': entrega.usuario.nome, 'email': entrega.usuario.email}

    def get_etapa(self, entrega):
        return {'id': entrega.etapa_id, 'ordem': entrega.etapa.ordem, 'descricao': entrega.etapa.descricao}

    def get_desafio(self, entrega):
        return {'id': entrega.etapa.projeto_id, 'titulo': entrega.etapa.projeto.titulo}


class EntregaSubmissaoSerializer(serializers.Serializer):
    """Serializer para o endpoint de submissão de entregas."""
    etapa_id = serializers.IntegerField()
    repo_url = serializers.URLField()


# Mercado

class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = ['id', 'nome', 'setor', 'descricao']


class HabilidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Habilidade
        fields = ['id', 'nome', 'tipo']


class RequisitoVagaSerializer(serializers.ModelSerializer):
    habilidade = HabilidadeSerializer(read_only=True)

    class Meta:
        model = RequisitoVaga
        fields = ['id', 'habilidade', 'nivel_requerido']


class VagaSerializer(serializers.ModelSerializer):
    empresa = EmpresaSerializer(read_only=True)
    requisitos = RequisitoVagaSerializer(many=True, read_only=True)

    class Meta:
        model = Vaga
        fields = [
            'id', 'empresa', 'titulo', 'tipo',
            'localizacao', 'publicada_em', 'requisitos',
        ]


class HabilidadeUsuarioSerializer(serializers.ModelSerializer):
    habilidade = HabilidadeSerializer(read_only=True)

    class Meta:
        model = HabilidadeUsuario
        fields = ['id', 'habilidade', 'nivel', 'ultima_atualizacao']
