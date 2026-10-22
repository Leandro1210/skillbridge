"""Vagas recomendadas: a vaga só aparece se o aluno cumpre TODOS os requisitos no nível exigido."""
import pytest

from core.models import Habilidade, HabilidadeUsuario, RequisitoVaga, Vaga

URL = '/api/vagas/recomendadas/'


@pytest.fixture
def python(db):
    return Habilidade.objects.create(nome='Python')


@pytest.fixture
def sql(db):
    return Habilidade.objects.create(nome='SQL')


@pytest.fixture
def vaga_backend(empresa, python):
    """Vaga que exige Python nível 5."""
    vaga = Vaga.objects.create(empresa=empresa, titulo='Backend Python')
    RequisitoVaga.objects.create(vaga=vaga, habilidade=python, nivel_requerido=5)
    return vaga


def titulos_recomendados(api_client, usuario):
    api_client.force_authenticate(usuario)
    resp = api_client.get(URL)
    assert resp.status_code == 200
    return [vaga['titulo'] for vaga in resp.data['results']]


def test_vaga_aparece_quando_aluno_cumpre_o_requisito(api_client, estudante, python, vaga_backend):
    HabilidadeUsuario.objects.create(usuario=estudante, habilidade=python, nivel=6)

    assert titulos_recomendados(api_client, estudante) == ['Backend Python']


def test_nivel_exatamente_igual_ao_exigido_conta(api_client, estudante, python, vaga_backend):
    HabilidadeUsuario.objects.create(usuario=estudante, habilidade=python, nivel=5)

    assert titulos_recomendados(api_client, estudante) == ['Backend Python']


def test_vaga_nao_aparece_com_nivel_abaixo_do_exigido(api_client, estudante, python, vaga_backend):
    HabilidadeUsuario.objects.create(usuario=estudante, habilidade=python, nivel=3)

    assert titulos_recomendados(api_client, estudante) == []


def test_vaga_nao_aparece_se_falta_um_dos_requisitos(api_client, estudante, python, sql, vaga_backend):
    RequisitoVaga.objects.create(vaga=vaga_backend, habilidade=sql, nivel_requerido=4)
    HabilidadeUsuario.objects.create(usuario=estudante, habilidade=python, nivel=9)  # só Python

    assert titulos_recomendados(api_client, estudante) == []


def test_vaga_com_varios_requisitos_todos_cumpridos(api_client, estudante, python, sql, vaga_backend):
    RequisitoVaga.objects.create(vaga=vaga_backend, habilidade=sql, nivel_requerido=4)
    HabilidadeUsuario.objects.create(usuario=estudante, habilidade=python, nivel=5)
    HabilidadeUsuario.objects.create(usuario=estudante, habilidade=sql, nivel=4)

    assert titulos_recomendados(api_client, estudante) == ['Backend Python']


def test_vaga_sem_requisitos_nao_e_recomendada(api_client, estudante, empresa):
    Vaga.objects.create(empresa=empresa, titulo='Vaga genérica')

    assert titulos_recomendados(api_client, estudante) == []


def test_habilidade_de_outro_aluno_nao_conta(api_client, estudante, outro_estudante, python, vaga_backend):
    HabilidadeUsuario.objects.create(usuario=outro_estudante, habilidade=python, nivel=10)

    assert titulos_recomendados(api_client, estudante) == []
    assert titulos_recomendados(api_client, outro_estudante) == ['Backend Python']


def test_resposta_traz_empresa_e_requisitos(api_client, estudante, python, vaga_backend):
    HabilidadeUsuario.objects.create(usuario=estudante, habilidade=python, nivel=5)

    api_client.force_authenticate(estudante)
    vaga = api_client.get(URL).data['results'][0]

    assert vaga['empresa']['nome'] == 'TechBR'
    assert vaga['requisitos'][0]['habilidade']['nome'] == 'Python'
    assert vaga['requisitos'][0]['nivel_requerido'] == 5
