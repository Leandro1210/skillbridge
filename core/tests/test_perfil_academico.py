"""Perfil acadêmico do aluno: dados do semestre, projetos, publicações e o perfil público."""
import pytest

from core import xp
from core.models import Entrega, LancamentoXP, Projeto, ProjetoAcademico, Publicacao

PERFIL_URL = '/api/perfil/usuario/'
PROJETOS_URL = '/api/perfil/projetos/'
PUBLICACOES_URL = '/api/perfil/publicacoes/'


def aluno_url(usuario):
    return f'/api/alunos/{usuario.id}/'


def xp_de(usuario, origem):
    return list(LancamentoXP.objects.filter(usuario=usuario, origem=origem).values_list('xp', flat=True))


# Dados do semestre

def test_perfil_aceita_os_campos_academicos(api_client, estudante):
    api_client.force_authenticate(estudante)
    resp = api_client.patch(PERFIL_URL, {
        'curso': 'Engenharia de Software', 'periodo_atual': 6, 'estudando_atualmente': 'React',
        'github_url': 'https://github.com/aluno', 'linkedin_url': 'https://linkedin.com/in/aluno',
        'mostrar_atividade': True,
    })

    assert resp.status_code == 200
    estudante.perfil.refresh_from_db()
    assert estudante.perfil.curso == 'Engenharia de Software'
    assert estudante.perfil.periodo_atual == 6
    assert estudante.perfil.mostrar_atividade is True


@pytest.mark.parametrize('periodo', [0, 13])
def test_periodo_fora_da_faixa_e_recusado(api_client, estudante, periodo):
    api_client.force_authenticate(estudante)

    assert api_client.patch(PERFIL_URL, {'periodo_atual': periodo}).status_code == 400


def test_atualizar_periodo_e_estudos_conta_uma_vez_por_semestre(api_client, estudante):
    api_client.force_authenticate(estudante)

    api_client.patch(PERFIL_URL, {'periodo_atual': 6})  # só o período: ainda não conta
    assert xp_de(estudante, 'perfil_semestre') == []

    api_client.patch(PERFIL_URL, {'estudando_atualmente': 'Estruturas de Dados'})
    api_client.patch(PERFIL_URL, {'estudando_atualmente': 'Estruturas de Dados, React'})

    lancamentos = LancamentoXP.objects.filter(usuario=estudante, origem='perfil_semestre')
    assert [(l.xp, l.referencia) for l in lancamentos] == [(50, xp.temporada_atual())]


# Projetos e publicações

def test_adicionar_projeto_rende_xp_e_aparece_na_lista(api_client, estudante):
    api_client.force_authenticate(estudante)
    resp = api_client.post(PROJETOS_URL, {
        'titulo': 'API de biblioteca', 'disciplina': 'Programação Web', 'periodo': 4,
        'repo_url': 'https://github.com/aluno/api', 'destaque': True,
    })

    assert resp.status_code == 201
    assert resp.data['xp_ganho'] == 40
    assert xp_de(estudante, 'projeto_academico') == [40]
    lista = api_client.get(PROJETOS_URL).data['results']
    assert [p['titulo'] for p in lista] == ['API de biblioteca']


def test_projeto_exige_repositorio_valido(api_client, estudante):
    api_client.force_authenticate(estudante)

    assert api_client.post(PROJETOS_URL, {'titulo': 'Sem repo'}).status_code == 400
    assert api_client.post(PROJETOS_URL, {'titulo': 'X', 'repo_url': 'nao-e-url'}).status_code == 400


def test_mesmo_repositorio_duas_vezes_e_recusado_com_mensagem(api_client, estudante):
    api_client.force_authenticate(estudante)
    dados = {'titulo': 'API', 'repo_url': 'https://github.com/aluno/api'}
    api_client.post(PROJETOS_URL, dados)

    resp = api_client.post(PROJETOS_URL, dados)

    assert resp.status_code == 400
    assert resp.data['repo_url'] == ['Este repositório já está no seu perfil.']


def test_editar_projeto_mantendo_o_mesmo_repositorio(api_client, estudante):
    api_client.force_authenticate(estudante)
    projeto = api_client.post(PROJETOS_URL, {'titulo': 'API', 'repo_url': 'https://github.com/aluno/api'}).data

    resp = api_client.patch(f"{PROJETOS_URL}{projeto['id']}/", {'titulo': 'API v2', 'repo_url': 'https://github.com/aluno/api'})

    assert resp.status_code == 200
    assert resp.data['titulo'] == 'API v2'


