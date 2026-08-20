"""
Views da API do core: autenticação, projetos/etapas/entregas (fluxo do
aluno) e as rotas de empresa (gerenciar desafios, avaliar submissões).
"""

from django.contrib.auth import get_user_model
from django.db.models import Count, F, Q
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from core.models import (
    Empresa,
    Entrega,
    Etapa,
    HabilidadeUsuario,
    Inscricao,
    PerfilEmpresa,
    PerfilUsuario,
    Projeto,
    RequisitoVaga,
    StatusEntrega,
    Vaga,
)
from core.serializers import (
    EntregaSerializer,
    EntregaSubmissaoSerializer,
    EtapaSerializer,
    InscricaoSerializer,
    PerfilEmpresaSerializer,
    PerfilUsuarioSerializer,
    ProjetoResumoSerializer,
    ProjetoSerializer,
    RegistroSerializer,
    UsuarioSerializer,
    VagaSerializer,
)

Usuario = get_user_model()


# Auth

class LogoutView(generics.GenericAPIView):
    """
    POST /api/auth/logout/
    Recebe { "refresh": "<token>" } e o invalida (blacklist), encerrando
    a sessão no servidor — sem isso, um refresh token continuava válido
    até expirar sozinho mesmo depois do usuário "sair".
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        from rest_framework_simplejwt.exceptions import TokenError
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Campo "refresh" é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return Response(
                {'detail': 'Token inválido ou já expirado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_205_RESET_CONTENT)


class RegistroView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Cria um novo usuário e retorna seus dados.
    """
    serializer_class = RegistroSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        return Response(
            UsuarioSerializer(usuario).data,
            status=status.HTTP_201_CREATED,
        )


class UsuarioMeView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/auth/me/
    Retorna ou atualiza o perfil do usuário autenticado.
    """
    serializer_class = UsuarioSerializer

    def get_object(self):
        return self.request.user


# Perfil do usuário (estudante)

class PerfilUsuarioView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/perfil/usuario/
    Retorna ou atualiza o perfil estendido do usuário autenticado (estudante).
    """
    serializer_class = PerfilUsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        perfil, created = PerfilUsuario.objects.get_or_create(usuario=self.request.user)
        return perfil


# Perfil da empresa

