"""Fluxo do aluno com desafios: feed, página do desafio, participação e permissões de escrita."""
from datetime import timedelta

import pytest
from django.utils import timezone

from core.models import Etapa, Inscricao, PerfilEmpresa, Projeto

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


def test_qualquer_aluno_participa_de_desafio_publicado(api_client, estudante, projeto):
    # não existe mais trava de nível: quem avalia se o aluno está apto é a empresa
    projeto.periodo_recomendado = 8  # recomendação, não requisito
    projeto.save()

    api_client.force_authenticate(estudante)
    resp = api_client.post(iniciar_url(projeto))

    assert resp.status_code == 201


def test_nao_participa_de_desafio_encerrado(api_client, estudante, projeto):
    projeto.status = 'encerrado'
    projeto.save()

    api_client.force_authenticate(estudante)
    resp = api_client.post(iniciar_url(projeto))

    assert resp.status_code == 403
    assert not Inscricao.objects.exists()


def test_nao_participa_de_desafio_com_prazo_vencido(api_client, estudante, projeto):
    projeto.prazo = timezone.localdate() - timedelta(days=1)
    projeto.save()

    api_client.force_authenticate(estudante)
    resp = api_client.post(iniciar_url(projeto))

    assert resp.status_code == 403


def test_desafio_em_rascunho_nao_existe_para_o_aluno(api_client, estudante, projeto):
    projeto.status = 'rascunho'
    projeto.save()

    api_client.force_authenticate(estudante)

    assert api_client.post(iniciar_url(projeto)).status_code == 404
    assert api_client.get(f'{CATALOGO_URL}{projeto.id}/').status_code == 404


# Feed e página do desafio

def criar_desafio(empresa, **campos):
    dados = {
        'empresa': empresa, 'titulo': 'Outro', 'descricao': '...', 'ferramentas': 'Go',
        'status': 'publicado', 'publicado_em': timezone.now(),
    }
    dados.update(campos)
    return Projeto.objects.create(**dados)


def test_feed_mostra_so_publicados_e_dentro_do_prazo(api_client, estudante, projeto, empresa):
    rascunho = criar_desafio(empresa, titulo='Rascunho', status='rascunho', publicado_em=None)
    encerrado = criar_desafio(empresa, titulo='Encerrado', status='encerrado')
    vencido = criar_desafio(empresa, titulo='Vencido', prazo=timezone.localdate() - timedelta(days=1))
    no_prazo = criar_desafio(empresa, titulo='Hoje é o último dia', prazo=timezone.localdate())

    api_client.force_authenticate(estudante)
    ids = ids_da_lista(api_client.get(CATALOGO_URL))

    assert projeto.id in ids
    assert no_prazo.id in ids
    assert rascunho.id not in ids
    assert encerrado.id not in ids
    assert vencido.id not in ids


def test_feed_do_mais_recente_para_o_mais_antigo(api_client, estudante, projeto, empresa):
    antigo = criar_desafio(empresa, titulo='Antigo', publicado_em=timezone.now() - timedelta(days=10))
    novo = criar_desafio(empresa, titulo='Novo', publicado_em=timezone.now() + timedelta(minutes=1))

    api_client.force_authenticate(estudante)
    ids = ids_da_lista(api_client.get(CATALOGO_URL))

    assert ids == [novo.id, projeto.id, antigo.id]


def test_item_do_feed_traz_empresa_participantes_e_se_ja_participa(
    api_client, inscrito, outro_estudante, projeto, empresa,
):
    PerfilEmpresa.objects.create(empresa=empresa, area_atuacao='SaaS', cidade='Anápolis, GO', logo_url='https://techbr.com/logo.png')
    Inscricao.objects.create(usuario=outro_estudante, projeto=projeto)

    api_client.force_authenticate(inscrito)
    item = api_client.get(CATALOGO_URL).data['results'][0]

    assert item['empresa'] == {
        'id': empresa.id, 'nome': 'TechBR', 'setor': 'Tecnologia', 'area_atuacao': 'SaaS',
        'cidade': 'Anápolis, GO', 'logo_url': 'https://techbr.com/logo.png',
    }
    assert item['participantes'] == 2
    assert item['ja_participa'] is True
    # o feed mostra primeiro a vaga
    assert item['vaga_titulo'] == 'Estágio Back-end'
    assert item['vaga_modalidade'] == 'remoto'
    assert item['vaga_tecnologias'] == 'Python, SQL'


def test_ja_participa_e_falso_para_quem_nao_entrou(api_client, estudante, projeto):
    api_client.force_authenticate(estudante)
    item = api_client.get(CATALOGO_URL).data['results'][0]

    assert item['ja_participa'] is False
    assert item['empresa']['area_atuacao'] == ''  # empresa sem perfil estendido


@pytest.mark.parametrize('filtro, esperado', [
    ({'q': 'docker'}, 'Containers'),            # busca nas ferramentas do desafio
    ({'q': 'mensageria'}, 'Containers'),        # busca no enunciado
    ({'q': 'estágio back'}, 'API REST'),        # busca no título da vaga
    ({'q': 'apis'}, 'API REST'),                # busca na descrição da vaga
    ({'dificuldade': 'avancado'}, 'Containers'),
    ({'tecnologia': 'django'}, 'API REST'),     # tecnologia do desafio
    ({'tecnologia': 'sql'}, 'API REST'),        # tecnologia esperada pela vaga
])
def test_filtros_do_feed(api_client, estudante, projeto, empresa, filtro, esperado):
    criar_desafio(empresa, titulo='Containers', descricao='Filas e mensageria', ferramentas='Docker, RabbitMQ', dificuldade='avancado')

    api_client.force_authenticate(estudante)
    resp = api_client.get(CATALOGO_URL, filtro)

    assert [item['titulo'] for item in resp.data['results']] == [esperado]


def test_lista_resumida_e_detalhe_com_etapas(api_client, estudante, projeto):
    api_client.force_authenticate(estudante)

    lista = api_client.get(CATALOGO_URL)
    assert 'etapas' not in lista.data['results'][0]

    detalhe = api_client.get(f'{CATALOGO_URL}{projeto.id}/')
    assert detalhe.status_code == 200
    assert len(detalhe.data['etapas']) == 1
    assert detalhe.data['aceita_entregas'] is True
    assert detalhe.data['empresa']['nome'] == 'TechBR'


def test_pagina_de_desafio_encerrado_continua_acessivel(api_client, inscrito, projeto):
    # quem participou precisa continuar vendo as entregas e o feedback
    projeto.status = 'encerrado'
    projeto.save()

    api_client.force_authenticate(inscrito)
    resp = api_client.get(f'{CATALOGO_URL}{projeto.id}/')

    assert resp.status_code == 200
    assert resp.data['aceita_entregas'] is False


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
