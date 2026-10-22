"""Perfil do usuário logado, perfis estendidos (aluno e empresa) e isolamento das entregas."""
import pytest

from core.models import Entrega, PerfilEmpresa

ME_URL = '/api/auth/me/'
PERFIL_USUARIO_URL = '/api/perfil/usuario/'
PERFIL_EMPRESA_URL = '/api/perfil/empresa/'


# /auth/me/

def test_me_retorna_o_usuario_logado(api_client, estudante):
    api_client.force_authenticate(estudante)
    resp = api_client.get(ME_URL)

    assert resp.status_code == 200
    assert resp.data['email'] == 'aluno@teste.com'
    assert resp.data['nivel'] == 1
    assert 'perfil' in resp.data


@pytest.mark.django_db
def test_me_exige_login(api_client):
    assert api_client.get(ME_URL).status_code == 401


def test_me_permite_alterar_nome(api_client, estudante):
    api_client.force_authenticate(estudante)
    resp = api_client.patch(ME_URL, {'nome': 'Nome Novo'})

    assert resp.status_code == 200
    estudante.refresh_from_db()
    assert estudante.nome == 'Nome Novo'


def test_me_nao_permite_alterar_xp_nem_nivel(api_client, estudante):
    api_client.force_authenticate(estudante)
    resp = api_client.patch(ME_URL, {'xp_total': 99999, 'nivel': 50, 'taxa_sucesso': 100})

    # o DRF ignora campos somente leitura em vez de dar erro
    assert resp.status_code == 200
    estudante.refresh_from_db()
    assert estudante.xp_total == 0
    assert estudante.nivel == 1
    assert estudante.taxa_sucesso == 0.0


# /perfil/usuario/

def test_perfil_do_aluno_get_e_patch(api_client, estudante):
    api_client.force_authenticate(estudante)

    resp = api_client.get(PERFIL_USUARIO_URL)
    assert resp.status_code == 200
    assert resp.data['bio'] == ''

    resp = api_client.patch(PERFIL_USUARIO_URL, {'bio': 'Dev backend', 'tecnologias': 'Python, Django'})
    assert resp.status_code == 200
    estudante.perfil.refresh_from_db()
    assert estudante.perfil.bio == 'Dev backend'
    assert estudante.perfil.tecnologias == 'Python, Django'


def test_perfil_do_aluno_rejeita_url_invalida(api_client, estudante):
    api_client.force_authenticate(estudante)
    resp = api_client.patch(PERFIL_USUARIO_URL, {'portfolio_url': 'nao-e-url'})

    assert resp.status_code == 400


# /perfil/empresa/

def test_estudante_nao_acessa_perfil_de_empresa(api_client, estudante):
    api_client.force_authenticate(estudante)

    assert api_client.get(PERFIL_EMPRESA_URL).status_code == 403


def test_perfil_da_empresa_e_criado_no_primeiro_acesso(api_client, usuario_empresa):
    assert not PerfilEmpresa.objects.exists()

    api_client.force_authenticate(usuario_empresa)
    resp = api_client.get(PERFIL_EMPRESA_URL)

    assert resp.status_code == 200
    assert PerfilEmpresa.objects.filter(empresa=usuario_empresa.empresa).count() == 1


def test_perfil_da_empresa_patch(api_client, usuario_empresa):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.patch(PERFIL_EMPRESA_URL, {'website': 'https://techbr.com', 'area_atuacao': 'SaaS'})

    assert resp.status_code == 200
    perfil = PerfilEmpresa.objects.get(empresa=usuario_empresa.empresa)
    assert perfil.website == 'https://techbr.com'
    assert perfil.area_atuacao == 'SaaS'


# /entregas/ (listagem)

def test_lista_de_entregas_mostra_so_as_do_proprio_aluno(api_client, inscrito, outro_estudante, projeto):
    etapa = projeto.etapas.first()
    minha = Entrega.objects.create(usuario=inscrito, etapa=etapa)
    Entrega.objects.create(usuario=outro_estudante, etapa=etapa)

    api_client.force_authenticate(inscrito)
    resp = api_client.get('/api/entregas/')

    assert resp.status_code == 200
    assert [e['id'] for e in resp.data['results']] == [minha.id]
