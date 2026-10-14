from core.models import Entrega

URL = '/api/entregas/'
REPO = 'https://github.com/aluno/projeto'


def test_nao_inscrito_nao_pode_entregar(api_client, estudante, projeto):
    api_client.force_authenticate(estudante)
    resp = api_client.post(URL, {'etapa_id': projeto.etapas.first().id, 'repo_url': REPO})
    assert resp.status_code == 403


def test_inscrito_cria_entrega_pendente(api_client, inscrito, projeto):
    api_client.force_authenticate(inscrito)
    resp = api_client.post(URL, {'etapa_id': projeto.etapas.first().id, 'repo_url': REPO})
    assert resp.status_code == 201
    assert resp.data['status'] == 'pendente'


def test_etapa_inexistente_retorna_404(api_client, inscrito):
    api_client.force_authenticate(inscrito)
    resp = api_client.post(URL, {'etapa_id': 99999, 'repo_url': REPO})
    assert resp.status_code == 404


def test_projeto_inativo_nao_aceita_entrega(api_client, inscrito, projeto):
    projeto.ativo = False
    projeto.save()

    api_client.force_authenticate(inscrito)
    resp = api_client.post(URL, {'etapa_id': projeto.etapas.first().id, 'repo_url': REPO})
    assert resp.status_code == 403


def test_etapa_ja_aprovada_nao_aceita_nova_entrega(api_client, inscrito, projeto):
    etapa = projeto.etapas.first()
    Entrega.objects.create(usuario=inscrito, etapa=etapa, status='aprovado')

    api_client.force_authenticate(inscrito)
    resp = api_client.post(URL, {'etapa_id': etapa.id, 'repo_url': REPO})
    assert resp.status_code == 409
    # nenhuma entrega nova foi criada
    assert Entrega.objects.filter(usuario=inscrito, etapa=etapa).count() == 1


def test_url_invalida_retorna_400(api_client, inscrito, projeto):
    api_client.force_authenticate(inscrito)
    resp = api_client.post(URL, {'etapa_id': projeto.etapas.first().id, 'repo_url': 'nao-e-url'})
    assert resp.status_code == 400
