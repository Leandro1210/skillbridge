"""Perfil completo da empresa: edição, perfil público, números dos desafios e filtros de submissões."""
import pytest
from django.utils import timezone

from core.models import Entrega, Inscricao, PerfilEmpresa, Projeto

PERFIL_URL = '/api/perfil/empresa/'
DESAFIOS_URL = '/api/empresa/projetos/'
SUBMISSOES_URL = '/api/empresa/submissoes/'


def empresa_url(empresa):
    return f'/api/empresas/{empresa.id}/'


def criar_desafio(empresa, titulo, status='publicado'):
    projeto = Projeto.objects.create(
        empresa=empresa, titulo=titulo, descricao='.', ferramentas='Go', status=status,
        publicado_em=timezone.now() if status != 'rascunho' else None,
    )
    projeto.etapas.create(ordem=1, descricao='Etapa 1', criterios_tecnicos='.')
    return projeto


# Edição do perfil

def test_empresa_edita_dados_contatos_e_redes(api_client, usuario_empresa, empresa):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.patch(PERFIL_URL, {
        'nome': 'TechBR Sistemas', 'setor': 'Software', 'descricao': 'Startup de SaaS',
        'area_atuacao': 'SaaS B2B', 'cidade': 'Anápolis, GO', 'email_contato': 'vagas@techbr.com',
        'telefone': '(62) 3333-0000', 'linkedin_url': 'https://linkedin.com/company/techbr',
        'instagram_url': 'https://instagram.com/techbr', 'logo_url': 'https://techbr.com/logo.png',
    })

    assert resp.status_code == 200
    assert resp.data['empresa_id'] == empresa.id
    empresa.refresh_from_db()
    assert (empresa.nome, empresa.setor, empresa.descricao) == ('TechBR Sistemas', 'Software', 'Startup de SaaS')
    perfil = PerfilEmpresa.objects.get(empresa=empresa)
    assert perfil.cidade == 'Anápolis, GO'
    assert perfil.email_contato == 'vagas@techbr.com'
    assert perfil.instagram_url == 'https://instagram.com/techbr'


def test_editar_so_o_perfil_nao_mexe_na_empresa(api_client, usuario_empresa, empresa):
    api_client.force_authenticate(usuario_empresa)
    api_client.patch(PERFIL_URL, {'cidade': 'Remoto'})

    empresa.refresh_from_db()
    assert empresa.nome == 'TechBR'


@pytest.mark.parametrize('campo, valor', [('email_contato', 'nao-e-email'), ('linkedin_url', 'nao-e-url'), ('nome', '')])
def test_validacao_do_perfil_da_empresa(api_client, usuario_empresa, campo, valor):
    api_client.force_authenticate(usuario_empresa)

    assert api_client.patch(PERFIL_URL, {campo: valor}).status_code == 400


# Perfil público

def test_perfil_publico_mostra_dados_e_so_desafios_publicados_ou_encerrados(
    api_client, estudante, outro_estudante, empresa,
):
    PerfilEmpresa.objects.create(empresa=empresa, area_atuacao='SaaS', cidade='Anápolis, GO', email_contato='vagas@techbr.com')
    aberto = criar_desafio(empresa, 'Aberto')
    encerrado = criar_desafio(empresa, 'Encerrado', status='encerrado')
    criar_desafio(empresa, 'Rascunho', status='rascunho')
    Inscricao.objects.create(usuario=estudante, projeto=aberto)
    Inscricao.objects.create(usuario=outro_estudante, projeto=aberto)
    Inscricao.objects.create(usuario=estudante, projeto=encerrado)
    Entrega.objects.create(usuario=estudante, etapa=aberto.etapas.first())

    api_client.force_authenticate(estudante)
    dados = api_client.get(empresa_url(empresa)).data

    assert dados['nome'] == 'TechBR'
    assert dados['area_atuacao'] == 'SaaS'
    assert dados['email_contato'] == 'vagas@techbr.com'
    assert 'empresa_id' not in dados
    assert [(d['titulo'], d['status']) for d in dados['desafios']] == [('Encerrado', 'encerrado'), ('Aberto', 'publicado')]
    assert 'vaga_titulo' in dados['desafios'][0]
    por_titulo = {d['titulo']: d for d in dados['desafios']}
    assert (por_titulo['Aberto']['participantes'], por_titulo['Aberto']['submissoes']) == (2, 1)
    assert por_titulo['Aberto']['aceita_entregas'] is True
    assert por_titulo['Encerrado']['aceita_entregas'] is False
    assert dados['numeros'] == {'desafios_publicados': 2, 'desafios_abertos': 1, 'alunos_alcancados': 2, 'submissoes': 1}
    assert dados['propria'] is False