class PerfilEmpresaView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/perfil/empresa/
    Retorna ou atualiza o perfil estendido da empresa do usuário autenticado.
    """
    serializer_class = PerfilEmpresaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        if not self.request.user.empresa_id:
            raise PermissionDenied('Você não está associado a uma empresa.')
        perfil, created = PerfilEmpresa.objects.get_or_create(
            empresa=self.request.user.empresa
        )
        return perfil


# Projetos

class ProjetoViewSet(viewsets.ModelViewSet):
    """
    CRUD de Projetos.

    Regra RNE-002: A listagem genérica (GET /api/projetos/) retorna
    apenas os projetos cujo nivel_minimo <= nível do usuário autenticado.

    Action /api/projetos/{id}/iniciar/:
        Inscreve o usuário no projeto, verificando o nível mínimo.
    """
    serializer_class = ProjetoSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjetoResumoSerializer
        return ProjetoSerializer

    def get_permissions(self):
        # Este endpoint é o catálogo público (leitura) + a ação "iniciar".
        # Criar/editar/apagar projetos é feito exclusivamente por
        # EmpresaProjetoViewSet, que já verifica o dono do projeto —
        # por isso essas ações ficam bloqueadas aqui.
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        # O catalogo de estudantes só deve ver projetos que estão ativos (publicados pelas empresas)
        qs = Projeto.objects.filter(ativo=True).prefetch_related('etapas')

        # O frontend gerencia os cadeados visualmente.
        # Se quiser apenas os disponíveis (RNE-002 original), passe ?disponiveis=true
        if self.action == 'list' and self.request.query_params.get('disponiveis') == 'true':
            qs = qs.filter(nivel_minimo__lte=user.nivel)

        return qs

    @action(detail=True, methods=['post'], url_path='iniciar')
    def iniciar(self, request, pk=None):
        """
        POST /api/projetos/{id}/iniciar/

        Inscreve o usuário autenticado no projeto.
        Verifica:
          1. Se o usuário tem o nivel_minimo exigido
          2. Se o usuário já não está inscrito
        """
        projeto = self.get_object()
        user = request.user

        if user.nivel < projeto.nivel_minimo:
            return Response(
                {
                    'detail': (
                        f'Seu nivel atual ({user.nivel}) e insuficiente. '
                        f'Este projeto exige nivel {projeto.nivel_minimo} ou superior.'
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        inscricao, created = Inscricao.objects.get_or_create(
            usuario=user,
            projeto=projeto,
        )

        if not created:
            return Response(
                {
                    'detail': 'Voce ja esta inscrito neste projeto.',
                    'inscricao': InscricaoSerializer(inscricao).data,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                'detail': 'Inscricao realizada com sucesso!',
                'inscricao': InscricaoSerializer(inscricao).data,
            },
            status=status.HTTP_201_CREATED,
        )


# Inscricoes

class InscricaoListView(generics.ListAPIView):
    """
    GET /api/inscricoes/
    Lista as inscricoes do usuario autenticado com dados do projeto.
    """
    serializer_class = InscricaoSerializer

    def get_queryset(self):
        return Inscricao.objects.filter(
            usuario=self.request.user,
        ).select_related('projeto')


# Etapas

class EtapaViewSet(viewsets.ModelViewSet):
    """CRUD de Etapas."""
    serializer_class = EtapaSerializer
    queryset = Etapa.objects.select_related('projeto').all()

    def get_permissions(self):
        # Mesma lógica do ProjetoViewSet: etapas são criadas pela empresa
        # (hoje, ao criar o projeto em EmpresaProjetoViewSet). Este endpoint
        # fica somente-leitura para usuários comuns.
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        # Filtragem opcional por projeto via query param
        projeto_id = self.request.query_params.get('projeto_id')
        if projeto_id:
            qs = qs.filter(projeto_id=projeto_id)
        return qs


# Entregas

class EntregaViewSet(viewsets.ModelViewSet):
    """
    POST /api/entregas/ recebe uma submissão (etapa_id + repo_url) e cria
    a entrega como PENDENTE. A avaliação é sempre manual, feita pela
    empresa em EmpresaAvaliarSubmissaoView — não existe validação
    automática de código aqui.
    """
    serializer_class = EntregaSerializer

    def get_queryset(self):
        return Entrega.objects.filter(
            usuario=self.request.user,
        ).select_related('etapa__projeto')

    def create(self, request, *args, **kwargs):
        sub_serializer = EntregaSubmissaoSerializer(data=request.data)
        sub_serializer.is_valid(raise_exception=True)

        etapa_id = sub_serializer.validated_data['etapa_id']
        repo_url = sub_serializer.validated_data['repo_url']
        user = request.user

        try:
            etapa = Etapa.objects.select_related('projeto').get(pk=etapa_id)
        except Etapa.DoesNotExist:
            return Response(
                {'detail': 'Etapa não encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not etapa.projeto.ativo:
            return Response(
                {'detail': 'Este projeto não está mais ativo.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # sem essa checagem, dava pra mandar entrega de um projeto que o
        # aluno nunca iniciou
        if not Inscricao.objects.filter(usuario=user, projeto=etapa.projeto).exists():
            return Response(
                {'detail': 'Você precisa iniciar este projeto antes de enviar uma entrega.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if Entrega.objects.filter(
            usuario=user,
            etapa=etapa,
            status=StatusEntrega.APROVADO,
        ).exists():
            return Response(
                {'detail': 'Você já possui uma entrega aprovada para esta etapa.'},
                status=status.HTTP_409_CONFLICT,
            )

        entrega = Entrega.objects.create(
            usuario=user,
            etapa=etapa,
            repo_url=repo_url,
            status=StatusEntrega.PENDENTE,
        )

        return Response(
            EntregaSerializer(entrega).data,
            status=status.HTTP_201_CREATED,
        )


# Vagas recomendadas (matching por habilidade)

class VagaRecomendadaView(generics.ListAPIView):
    """
    GET /api/vagas/recomendadas/

    Retorna as vagas onde o usuário autenticado possui TODAS as habilidades
    exigidas nos RequisitoVaga, e onde o nível da HabilidadeUsuario é ≥ ao
    nivel_requerido da vaga.
    """
    serializer_class = VagaSerializer

    def get_queryset(self):
        user = self.request.user

        # ids dos requisitos que o usuário já cumpre (nivel da habilidade >= exigido)
        requisitos_satisfeitos = RequisitoVaga.objects.filter(
            habilidade__habilidades_usuario__usuario=user,
            habilidade__habilidades_usuario__nivel__gte=F('nivel_requerido'),
        ).values_list('id', flat=True)

        # a vaga só entra na lista se o usuário cumpre TODOS os requisitos, não só alguns
        vagas = Vaga.objects.annotate(
            total_requisitos=Count('requisitos', distinct=True),
            requisitos_atendidos=Count(
                'requisitos',
                filter=Q(requisitos__id__in=requisitos_satisfeitos),
                distinct=True,
            ),
        ).filter(
            total_requisitos__gt=0,
            total_requisitos=F('requisitos_atendidos'),
        ).select_related('empresa').prefetch_related(
            'requisitos__habilidade',
        )

        return vagas


# Empresa — gerenciamento de desafios e avaliação

class IsCompanyUser(permissions.BasePermission):
    """Permissão: usuario deve ter uma empresa associada."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.empresa_id)


