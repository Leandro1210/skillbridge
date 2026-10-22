"""Fluxo do aluno com projetos: catálogo, detalhe, inscrição e permissões de escrita."""
from core.models import Etapa, Inscricao, Projeto

CATALOGO_URL = '/api/projetos/'


def iniciar_url(projeto):
    return f'/api/projetos/{projeto.id}/iniciar/'


def ids_da_lista(resp):
    # as listagens são paginadas: os itens ficam em "results"
    return [item['id'] for item in resp.data['results']]


# Iniciar projeto

def test_iniciar_projeto_cria_inscricao(api_client, estudante, projeto):
    api_client.force_authenticate(estudante)
    resp = api_client.post(iniciar_url(projeto))

    assert resp.status_code == 201
    assert Inscricao.objects.filter(usuario=estudante, projeto=projeto).count() == 1


def test_iniciar_projeto_duas_vezes_nao_duplica(api_client, inscrito, projeto):
    api_client.force_authenticate(inscrito)
    resp = api_client.post(iniciar_url(projeto))

    assert resp.status_code == 200
    assert Inscricao.objects.filter(usuario=inscrito, projeto=projeto).count() == 1


def test_iniciar_projeto_acima_do_nivel_retorna_403(api_client, estudante, projeto):
    projeto.nivel_minimo = 5  # o estudante começa no nível 1
    projeto.save()

    api_client.force_authenticate(estudante)
    resp = api_client.post(iniciar_url(projeto))

    assert resp.status_code == 403
    assert not Inscricao.objects.exists()


def test_iniciar_projeto_inativo_retorna_404(api_client, estudante, projeto):
    projeto.ativo = False
    projeto.save()

    api_client.force_authenticate(estudante)
    resp = api_client.post(iniciar_url(projeto))

    assert resp.status_code == 404


# Catálogo e detalhe

def test_catalogo_nao_lista_projeto_inativo(api_client, estudante, projeto, empresa):
    inativo = Projeto.objects.create(
        empresa=empresa, titulo='Rascunho', descricao='...', ferramentas='Python', ativo=False,
    )

    api_client.force_authenticate(estudante)
    resp = api_client.get(CATALOGO_URL)

    assert resp.status_code == 200
    assert projeto.id in ids_da_lista(resp)
    assert inativo.id not in ids_da_lista(resp)


def test_catalogo_filtro_disponiveis_esconde_projetos_acima_do_nivel(api_client, estudante, projeto, empresa):
    avancado = Projeto.objects.create(
        empresa=empresa, titulo='Avançado', descricao='...', ferramentas='Python', nivel_minimo=5,
    )
    api_client.force_authenticate(estudante)

    # sem o filtro, o catálogo mostra tudo (o frontend desenha o cadeado)
    resp = api_client.get(CATALOGO_URL)
    assert avancado.id in ids_da_lista(resp)

    resp = api_client.get(CATALOGO_URL, {'disponiveis': 'true'})
    assert projeto.id in ids_da_lista(resp)
    assert avancado.id not in ids_da_lista(resp)


def test_lista_resumida_e_detalhe_com_etapas(api_client, estudante, projeto):
    api_client.force_authenticate(estudante)

    lista = api_client.get(CATALOGO_URL)
    assert 'etapas' not in lista.data['results'][0]

    detalhe = api_client.get(f'{CATALOGO_URL}{projeto.id}/')
    assert detalhe.status_code == 200
    assert len(detalhe.data['etapas']) == 1


def test_catalogo_exige_login(api_client, projeto):
    resp = api_client.get(CATALOGO_URL)

    assert resp.status_code == 401


# Escrita bloqueada para usuários comuns (desafios são geridos pela rota de empresa)

def test_estudante_nao_cria_projeto_pelo_catalogo(api_client, estudante):
    api_client.force_authenticate(estudante)
    resp = api_client.post(CATALOGO_URL, {
        'titulo': 'Invasor', 'descricao': '...', 'ferramentas': 'Python',
    })

    assert resp.status_code == 403
    assert not Projeto.objects.filter(titulo='Invasor').exists()


def test_empresa_nao_edita_projeto_pelo_catalogo(api_client, usuario_empresa, projeto):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.patch(f'{CATALOGO_URL}{projeto.id}/', {'titulo': 'Alterado'})

    assert resp.status_code == 403
    projeto.refresh_from_db()
    assert projeto.titulo == 'API REST'


# Etapas

def test_etapas_filtradas_por_projeto(api_client, estudante, projeto, empresa):
    outro = Projeto.objects.create(empresa=empresa, titulo='Outro', descricao='...', ferramentas='Go')
    etapa_outro = Etapa.objects.create(projeto=outro, ordem=1, descricao='Outra', criterios_tecnicos='...')

    api_client.force_authenticate(estudante)
    resp = api_client.get('/api/etapas/', {'projeto_id': projeto.id})

    assert resp.status_code == 200
    ids = ids_da_lista(resp)
    assert projeto.etapas.first().id in ids
    assert etapa_outro.id not in ids


def test_estudante_nao_cria_etapa(api_client, estudante, projeto):
    api_client.force_authenticate(estudante)
    resp = api_client.post('/api/etapas/', {
        'projeto': projeto.id, 'ordem': 2, 'descricao': 'Extra', 'criterios_tecnicos': '...',
    })

    assert resp.status_code == 403
    assert projeto.etapas.count() == 1


# Inscrições do aluno

def test_lista_de_inscricoes_mostra_so_as_do_proprio_aluno(api_client, inscrito, outro_estudante, projeto, empresa):
    outro_projeto = Projeto.objects.create(empresa=empresa, titulo='Outro', descricao='...', ferramentas='Go')
    inscricao_alheia = Inscricao.objects.create(usuario=outro_estudante, projeto=outro_projeto)

    api_client.force_authenticate(inscrito)
    resp = api_client.get('/api/inscricoes/')

    assert resp.status_code == 200
    ids = ids_da_lista(resp)
    assert len(ids) == 1
    assert inscricao_alheia.id not in ids
    assert resp.data['results'][0]['projeto_titulo'] == projeto.titulo
