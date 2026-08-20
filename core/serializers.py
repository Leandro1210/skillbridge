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
            'instituicao_ensino', 'tecnologias', 'descricao_adicional'
        ]


class UsuarioSerializer(serializers.ModelSerializer):
    perfil = PerfilUsuarioSerializer(read_only=True)
    empresa = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'nome', 'email', 'avatar',
            'nivel', 'xp_total', 'taxa_sucesso', 'perfil', 'empresa',
        ]
        read_only_fields = ['nivel', 'xp_total', 'taxa_sucesso']


class PerfilEmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerfilEmpresa
        fields = [
            'website', 'tecnologias', 'area_atuacao', 'descricao_adicional'
        ]


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
    etapas = EtapaSerializer(many=True, read_only=True)

    class Meta:
        model = Projeto
        fields = [
            'id', 'titulo', 'descricao', 'ferramentas',
            'dificuldade', 'nivel_minimo', 'created_at', 'etapas',
        ]
        read_only_fields = ['id', 'created_at']


class ProjetoResumoSerializer(serializers.ModelSerializer):
    """Versão resumida para listagens (sem etapas aninhadas)."""

    class Meta:
        model = Projeto
        fields = [
            'id', 'titulo', 'descricao', 'ferramentas',
            'dificuldade', 'nivel_minimo', 'created_at',
        ]


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
            'status', 'feedback_validacao', 'xp_ganho', 'entregue_em',
        ]
        read_only_fields = [
            'id', 'usuario', 'status', 'feedback_validacao',
            'xp_ganho', 'entregue_em',
        ]


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