class IsCompanyOwner(permissions.BasePermission):
    """Permissão: usuario pode editar apenas projetos de sua empresa."""
    def has_object_permission(self, request, view, obj):
        return obj.empresa_id == request.user.empresa_id


class EmpresaProjetoViewSet(viewsets.ModelViewSet):
    """
    Gerenciamento de Projetos (Desafios) pela Empresa.

    GET /api/empresa/projetos/ — Lista projetos da empresa
    POST /api/empresa/projetos/ — Cria novo desafio
    PATCH /api/empresa/projetos/{id}/ — Edita desafio
    DELETE /api/empresa/projetos/{id}/ — Deleta desafio
    POST /api/empresa/projetos/{id}/publicar/ — Publica desafio
    """
    serializer_class = ProjetoSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyUser]

    def get_queryset(self):
        return Projeto.objects.filter(
            empresa=self.request.user.empresa
        ).prefetch_related('etapas')

    def perform_create(self, serializer):
        projeto = serializer.save(empresa=self.request.user.empresa)
        from core.models import Etapa
        Etapa.objects.create(
            projeto=projeto,
            ordem=1,
            descricao='Desafio Principal',
            criterios_tecnicos='Entregar o projeto conforme a descrição do desafio.',
            formato_entrega='repositorio',
        )

    def perform_update(self, serializer):
        self.check_object_permissions(self.request, self.get_object())
        serializer.save()

    def perform_destroy(self, instance):
        self.check_object_permissions(self.request, instance)
        instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsCompanyUser, IsCompanyOwner])
    def publicar(self, request, pk=None):
        """Publica/ativa um desafio."""
        projeto = self.get_object()
        self.check_object_permissions(request, projeto)
        projeto.ativo = True
        projeto.save()
        return Response(
            {'detail': 'Desafio publicado com sucesso!'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsCompanyUser, IsCompanyOwner])
    def desativar(self, request, pk=None):
        """Desativa um desafio."""
        projeto = self.get_object()
        self.check_object_permissions(request, projeto)
        projeto.ativo = False
        projeto.save()
        return Response(
            {'detail': 'Desafio desativado com sucesso!'},
            status=status.HTTP_200_OK
        )


class EmpresaSubmissaoListView(generics.ListAPIView):
    """
    GET /api/empresa/submissoes/

    Lista todas as submissões dos estudantes para os desafios da empresa.
    Com filtro opcional por status.
    """
    serializer_class = EntregaSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyUser]

    def get_queryset(self):
        empresa = self.request.user.empresa
        qs = Entrega.objects.filter(
            etapa__projeto__empresa=empresa
        ).select_related(
            'usuario',
            'etapa__projeto'
        ).order_by('-entregue_em')

        # Filtro por status
        status_filter = self.request.query_params.get('status')
        if status_filter in [StatusEntrega.PENDENTE, StatusEntrega.APROVADO, StatusEntrega.REPROVADO]:
            qs = qs.filter(status=status_filter)

        return qs


