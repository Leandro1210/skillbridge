"""
Views da API do core: autenticação, projetos/etapas/entregas (fluxo do
aluno) e as rotas de empresa (gerenciar desafios, avaliar submissões).
"""

from django.contrib.auth import get_user_model
from django.db.models import Count, Exists, F, Min, OuterRef, Q
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from core import xp
from core.models import (
    Empresa,
    Entrega,
    Etapa,
    HabilidadeUsuario,
    Inscricao,
    OrigemXP,
    PerfilEmpresa,
    PerfilUsuario,
    Projeto,
    RequisitoVaga,
    StatusDesafio,
    StatusEntrega,
    Vaga,
)
from core.serializers import (
    DesafioDetalheSerializer,
    DesafioGestaoSerializer,
    EntregaSerializer,
    EntregaSubmissaoSerializer,
    EtapaSerializer,
    FeedDesafioSerializer,
    InscricaoSerializer,
    PerfilEmpresaSerializer,
    PerfilUsuarioSerializer,
    ProjetoAcademicoSerializer,
    PublicacaoSerializer,
    RegistroSerializer,
    SubmissaoEmpresaSerializer,
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


# XP de atividade

class IsStudentUser(permissions.BasePermission):
    """Permissão: usuário sem empresa associada (aluno)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and not request.user.empresa_id)


class AcessoDiarioView(generics.GenericAPIView):
    """
    POST /api/atividade/acesso/
    Registra o acesso do dia (+5 XP, uma vez por dia). O frontend chama ao abrir o app.
    """
    permission_classes = [permissions.IsAuthenticated, IsStudentUser]

    def post(self, request, *args, **kwargs):
        lancamento = xp.conceder(request.user, OrigemXP.ACESSO_DIARIO, timezone.localdate().isoformat())
        return Response({'xp_ganho': lancamento.xp if lancamento else 0})


class AtividadeView(generics.GenericAPIView):
    """
    GET /api/perfil/atividade/
    Atividade do aluno na temporada: XP, nível de atividade, série semanal
    (para o gráfico), temporadas anteriores e quanto ainda cabe no mês.
    """
    permission_classes = [permissions.IsAuthenticated, IsStudentUser]

    def get(self, request, *args, **kwargs):
        return Response(xp.resumo_atividade(request.user))


# Perfil do usuário (estudante)

class PerfilUsuarioView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/perfil/usuario/
    Retorna ou atualiza o perfil acadêmico do usuário autenticado (estudante).

    Manter o período e o que está estudando preenchidos conta como a
    atualização do perfil no semestre (+50 XP, uma vez por temporada).
    """
    serializer_class = PerfilUsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        perfil, created = PerfilUsuario.objects.get_or_create(usuario=self.request.user)
        return perfil

    def perform_update(self, serializer):
        perfil = serializer.save()
        if perfil.periodo_atual and perfil.estudando_atualmente.strip():
            xp.conceder(self.request.user, OrigemXP.PERFIL_SEMESTRE, xp.temporada_atual())


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
    Feed e página dos desafios, na visão do aluno.

    GET /api/projetos/ é o feed: só desafios publicados e dentro do prazo, dos
    mais recentes para os mais antigos. Filtros: ?q= (vaga ou desafio:
    título, descrição, tecnologias), ?dificuldade= e ?tecnologia=.

    Os desafios ficam abertos a todos os alunos: não há trava de nível. Quem
    avalia se o aluno está apto é a empresa, ao analisar a entrega.
    """

    def get_serializer_class(self):
        if self.action == 'list':
            return FeedDesafioSerializer
        return DesafioDetalheSerializer

    def get_permissions(self):
        # Este endpoint é o feed (leitura) + a ação "iniciar".
        # Criar/editar/apagar desafios é feito exclusivamente por
        # EmpresaProjetoViewSet, que já verifica o dono do desafio —
        # por isso essas ações ficam bloqueadas aqui.
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        inscrito = Inscricao.objects.filter(usuario=self.request.user, projeto=OuterRef('pk'))
        qs = Projeto.objects.select_related('empresa', 'empresa__perfil').prefetch_related('etapas').annotate(
            participantes=Count('inscricoes', distinct=True),
            ja_participa=Exists(inscrito),
        )

        if self.action != 'list':
            # A página de um desafio encerrado continua acessível: quem
            # participou ainda precisa ver as entregas e o feedback.
            return qs.filter(status__in=[StatusDesafio.PUBLICADO, StatusDesafio.ENCERRADO])

        hoje = timezone.localdate()
        qs = qs.filter(status=StatusDesafio.PUBLICADO).filter(Q(prazo__isnull=True) | Q(prazo__gte=hoje))

        params = self.request.query_params
        if busca := params.get('q', '').strip():
            qs = qs.filter(
                Q(vaga_titulo__icontains=busca) | Q(vaga_descricao__icontains=busca) | Q(vaga_tecnologias__icontains=busca)
                | Q(titulo__icontains=busca) | Q(descricao__icontains=busca) | Q(ferramentas__icontains=busca)
            )
        if dificuldade := params.get('dificuldade'):
            qs = qs.filter(dificuldade=dificuldade)
        if tecnologia := params.get('tecnologia', '').strip():
            qs = qs.filter(Q(vaga_tecnologias__icontains=tecnologia) | Q(ferramentas__icontains=tecnologia))

        return qs.order_by('-publicado_em', '-created_at')

    @action(detail=True, methods=['post'], url_path='iniciar')
    def iniciar(self, request, pk=None):
        """
        POST /api/projetos/{id}/iniciar/

        Inscreve o aluno no desafio. Qualquer aluno pode participar de um
        desafio publicado e dentro do prazo.
        """
        projeto = self.get_object()

        if not projeto.aceita_entregas:
            return Response(
                {'detail': 'Este desafio não está recebendo novas participações.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        inscricao, created = Inscricao.objects.get_or_create(
            usuario=request.user,
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

        if not etapa.projeto.aceita_entregas:
            return Response(
                {'detail': 'Este desafio não está recebendo entregas.'},
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
        # participar conta como atividade, uma vez por desafio (a unicidade
        # do lançamento ignora as entregas seguintes do mesmo desafio)
        xp.conceder(user, OrigemXP.PARTICIPACAO_DESAFIO, etapa.projeto_id)

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
        ).order_by('-publicada_em')  # o annotate faz o Django ignorar o Meta.ordering

        return vagas


# Empresa — gerenciamento de desafios e avaliação

def numeros_do_desafio():
    """Anotações de participação de um desafio (distinct: as junções multiplicam linhas)."""
    return {
        'num_participantes': Count('inscricoes__usuario', distinct=True),
        'num_submissoes': Count('etapas__entregas', distinct=True),
        'num_aprovados': Count(
            'etapas__entregas__usuario',
            filter=Q(etapas__entregas__status=StatusEntrega.APROVADO),
            distinct=True,
        ),
    }


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
    POST /api/empresa/projetos/{id}/publicar/ — Publica (ou reabre) o desafio
    POST /api/empresa/projetos/{id}/encerrar/ — Encerra o desafio

    Desafio novo nasce como rascunho e só aparece no feed depois de publicado.
    Cada desafio vem com participantes, submissões e alunos aprovados.
    """
    serializer_class = DesafioGestaoSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyUser]

    def get_queryset(self):
        return Projeto.objects.filter(
            empresa=self.request.user.empresa
        ).prefetch_related('etapas').annotate(**numeros_do_desafio()).order_by('-created_at')

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
        """Publica o desafio (ou reabre um encerrado): ele passa a aparecer no feed."""
        projeto = self.get_object()
        self.check_object_permissions(request, projeto)
        projeto.status = StatusDesafio.PUBLICADO
        if projeto.publicado_em is None:
            projeto.publicado_em = timezone.now()
        projeto.save(update_fields=['status', 'publicado_em'])
        return Response(
            {'detail': 'Desafio publicado com sucesso!'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsCompanyUser, IsCompanyOwner])
    def encerrar(self, request, pk=None):
        """Encerra o desafio: sai do feed e para de aceitar participações e entregas."""
        projeto = self.get_object()
        self.check_object_permissions(request, projeto)
        projeto.status = StatusDesafio.ENCERRADO
        projeto.save(update_fields=['status'])
        return Response(
            {'detail': 'Desafio encerrado com sucesso!'},
            status=status.HTTP_200_OK
        )