def test_quinto_projeto_no_mes_nao_rende_xp(api_client, estudante):
    api_client.force_authenticate(estudante)
    for numero in range(5):
        resp = api_client.post(PROJETOS_URL, {'titulo': f'P{numero}', 'repo_url': f'https://github.com/aluno/p{numero}'})

    assert resp.status_code == 201  # o projeto entra no perfil...
    assert resp.data['xp_ganho'] == 0  # ...mas sem XP: limite de 4 por mês
    assert ProjetoAcademico.objects.filter(usuario=estudante).count() == 5


def test_remover_projeto_devolve_o_xp(api_client, estudante):
    api_client.force_authenticate(estudante)
    projeto = api_client.post(PROJETOS_URL, {'titulo': 'API', 'repo_url': 'https://github.com/aluno/api'}).data

    assert api_client.delete(f"{PROJETOS_URL}{projeto['id']}/").status_code == 204
    assert xp_de(estudante, 'projeto_academico') == []


def test_aluno_so_ve_e_mexe_nos_proprios_projetos(api_client, estudante, outro_estudante):
    alheio = ProjetoAcademico.objects.create(usuario=outro_estudante, titulo='Alheio', repo_url='https://github.com/outro/x')
    api_client.force_authenticate(estudante)

    assert api_client.get(PROJETOS_URL).data['results'] == []
    assert api_client.delete(f'{PROJETOS_URL}{alheio.id}/').status_code == 404


def test_empresa_nao_gerencia_projetos_academicos(api_client, usuario_empresa):
    api_client.force_authenticate(usuario_empresa)

    assert api_client.get(PROJETOS_URL).status_code == 403


def test_publicacao_rende_xp_e_valida_duplicada(api_client, estudante):
    api_client.force_authenticate(estudante)
    dados = {'titulo': 'Testes em projetos acadêmicos', 'tipo': 'resumo', 'ano': 2026, 'url': 'https://doi.org/10.1/x'}

    resp = api_client.post(PUBLICACOES_URL, dados)
    assert resp.status_code == 201
    assert resp.data['xp_ganho'] == 80

    duplicada = api_client.post(PUBLICACOES_URL, dados)
    assert duplicada.status_code == 400
    assert duplicada.data['url'] == ['Esta publicação já está no seu perfil.']


# Perfil público do aluno

@pytest.fixture
def aluno_com_perfil(estudante):
    perfil = estudante.perfil
    perfil.curso = 'Engenharia de Software'
    perfil.periodo_atual = 6
    perfil.save()
    ProjetoAcademico.objects.create(usuario=estudante, titulo='Comum', repo_url='https://github.com/a/comum')
    ProjetoAcademico.objects.create(usuario=estudante, titulo='Destaque', repo_url='https://github.com/a/top', destaque=True)
    Publicacao.objects.create(usuario=estudante, titulo='Artigo', url='https://doi.org/10.1/a', ano=2026)
    return estudante


def test_empresa_ve_o_perfil_academico_do_aluno(api_client, usuario_empresa, aluno_com_perfil):
    api_client.force_authenticate(usuario_empresa)
    dados = api_client.get(aluno_url(aluno_com_perfil)).data

    assert dados['nome'] == 'Aluno Teste'
    assert dados['perfil']['curso'] == 'Engenharia de Software'
    assert dados['perfil']['periodo_atual'] == 6
    assert [p['titulo'] for p in dados['projetos']] == ['Destaque', 'Comum']  # destaques primeiro
    assert [p['titulo'] for p in dados['publicacoes']] == ['Artigo']
    assert dados['proprio'] is False
    assert 'mostrar_atividade' not in dados['perfil']  # preferência privada


def test_atividade_so_aparece_para_a_empresa_se_o_aluno_permitir(api_client, usuario_empresa, aluno_com_perfil):
    xp.conceder(aluno_com_perfil, 'acesso_diario', 'hoje')
    api_client.force_authenticate(usuario_empresa)

    assert 'atividade' not in api_client.get(aluno_url(aluno_com_perfil)).data  # nem o campo vai

    aluno_com_perfil.perfil.mostrar_atividade = True
    aluno_com_perfil.perfil.save()
    atividade = api_client.get(aluno_url(aluno_com_perfil)).data['atividade']
    assert atividade['xp'] == 5
    assert 'serie_semanal' in atividade
    assert 'limites_do_mes' not in atividade