class EmpresaAvaliarSubmissaoView(generics.UpdateAPIView):
    """
    PATCH /api/empresa/submissoes/{id}/avaliar/

    Avalia uma submissão (aprova ou reprova com feedback).
    Atualiza:
      - status (aprovado/reprovado)
      - feedback_validacao
      - xp_ganho (se aprovado)
      - usuário xp_total e recalcula nível
    """
    queryset = Entrega.objects.all()
    serializer_class = EntregaSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyUser]

    def update(self, request, *args, **kwargs):
        entrega = self.get_object()

        # Verifica se empresa é dona deste desafio
        if entrega.etapa.projeto.empresa_id != request.user.empresa_id:
            return Response(
                {'detail': 'Você não tem permissão para avaliar esta submissão.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Impede reavaliação: uma vez aprovada, a entrega já concedeu XP e não
        # deve ser reavaliada (evita conceder XP duplicado em PATCHs repetidos).
        if entrega.status == StatusEntrega.APROVADO:
            return Response(
                {'detail': 'Esta entrega já foi aprovada e não pode ser reavaliada.'},
                status=status.HTTP_409_CONFLICT,
            )

        # Extrai dados
        novo_status = request.data.get('status')
        feedback = request.data.get('feedback_validacao', '')

        if novo_status not in [StatusEntrega.APROVADO, StatusEntrega.REPROVADO]:
            return Response(
                {'detail': 'Status deve ser "aprovado" ou "reprovado".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Atualiza entrega
        entrega.status = novo_status
        entrega.feedback_validacao = feedback
        if novo_status == StatusEntrega.APROVADO:
            entrega.xp_ganho = entrega.etapa.projeto.xp_por_etapa
        entrega.save()

        if novo_status == StatusEntrega.APROVADO:
            # Concede XP ao usuário. Isso precisa rodar DEPOIS do entrega.save()
            # acima, porque recalcular_taxa_sucesso() conta as entregas do
            # usuário no banco — se rodasse antes, essa aprovação ainda não
            # apareceria na contagem.
            usuario = entrega.usuario
            usuario.xp_total += entrega.xp_ganho
            usuario.recalcular_nivel(save=False)
            usuario.recalcular_taxa_sucesso(save=False)
            usuario.save(update_fields=['xp_total', 'nivel', 'taxa_sucesso'])

        return Response(
            EntregaSerializer(entrega).data,
            status=status.HTTP_200_OK
        )


class EmpresaDashboardView(generics.RetrieveAPIView):
    """
    GET /api/empresa/dashboard/

    Retorna estatísticas gerais da empresa:
    - Total de desafios
    - Total de submissões
    - Submissões por status
    - Estudantes participando
    """
    permission_classes = [permissions.IsAuthenticated, IsCompanyUser]

    def retrieve(self, request, *args, **kwargs):
        empresa = request.user.empresa

        projetos = Projeto.objects.filter(empresa=empresa)
        submissoes = Entrega.objects.filter(etapa__projeto__empresa=empresa)

        proj_stats = projetos.aggregate(
            total_desafios=Count('id'),
            desafios_ativos=Count('id', filter=Q(ativo=True)),
        )
        sub_stats = submissoes.aggregate(
            total_submissoes=Count('id'),
            submissoes_pendentes=Count('id', filter=Q(status=StatusEntrega.PENDENTE)),
            submissoes_aprovadas=Count('id', filter=Q(status=StatusEntrega.APROVADO)),
            submissoes_reprovadas=Count('id', filter=Q(status=StatusEntrega.REPROVADO)),
            estudantes_unicos=Count('usuario', distinct=True),
        )

        data = {
            'empresa': {
                'id': empresa.id,
                'nome': empresa.nome,
                'setor': empresa.setor,
            },
            **proj_stats,
            **sub_stats,
        }

        return Response(data)