class EmpresaSubmissaoListView(generics.ListAPIView):
    """
    GET /api/empresa/submissoes/

    Lista todas as submissões dos estudantes para os desafios da empresa,
    com o candidato, a etapa e o desafio por extenso.
    Filtros: ?status=, ?desafio=<id> e ?q= (nome ou e-mail do candidato).
    """
    serializer_class = SubmissaoEmpresaSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyUser]

    def get_queryset(self):
        empresa = self.request.user.empresa
        qs = Entrega.objects.filter(
            etapa__projeto__empresa=empresa
        ).select_related(
            'usuario',
            'etapa__projeto'
        ).order_by('-entregue_em')

        params = self.request.query_params
        status_filter = params.get('status')
        if status_filter in [StatusEntrega.PENDENTE, StatusEntrega.APROVADO, StatusEntrega.REPROVADO]:
            qs = qs.filter(status=status_filter)
        desafio = params.get('desafio', '')
        if desafio.isdigit():
            qs = qs.filter(etapa__projeto_id=desafio)
        if busca := params.get('q', '').strip():
            qs = qs.filter(Q(usuario__nome__icontains=busca) | Q(usuario__email__icontains=busca))

        return qs


class EmpresaAvaliarSubmissaoView(generics.UpdateAPIView):
    """
    PATCH /api/empresa/submissoes/{id}/avaliar/

    Avalia uma submissão (aprova ou reprova com feedback).

    A aprovação não dá XP: o XP mede atividade, não competência. Receber uma
    avaliação — aprovada ou não — conta como atividade (+20, uma vez por
    desafio). As aprovações aparecem no perfil só como uma contagem geral.
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

        # Impede reavaliação: uma entrega aprovada é definitiva (ela entra na
        # contagem de aprovações do aluno).
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

        entrega.status = novo_status
        entrega.feedback_validacao = feedback
        entrega.save(update_fields=['status', 'feedback_validacao'])

        xp.conceder(entrega.usuario, OrigemXP.AVALIACAO_RECEBIDA, entrega.etapa.projeto_id)

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
            desafios_ativos=Count('id', filter=Q(status=StatusDesafio.PUBLICADO)),
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


# Perfil acadêmico: projetos, publicações e perfil público do aluno

class _ItensDoPerfilViewSet(viewsets.ModelViewSet):
    """
    CRUD de itens do perfil do próprio aluno. Adicionar um item rende XP de
    atividade (respeitando o limite mensal); removê-lo devolve o XP.
    A resposta da criação traz `xp_ganho` para a tela dar o retorno ao aluno.
    """
    permission_classes = [permissions.IsAuthenticated, IsStudentUser]
    origem_xp = None

    def get_queryset(self):
        return self.serializer_class.Meta.model.objects.filter(usuario=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(usuario=request.user)
        lancamento = xp.conceder(request.user, self.origem_xp, item.pk)
        return Response(
            {**serializer.data, 'xp_ganho': lancamento.xp if lancamento else 0},
            status=status.HTTP_201_CREATED,
        )

    def perform_destroy(self, instance):
        xp.estornar(self.request.user, self.origem_xp, instance.pk)
        instance.delete()


class ProjetoAcademicoViewSet(_ItensDoPerfilViewSet):
    """/api/perfil/projetos/ — projetos de disciplinas, com o repositório."""
    serializer_class = ProjetoAcademicoSerializer
    origem_xp = OrigemXP.PROJETO_ACADEMICO


class PublicacaoViewSet(_ItensDoPerfilViewSet):
    """/api/perfil/publicacoes/ — artigos, resumos, TCC, iniciação científica."""
    serializer_class = PublicacaoSerializer
    origem_xp = OrigemXP.PUBLICACAO


class PodeVerPerfilDoAluno(permissions.BasePermission):
    """O perfil do aluno é visto por empresas (para avaliar candidatos) e pelo próprio aluno."""
    def has_object_permission(self, request, view, obj):
        return bool(request.user.empresa_id) or obj.pk == request.user.pk


class AlunoPublicoView(generics.RetrieveAPIView):
    """
    GET /api/alunos/{id}/

    Perfil do aluno como a empresa vê: dados acadêmicos, projetos (destaques
    primeiro), publicações, o histórico de desafios — só "participou", sem o
    resultado — e o selo com a contagem geral de aprovações (sem dizer quais).

    A atividade (XP e gráfico do semestre) só vem na resposta se o aluno
    ligou "mostrar atividade"; o próprio aluno sempre a vê.
    """
    permission_classes = [permissions.IsAuthenticated, PodeVerPerfilDoAluno]
    queryset = Usuario.objects.filter(empresa__isnull=True).select_related('perfil')

    def retrieve(self, request, *args, **kwargs):
        aluno = self.get_object()
        perfil, _ = PerfilUsuario.objects.get_or_create(usuario=aluno)
        proprio = aluno.pk == request.user.pk

        dados = {
            'id': aluno.pk,
            'nome': aluno.nome,
            'perfil': PerfilUsuarioSerializer(perfil).data,
            'projetos': ProjetoAcademicoSerializer(aluno.projetos_academicos.all(), many=True).data,
            'publicacoes': PublicacaoSerializer(aluno.publicacoes.all(), many=True).data,
            'historico': self._historico(aluno),
            'aprovacoes': xp.contar_aprovacoes(aluno),
            'proprio': proprio,
        }
        if not proprio:
            dados['perfil'].pop('mostrar_atividade')  # preferência privada do aluno
        if proprio or perfil.mostrar_atividade:
            resumo = xp.resumo_atividade(aluno)
            resumo.pop('limites_do_mes')  # só interessa ao próprio aluno, na tela de atividade
            dados['atividade'] = resumo
        return Response(dados)

    @staticmethod
    def _historico(aluno):
        """Desafios em que o aluno enviou entrega — sem status, só a participação."""
        participacoes = (
            Entrega.objects.filter(usuario=aluno)
            .values('etapa__projeto_id', 'etapa__projeto__titulo', 'etapa__projeto__empresa_id', 'etapa__projeto__empresa__nome')
            .annotate(primeira_entrega=Min('entregue_em'))
            .order_by('-primeira_entrega')
        )
        return [
            {
                'desafio': {'id': linha['etapa__projeto_id'], 'titulo': linha['etapa__projeto__titulo']},
                'empresa': (
                    {'id': linha['etapa__projeto__empresa_id'], 'nome': linha['etapa__projeto__empresa__nome']}
                    if linha['etapa__projeto__empresa_id'] else None
                ),
                'participou_em': linha['primeira_entrega'],
            }
            for linha in participacoes
        ]


# Perfil público da empresa

class EmpresaPublicaView(generics.RetrieveAPIView):
    """
    GET /api/empresas/{id}/

    Perfil da empresa como o aluno vê: dados, contatos e redes, os números
    gerais e o histórico de desafios publicados e encerrados (rascunhos ficam
    de fora), cada um com participantes e submissões.
    """
    permission_classes = [permissions.IsAuthenticated]
    queryset = Empresa.objects.all()

    def retrieve(self, request, *args, **kwargs):
        empresa = self.get_object()
        perfil, _ = PerfilEmpresa.objects.get_or_create(empresa=empresa)
        desafios = (
            Projeto.objects.filter(empresa=empresa, status__in=[StatusDesafio.PUBLICADO, StatusDesafio.ENCERRADO])
            .annotate(**numeros_do_desafio())
            .order_by('-publicado_em', '-created_at')
        )
        lista = [
            {
                'id': d.id, 'vaga_titulo': d.vaga_titulo, 'titulo': d.titulo, 'dificuldade': d.dificuldade, 'status': d.status,
                'aceita_entregas': d.aceita_entregas, 'prazo': d.prazo, 'publicado_em': d.publicado_em,
                'participantes': d.num_participantes, 'submissoes': d.num_submissoes,
            }
            for d in desafios
        ]
        dados = PerfilEmpresaSerializer(perfil).data
        dados.pop('empresa_id')
        return Response({
            'id': empresa.id,
            **dados,
            'numeros': {
                'desafios_publicados': len(lista),
                'desafios_abertos': sum(1 for d in lista if d['aceita_entregas']),
                'alunos_alcancados': Inscricao.objects.filter(projeto__in=desafios).values('usuario').distinct().count(),
                'submissoes': sum(d['submissoes'] for d in lista),
            },
            'desafios': lista,
            'propria': request.user.empresa_id == empresa.id,
        })