def test_o_proprio_aluno_sempre_ve_a_atividade(api_client, aluno_com_perfil):
    api_client.force_authenticate(aluno_com_perfil)
    dados = api_client.get(aluno_url(aluno_com_perfil)).data

    assert dados['proprio'] is True
    assert 'atividade' in dados
    assert dados['perfil']['mostrar_atividade'] is False


def test_historico_mostra_so_a_participacao_sem_o_resultado(
    api_client, usuario_empresa, inscrito, projeto, empresa,
):
    etapa = projeto.etapas.first()
    Entrega.objects.create(usuario=inscrito, etapa=etapa, status='reprovado')
    Entrega.objects.create(usuario=inscrito, etapa=etapa, status='aprovado')  # mesmo desafio: 1 linha
    outro = Projeto.objects.create(empresa=empresa, titulo='Outro', descricao='.', ferramentas='Go', status='publicado')
    Entrega.objects.create(usuario=inscrito, etapa=outro.etapas.create(ordem=1, descricao='.', criterios_tecnicos='.'), status='reprovado')

    api_client.force_authenticate(usuario_empresa)
    dados = api_client.get(aluno_url(inscrito)).data

    assert [h['desafio']['titulo'] for h in dados['historico']] == ['Outro', 'API REST']
    assert dados['historico'][0]['empresa'] == {'id': empresa.id, 'nome': 'TechBR'}
    assert set(dados['historico'][0]) == {'desafio', 'empresa', 'participou_em'}  # nada de status
    assert dados['aprovacoes'] == 1  # o selo: só a contagem


def test_historico_ignora_inscricao_sem_entrega(api_client, usuario_empresa, inscrito):
    api_client.force_authenticate(usuario_empresa)

    assert api_client.get(aluno_url(inscrito)).data['historico'] == []


def test_aluno_nao_ve_perfil_de_outro_aluno(api_client, estudante, outro_estudante):
    api_client.force_authenticate(estudante)

    assert api_client.get(aluno_url(outro_estudante)).status_code == 403


def test_perfil_de_empresa_nao_e_perfil_de_aluno(api_client, usuario_empresa, usuario_outra_empresa):
    api_client.force_authenticate(usuario_empresa)

    assert api_client.get(aluno_url(usuario_outra_empresa)).status_code == 404


def test_submissoes_da_empresa_trazem_candidato_etapa_e_desafio(api_client, usuario_empresa, inscrito, projeto):
    # antes vinham só ids, e a tela mostrava as submissões sem o nome do candidato
    etapa = projeto.etapas.first()
    Entrega.objects.create(usuario=inscrito, etapa=etapa, repo_url='https://github.com/a/b')

    api_client.force_authenticate(usuario_empresa)
    item = api_client.get('/api/empresa/submissoes/').data['results'][0]

    assert item['usuario'] == {'id': inscrito.id, 'nome': 'Aluno Teste', 'email': 'aluno@teste.com'}
    assert item['etapa'] == {'id': etapa.id, 'ordem': 1, 'descricao': 'Etapa 1'}
    assert item['desafio'] == {'id': projeto.id, 'titulo': 'API REST'}


# Certificados (texto livre do aluno)

def test_aluno_descreve_os_certificados_em_texto_livre(api_client, estudante):
    api_client.force_authenticate(estudante)
    texto = 'AWS Cloud Practitioner (2026)\nPython Avançado, Senai, 60h'

    resp = api_client.patch(PERFIL_URL, {'certificados': texto})

    assert resp.status_code == 200
    estudante.perfil.refresh_from_db()
    assert estudante.perfil.certificados == texto


def test_certificados_aparecem_no_perfil_publico(api_client, usuario_empresa, estudante):
    estudante.perfil.certificados = 'Scrum Foundation'
    estudante.perfil.save()
    api_client.force_authenticate(usuario_empresa)

    resp = api_client.get(aluno_url(estudante))

    assert resp.data['perfil']['certificados'] == 'Scrum Foundation'
