"""Gestão de desafios e listagem de submissões pela empresa (/api/empresa/...)."""
import pytest

from core.models import Entrega, Projeto

DESAFIOS_URL = '/api/empresa/projetos/'
SUBMISSOES_URL = '/api/empresa/submissoes/'


def desafio_url(projeto, acao=''):
    return f'{DESAFIOS_URL}{projeto.id}/{acao}'


def ids_da_lista(resp):
    return [item['id'] for item in resp.data['results']]


@pytest.fixture
def projeto_da_concorrente(usuario_outra_empresa):
    return Projeto.objects.create(
        empresa=usuario_outra_empresa.empresa, titulo='Desafio da concorrente', descricao='...', ferramentas='Go',
    )


# Criar e listar

def test_criar_desafio_vincula_empresa_e_gera_etapa(api_client, usuario_empresa):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.post(DESAFIOS_URL, {
        'titulo': 'Novo desafio', 'descricao': '...', 'ferramentas': 'Python', 'dificuldade': 'facil',
    })

    assert resp.status_code == 201
    projeto = Projeto.objects.get(titulo='Novo desafio')
    assert projeto.empresa == usuario_empresa.empresa
    # todo desafio novo nasce com a etapa principal criada automaticamente
    assert projeto.etapas.count() == 1
    assert projeto.etapas.first().ordem == 1


def test_empresa_lista_so_os_proprios_desafios(api_client, usuario_empresa, projeto, projeto_da_concorrente):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.get(DESAFIOS_URL)

    assert resp.status_code == 200
    assert ids_da_lista(resp) == [projeto.id]


def test_estudante_nao_acessa_gestao_de_desafios(api_client, estudante):
    api_client.force_authenticate(estudante)

    assert api_client.get(DESAFIOS_URL).status_code == 403
    assert api_client.post(DESAFIOS_URL, {'titulo': 'X', 'descricao': '...', 'ferramentas': 'Python'}).status_code == 403


@pytest.mark.xfail(
    strict=True,
    reason='Bug conhecido: ProjetoSerializer não inclui o campo "ativo", então a tela da empresa '
           'mostra todo desafio como "Rascunho". Quando o campo for adicionado, este teste passa '
           'e o xfail deve ser removido.',
)
def test_lista_de_desafios_informa_se_esta_ativo(api_client, usuario_empresa, projeto):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.get(DESAFIOS_URL)

    assert resp.data['results'][0]['ativo'] is True


# Editar e excluir

def test_editar_proprio_desafio(api_client, usuario_empresa, projeto):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.patch(desafio_url(projeto), {'titulo': 'Título novo'})

    assert resp.status_code == 200
    projeto.refresh_from_db()
    assert projeto.titulo == 'Título novo'


def test_excluir_proprio_desafio(api_client, usuario_empresa, projeto):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.delete(desafio_url(projeto))

    assert resp.status_code == 204
    assert not Projeto.objects.filter(id=projeto.id).exists()


def test_nao_edita_desafio_de_outra_empresa(api_client, usuario_empresa, projeto_da_concorrente):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.patch(desafio_url(projeto_da_concorrente), {'titulo': 'Sabotado'})

    # 404, e não 403: para a empresa, o desafio alheio simplesmente não existe
    assert resp.status_code == 404
    projeto_da_concorrente.refresh_from_db()
    assert projeto_da_concorrente.titulo == 'Desafio da concorrente'


def test_nao_exclui_desafio_de_outra_empresa(api_client, usuario_empresa, projeto_da_concorrente):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.delete(desafio_url(projeto_da_concorrente))

    assert resp.status_code == 404
    assert Projeto.objects.filter(id=projeto_da_concorrente.id).exists()


# Publicar e desativar

def test_desativar_e_publicar_desafio(api_client, usuario_empresa, projeto):
    api_client.force_authenticate(usuario_empresa)

    resp = api_client.post(desafio_url(projeto, 'desativar/'))
    assert resp.status_code == 200
    projeto.refresh_from_db()
    assert projeto.ativo is False

    resp = api_client.post(desafio_url(projeto, 'publicar/'))
    assert resp.status_code == 200
    projeto.refresh_from_db()
    assert projeto.ativo is True


def test_nao_desativa_desafio_de_outra_empresa(api_client, usuario_empresa, projeto_da_concorrente):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.post(desafio_url(projeto_da_concorrente, 'desativar/'))

    assert resp.status_code == 404
    projeto_da_concorrente.refresh_from_db()
    assert projeto_da_concorrente.ativo is True


# Submissões recebidas

def test_submissoes_mostram_so_entregas_dos_proprios_desafios(
    api_client, usuario_empresa, inscrito, projeto, projeto_da_concorrente,
):
    etapa_alheia = projeto_da_concorrente.etapas.create(ordem=1, descricao='...', criterios_tecnicos='...')
    minha = Entrega.objects.create(usuario=inscrito, etapa=projeto.etapas.first())
    alheia = Entrega.objects.create(usuario=inscrito, etapa=etapa_alheia)

    api_client.force_authenticate(usuario_empresa)
    resp = api_client.get(SUBMISSOES_URL)

    assert resp.status_code == 200
    ids = ids_da_lista(resp)
    assert minha.id in ids
    assert alheia.id not in ids


def test_submissoes_filtradas_por_status(api_client, usuario_empresa, inscrito, projeto):
    etapa = projeto.etapas.first()
    pendente = Entrega.objects.create(usuario=inscrito, etapa=etapa, status='pendente')
    Entrega.objects.create(usuario=inscrito, etapa=etapa, status='reprovado')

    api_client.force_authenticate(usuario_empresa)

    resp = api_client.get(SUBMISSOES_URL, {'status': 'pendente'})
    assert ids_da_lista(resp) == [pendente.id]

    # status desconhecido é ignorado: devolve tudo em vez de erro
    resp = api_client.get(SUBMISSOES_URL, {'status': 'xyz'})
    assert len(ids_da_lista(resp)) == 2
