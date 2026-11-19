"""Gestão de desafios e listagem de submissões pela empresa (/api/empresa/...)."""
import pytest

from core.models import Entrega, Projeto

DESAFIOS_URL = '/api/empresa/projetos/'

# a vaga é obrigatória ao criar: é o que o aluno vê primeiro no feed
VAGA = {
    'vaga_titulo': 'Estágio Back-end', 'vaga_descricao': 'Apoio no desenvolvimento das APIs.',
    'vaga_tecnologias': 'Python, SQL',
}
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
        **VAGA, 'vaga_modalidade': 'hibrido',
        'titulo': 'Novo desafio', 'descricao': '...', 'ferramentas': 'Python', 'dificuldade': 'iniciante',
    })

    assert resp.status_code == 201
    projeto = Projeto.objects.get(titulo='Novo desafio')
    assert projeto.empresa == usuario_empresa.empresa
    assert (projeto.vaga_titulo, projeto.vaga_modalidade) == ('Estágio Back-end', 'hibrido')
    # todo desafio novo nasce com a etapa principal criada automaticamente
    assert projeto.etapas.count() == 1
    assert projeto.etapas.first().ordem == 1
    # e como rascunho: só aparece no feed depois de publicado
    assert projeto.status == 'rascunho'
    assert projeto.publicado_em is None


def test_criar_desafio_com_prazo_e_periodo_recomendado(api_client, usuario_empresa):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.post(DESAFIOS_URL, {
        **VAGA, 'titulo': 'Com prazo', 'descricao': '...', 'ferramentas': 'Python',
        'prazo': '2030-12-31', 'periodo_recomendado': 4,
    })

    assert resp.status_code == 201
    assert resp.data['prazo'] == '2030-12-31'
    assert resp.data['periodo_recomendado'] == 4


@pytest.mark.parametrize('campo', ['vaga_titulo', 'vaga_descricao', 'vaga_tecnologias'])
def test_vaga_e_obrigatoria_ao_criar(api_client, usuario_empresa, campo):
    api_client.force_authenticate(usuario_empresa)
    dados = {**VAGA, campo: '', 'titulo': 'X', 'descricao': '.', 'ferramentas': 'Go'}

    resp = api_client.post(DESAFIOS_URL, dados)

    assert resp.status_code == 400
    assert campo in resp.data


def test_empresa_nao_muda_status_por_patch(api_client, usuario_empresa, projeto):
    # status só muda pelas ações publicar/encerrar
    api_client.force_authenticate(usuario_empresa)
    api_client.patch(desafio_url(projeto), {'status': 'encerrado'})

    projeto.refresh_from_db()
    assert projeto.status == 'publicado'


def test_empresa_lista_so_os_proprios_desafios(api_client, usuario_empresa, projeto, projeto_da_concorrente):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.get(DESAFIOS_URL)

    assert resp.status_code == 200
    assert ids_da_lista(resp) == [projeto.id]


def test_estudante_nao_acessa_gestao_de_desafios(api_client, estudante):
    api_client.force_authenticate(estudante)

    assert api_client.get(DESAFIOS_URL).status_code == 403
    assert api_client.post(DESAFIOS_URL, {'titulo': 'X', 'descricao': '...', 'ferramentas': 'Python'}).status_code == 403


def test_lista_de_desafios_informa_status_e_prazo(api_client, usuario_empresa, projeto):
    # antes, o campo "ativo" não vinha na resposta e a tela mostrava tudo como "Rascunho"
    api_client.force_authenticate(usuario_empresa)
    item = api_client.get(DESAFIOS_URL).data['results'][0]

    assert item['status'] == 'publicado'
    assert 'prazo' in item


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


# Publicar e encerrar

def test_publicar_rascunho_registra_a_data(api_client, usuario_empresa, projeto):
    projeto.status = 'rascunho'
    projeto.publicado_em = None
    projeto.save()

    api_client.force_authenticate(usuario_empresa)
    resp = api_client.post(desafio_url(projeto, 'publicar/'))

    assert resp.status_code == 200
    projeto.refresh_from_db()
    assert projeto.status == 'publicado'
    assert projeto.publicado_em is not None


def test_encerrar_e_reabrir_desafio(api_client, usuario_empresa, projeto):
    publicado_em = projeto.publicado_em
    api_client.force_authenticate(usuario_empresa)

    resp = api_client.post(desafio_url(projeto, 'encerrar/'))
    assert resp.status_code == 200
    projeto.refresh_from_db()
    assert projeto.status == 'encerrado'

    resp = api_client.post(desafio_url(projeto, 'publicar/'))
    assert resp.status_code == 200
    projeto.refresh_from_db()
    assert projeto.status == 'publicado'
    assert projeto.publicado_em == publicado_em  # reabrir não muda a data da 1ª publicação


def test_nao_encerra_desafio_de_outra_empresa(api_client, usuario_empresa, projeto_da_concorrente):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.post(desafio_url(projeto_da_concorrente, 'encerrar/'))

    assert resp.status_code == 404
    projeto_da_concorrente.refresh_from_db()
    assert projeto_da_concorrente.status == 'rascunho'


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
