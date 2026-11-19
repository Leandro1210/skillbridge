"""Regras do XP de atividade (core/xp.py) e os endpoints de atividade."""
from datetime import date, datetime, time, timedelta

import pytest
from django.utils import timezone

from core import xp
from core.models import Entrega, LancamentoXP, OrigemXP, Projeto

ACESSO_URL = '/api/atividade/acesso/'
ATIVIDADE_URL = '/api/perfil/atividade/'


def lancar(usuario, origem, referencia, quando, xp_valor=10):
    """Lançamento numa data específica, sem passar pelas regras (para montar cenários)."""
    return LancamentoXP.objects.create(
        usuario=usuario, origem=origem, referencia=str(referencia), xp=xp_valor,
        temporada=xp.temporada_de(quando), criado_em=timezone.make_aware(datetime.combine(quando, time(12))),
    )


# Temporadas

@pytest.mark.parametrize('dia, temporada', [
    (date(2026, 1, 1), '2026.1'),
    (date(2026, 6, 30), '2026.1'),
    (date(2026, 7, 1), '2026.2'),
    (date(2026, 12, 31), '2026.2'),
])
def test_temporada_e_o_semestre_do_calendario(dia, temporada):
    assert xp.temporada_de(dia) == temporada


def test_periodo_da_temporada():
    assert xp.periodo_da_temporada('2026.1') == (date(2026, 1, 1), date(2026, 6, 30))
    assert xp.periodo_da_temporada('2026.2') == (date(2026, 7, 1), date(2026, 12, 31))


# Conceder

def test_conceder_registra_o_xp_da_regra_na_temporada_atual(estudante):
    lancamento = xp.conceder(estudante, OrigemXP.PARTICIPACAO_DESAFIO, 7)

    assert lancamento.xp == 60
    assert lancamento.temporada == xp.temporada_atual()
    assert lancamento.referencia == '7'


def test_mesma_referencia_nao_da_xp_duas_vezes(estudante):
    assert xp.conceder(estudante, OrigemXP.ACESSO_DIARIO, '2026-11-12') is not None
    assert xp.conceder(estudante, OrigemXP.ACESSO_DIARIO, '2026-11-12') is None
    assert LancamentoXP.objects.count() == 1


def test_limite_mensal_e_liberado_no_mes_seguinte(estudante):
    for repo in range(4):
        assert xp.conceder(estudante, OrigemXP.PROJETO_ACADEMICO, repo) is not None
    # o 5º projeto no mês não dá XP
    assert xp.conceder(estudante, OrigemXP.PROJETO_ACADEMICO, 99) is None

    # um dos 4 "foi" no mês passado: sobra uma vaga neste mês
    antigo = LancamentoXP.objects.filter(origem=OrigemXP.PROJETO_ACADEMICO).first()
    antigo.criado_em = timezone.now() - timedelta(days=40)
    antigo.save()
    assert xp.conceder(estudante, OrigemXP.PROJETO_ACADEMICO, 99) is not None


def test_usuario_de_empresa_nao_ganha_xp(usuario_empresa):
    assert xp.conceder(usuario_empresa, OrigemXP.ACESSO_DIARIO, 'hoje') is None
    assert not LancamentoXP.objects.exists()


def test_estornar_remove_o_xp(estudante):
    xp.conceder(estudante, OrigemXP.PUBLICACAO, 3)

    assert xp.estornar(estudante, OrigemXP.PUBLICACAO, 3) is True
    assert xp.estornar(estudante, OrigemXP.PUBLICACAO, 3) is False
    assert xp.xp_da_temporada(estudante) == 0


# Consultas

def test_xp_da_temporada_soma_so_a_temporada_pedida(estudante):
    lancar(estudante, OrigemXP.ACESSO_DIARIO, 'a', date(2026, 3, 1), 30)
    lancar(estudante, OrigemXP.ACESSO_DIARIO, 'b', date(2026, 8, 1), 50)
    lancar(estudante, OrigemXP.ACESSO_DIARIO, 'c', date(2026, 9, 1), 5)

    assert xp.xp_da_temporada(estudante, '2026.1') == 30
    assert xp.xp_da_temporada(estudante, '2026.2') == 55


@pytest.mark.parametrize('pontos, nivel', [
    (0, 'Inativo'), (99, 'Inativo'), (100, 'Ativo'), (499, 'Ativo'),
    (500, 'Muito ativo'), (1000, 'Destaque'), (5000, 'Destaque'),
])
def test_nivel_de_atividade(pontos, nivel):
    assert xp.nivel_atividade(pontos) == nivel


def test_proximo_nivel():
    assert xp.proximo_nivel(80) == {'nome': 'Ativo', 'xp_faltante': 20}
    assert xp.proximo_nivel(355) == {'nome': 'Muito ativo', 'xp_faltante': 145}
    assert xp.proximo_nivel(1200) is None


