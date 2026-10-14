import pytest
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Empresa, Usuario

URL = '/api/auth/register/'
LOGOUT_URL = '/api/auth/logout/'

# todos os testes deste arquivo usam o banco (equivale a pedir a fixture db em cada um)
pytestmark = pytest.mark.django_db


def dados_registro(**extra):
    """Payload válido de registro; cada teste sobrescreve só o campo que quer testar."""
    dados = {
        'username': 'novo',
        'nome': 'Novo Aluno',
        'email': 'novo@teste.com',
        'password': 'SenhaForte#2026',
        'password_confirm': 'SenhaForte#2026',
    }
    dados.update(extra)
    return dados


# Registro

def test_registro_de_estudante(api_client):
    resp = api_client.post(URL, dados_registro())

    assert resp.status_code == 201
    usuario = Usuario.objects.get(email='novo@teste.com')
    assert usuario.empresa is None


def test_senha_salva_criptografada(api_client):
    api_client.post(URL, dados_registro())

    usuario = Usuario.objects.get(email='novo@teste.com')
    assert usuario.password != 'SenhaForte#2026'
    assert usuario.check_password('SenhaForte#2026')


def test_resposta_nao_devolve_a_senha(api_client):
    resp = api_client.post(URL, dados_registro())

    assert 'password' not in resp.data
    assert 'password_confirm' not in resp.data


def test_senhas_diferentes_retorna_400(api_client):
    resp = api_client.post(URL, dados_registro(password_confirm='OutraSenha#2026'))

    assert resp.status_code == 400
    assert 'password_confirm' in resp.data
    assert not Usuario.objects.exists()


def test_senha_fraca_retorna_400(api_client):
    resp = api_client.post(URL, dados_registro(password='12345678', password_confirm='12345678'))

    assert resp.status_code == 400
    assert 'password' in resp.data


def test_email_duplicado_retorna_400(api_client, estudante):
    resp = api_client.post(URL, dados_registro(username='outro', email=estudante.email))

    assert resp.status_code == 400
    assert 'email' in resp.data


def test_registro_de_empresa_cria_empresa_vinculada(api_client):
    resp = api_client.post(URL, dados_registro(
        is_company=True, empresa_nome='TechBR', empresa_setor='Tecnologia',
    ))

    assert resp.status_code == 201
    usuario = Usuario.objects.get(email='novo@teste.com')
    assert usuario.empresa.nome == 'TechBR'
    assert usuario.empresa.setor == 'Tecnologia'


def test_empresa_sem_nome_retorna_400(api_client):
    resp = api_client.post(URL, dados_registro(is_company=True, empresa_setor='Tecnologia'))

    assert resp.status_code == 400
    assert 'empresa_nome' in resp.data
    assert not Empresa.objects.exists()


def test_empresa_sem_setor_retorna_400(api_client):
    resp = api_client.post(URL, dados_registro(is_company=True, empresa_nome='TechBR'))

    assert resp.status_code == 400
    assert 'empresa_setor' in resp.data


# Logout

def test_logout_sem_refresh_retorna_400(api_client, estudante):
    api_client.force_authenticate(estudante)
    resp = api_client.post(LOGOUT_URL, {})

    assert resp.status_code == 400


def test_logout_com_token_invalido_retorna_400(api_client, estudante):
    api_client.force_authenticate(estudante)
    resp = api_client.post(LOGOUT_URL, {'refresh': 'token-falso'})

    assert resp.status_code == 400


def test_logout_invalida_o_refresh_token(api_client, estudante):
    refresh = str(RefreshToken.for_user(estudante))
    api_client.force_authenticate(estudante)

    resp = api_client.post(LOGOUT_URL, {'refresh': refresh})
    assert resp.status_code == 205

    # depois do logout, o mesmo refresh token não gera mais access token
    api_client.force_authenticate(None)
    resp = api_client.post('/api/auth/token/refresh/', {'refresh': refresh})
    assert resp.status_code == 401


def test_logout_exige_login(api_client):
    resp = api_client.post(LOGOUT_URL, {'refresh': 'qualquer'})

    assert resp.status_code == 401
