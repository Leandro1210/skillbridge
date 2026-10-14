import pytest

from core.models import Entrega, Projeto


def test_xp_por_etapa_projeto_facil():
    assert Projeto(dificuldade='facil').xp_por_etapa == 100


@pytest.mark.parametrize('xp, nivel', [(0, 1), (999, 1), (1000, 2), (2500, 3)])
def test_recalcular_nivel(estudante, xp, nivel):
    estudante.xp_total = xp
    estudante.recalcular_nivel()
    assert estudante.nivel == nivel


def test_taxa_sucesso_ignora_pendentes(estudante, projeto):
    etapa = projeto.etapas.first()
    for status in ['aprovado', 'aprovado', 'reprovado', 'pendente']:
        Entrega.objects.create(usuario=estudante, etapa=etapa, status=status)
    estudante.recalcular_taxa_sucesso()
    assert estudante.taxa_sucesso == pytest.approx(66.67)