def test_serie_semanal_cobre_a_temporada_ate_hoje_e_separa_por_origem(estudante):
    hoje = timezone.localdate()
    inicio, _ = xp.periodo_da_temporada(xp.temporada_atual())
    lancar(estudante, OrigemXP.ACESSO_DIARIO, 'x', hoje, 5)
    lancar(estudante, OrigemXP.PARTICIPACAO_DESAFIO, 'y', hoje, 60)
    lancar(estudante, OrigemXP.ACESSO_DIARIO, 'z', inicio, 5)

    serie = xp.serie_semanal(estudante)

    primeira_segunda = inicio - timedelta(days=inicio.weekday())
    assert serie[0]['inicio'] == primeira_segunda.isoformat()
    assert len(serie) == (hoje - primeira_segunda).days // 7 + 1
    assert serie[0]['total'] == 5
    assert serie[-1]['por_origem'] == {'acesso_diario': 5, 'participacao_desafio': 60}
    assert sum(semana['total'] for semana in serie) == 70


def test_temporadas_anteriores_viram_historico(estudante):
    lancar(estudante, OrigemXP.ACESSO_DIARIO, 'a', date(2025, 3, 1), 600)
    lancar(estudante, OrigemXP.ACESSO_DIARIO, 'b', date(2025, 9, 1), 120)
    xp.conceder(estudante, OrigemXP.ACESSO_DIARIO, 'hoje')  # temporada atual: fora do histórico

    assert xp.temporadas_anteriores(estudante) == [
        {'temporada': '2025.2', 'xp': 120, 'nivel': 'Ativo'},
        {'temporada': '2025.1', 'xp': 600, 'nivel': 'Muito ativo'},
    ]


def test_limites_do_mes(estudante):
    xp.conceder(estudante, OrigemXP.PUBLICACAO, 1)

    limites = xp.limites_do_mes(estudante)

    assert limites['publicacao'] == {'limite': 2, 'usados': 1, 'restantes': 1}
    assert limites['projeto_academico']['restantes'] == 4
    assert 'acesso_diario' not in limites  # sem limite mensal


def test_contar_aprovacoes_por_desafio_distinto(estudante, projeto, empresa):
    etapa = projeto.etapas.first()
    Entrega.objects.create(usuario=estudante, etapa=etapa, status='aprovado')
    Entrega.objects.create(usuario=estudante, etapa=etapa, status='aprovado')  # mesmo desafio
    outro = Projeto.objects.create(empresa=empresa, titulo='Outro', descricao='...', ferramentas='Go', status='publicado')
    Entrega.objects.create(usuario=estudante, etapa=outro.etapas.create(ordem=1, descricao='.', criterios_tecnicos='.'), status='reprovado')

    assert xp.contar_aprovacoes(estudante) == 1


# Endpoints

def test_acesso_diario_da_xp_uma_vez_por_dia(api_client, estudante):
    api_client.force_authenticate(estudante)

    assert api_client.post(ACESSO_URL).data == {'xp_ganho': 5}
    assert api_client.post(ACESSO_URL).data == {'xp_ganho': 0}
    assert xp.xp_da_temporada(estudante) == 5


def test_empresa_nao_usa_os_endpoints_de_atividade(api_client, usuario_empresa):
    api_client.force_authenticate(usuario_empresa)

    assert api_client.post(ACESSO_URL).status_code == 403
    assert api_client.get(ATIVIDADE_URL).status_code == 403


@pytest.mark.django_db
def test_endpoints_de_atividade_exigem_login(api_client):
    assert api_client.post(ACESSO_URL).status_code == 401
    assert api_client.get(ATIVIDADE_URL).status_code == 401


def test_resumo_da_atividade(api_client, estudante):
    xp.conceder(estudante, OrigemXP.PARTICIPACAO_DESAFIO, 1)
    api_client.force_authenticate(estudante)

    resumo = api_client.get(ATIVIDADE_URL).data

    assert resumo['temporada'] == xp.temporada_atual()
    assert resumo['xp'] == 60
    assert resumo['nivel'] == 'Inativo'
    assert resumo['proximo_nivel'] == {'nome': 'Ativo', 'xp_faltante': 40}
    assert resumo['serie_semanal'][-1]['total'] == 60
    assert resumo['temporadas_anteriores'] == []
    assert set(resumo['limites_do_mes']) == {'projeto_academico', 'publicacao'}


def test_participar_de_desafio_conta_atividade_uma_vez(api_client, inscrito, projeto):
    api_client.force_authenticate(inscrito)
    dados = {'etapa_id': projeto.etapas.first().id, 'repo_url': 'https://github.com/aluno/projeto'}

    api_client.post('/api/entregas/', dados)
    api_client.post('/api/entregas/', dados)  # segunda entrega no mesmo desafio

    participacoes = LancamentoXP.objects.filter(usuario=inscrito, origem='participacao_desafio')
    assert [(p.xp, p.referencia) for p in participacoes] == [(60, str(projeto.id))]
