import pytest
from rest_framework.test import APIClient

from core.models import Empresa, Etapa, Inscricao, Projeto, Usuario


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def estudante(db):
    return Usuario.objects.create_user(
        username='aluno', email='aluno@teste.com', password='SenhaForte#2026', nome='Aluno Teste',
    )


@pytest.fixture
def empresa(db):
    return Empresa.objects.create(nome='TechBR', setor='Tecnologia')


@pytest.fixture
def usuario_empresa(empresa):
    return Usuario.objects.create_user(
        username='rh', email='rh@techbr.com', password='SenhaForte#2026', nome='RH TechBR', empresa=empresa,
    )


@pytest.fixture
def projeto(empresa):
    projeto = Projeto.objects.create(
        empresa=empresa, titulo='API REST', descricao='...', ferramentas='Python, Django',
        dificuldade='medio', nivel_minimo=0,
    )
    Etapa.objects.create(projeto=projeto, ordem=1, descricao='Etapa 1', criterios_tecnicos='...')
    return projeto


@pytest.fixture
def inscrito(estudante, projeto):
    """Estudante já inscrito no projeto (pré-requisito para enviar entregas)."""
    Inscricao.objects.create(usuario=estudante, projeto=projeto)
    return estudante