def test_empresa_sem_perfil_preenchido_tambem_abre(api_client, estudante, empresa):
    api_client.force_authenticate(estudante)
    dados = api_client.get(empresa_url(empresa)).data

    assert dados['nome'] == 'TechBR'
    assert dados['desafios'] == []
    assert dados['numeros']['alunos_alcancados'] == 0


def test_a_propria_empresa_ve_que_e_o_proprio_perfil(api_client, usuario_empresa, empresa):
    api_client.force_authenticate(usuario_empresa)

    assert api_client.get(empresa_url(empresa)).data['propria'] is True


def test_perfil_publico_exige_login_e_empresa_existente(api_client, estudante, db):
    assert api_client.get('/api/empresas/1/').status_code == 401
    api_client.force_authenticate(estudante)
    assert api_client.get('/api/empresas/99999/').status_code == 404


# Números na gestão de desafios

def test_desafios_da_empresa_trazem_participantes_submissoes_e_aprovados(
    api_client, usuario_empresa, inscrito, outro_estudante, projeto,
):
    etapa = projeto.etapas.first()
    Inscricao.objects.create(usuario=outro_estudante, projeto=projeto)
    Entrega.objects.create(usuario=inscrito, etapa=etapa, status='reprovado')
    Entrega.objects.create(usuario=inscrito, etapa=etapa, status='aprovado')
    Entrega.objects.create(usuario=outro_estudante, etapa=etapa, status='pendente')

    api_client.force_authenticate(usuario_empresa)
    item = api_client.get(DESAFIOS_URL).data['results'][0]

    assert (item['participantes'], item['submissoes'], item['aprovados']) == (2, 3, 1)


def test_desafio_recem_criado_vem_com_numeros_zerados(api_client, usuario_empresa):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.post(DESAFIOS_URL, {
        'vaga_titulo': 'Estágio', 'vaga_descricao': '.', 'vaga_tecnologias': 'Go',
        'titulo': 'Novo', 'descricao': '.', 'ferramentas': 'Go',
    })

    assert (resp.data['participantes'], resp.data['submissoes'], resp.data['aprovados']) == (0, 0, 0)


# Filtros das submissões

def test_submissoes_filtradas_por_desafio_e_por_candidato(
    api_client, usuario_empresa, inscrito, outro_estudante, projeto, empresa,
):
    outro = criar_desafio(empresa, 'Outro desafio')
    no_projeto = Entrega.objects.create(usuario=inscrito, etapa=projeto.etapas.first())
    no_outro = Entrega.objects.create(usuario=outro_estudante, etapa=outro.etapas.first())

    api_client.force_authenticate(usuario_empresa)

    def ids(params):
        return [e['id'] for e in api_client.get(SUBMISSOES_URL, params).data['results']]

    assert ids({'desafio': projeto.id}) == [no_projeto.id]
    assert ids({'q': 'outro aluno'}) == [no_outro.id]        # por nome
    assert ids({'q': 'aluno@teste'}) == [no_projeto.id]       # por e-mail
    assert set(ids({'desafio': 'abc'})) == {no_projeto.id, no_outro.id}  # filtro inválido é ignorado
