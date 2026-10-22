import pytest

from core.models import (
    Entrega,
    Habilidade,
    HabilidadeUsuario,
    Inscricao,
    PerfilEmpresa,
    Projeto,
    RequisitoVaga,
    Vaga,
)


@pytest.mark.parametrize('dificuldade, xp', [('facil', 100), ('medio', 250), ('dificil', 500)])
def test_xp_por_etapa(dificuldade, xp):
    assert Projeto(dificuldade=dificuldade).xp_por_etapa == xp


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


def test_taxa_sucesso_sem_entregas_avaliadas_e_zero(estudante, projeto):
    Entrega.objects.create(usuario=estudante, etapa=projeto.etapas.first(), status='pendente')
    estudante.taxa_sucesso = 50.0

    estudante.recalcular_taxa_sucesso()

    assert estudante.taxa_sucesso == 0.0


def test_perfil_do_usuario_criado_automaticamente(estudante):
    # o signal post_save cria o PerfilUsuario junto com o usuário
    assert estudante.perfil.bio == ''


def test_representacao_em_texto_dos_models(estudante, empresa, projeto):
    """__str__ é o que aparece no Django Admin e nos logs."""
    etapa = projeto.etapas.first()
    python = Habilidade.objects.create(nome='Python')
    vaga = Vaga.objects.create(empresa=empresa, titulo='Backend')

    assert str(estudante) == 'Aluno Teste (Nv. 1)'
    assert str(estudante.perfil) == 'Perfil de Aluno Teste'
    assert str(empresa) == 'TechBR'
    assert str(PerfilEmpresa.objects.create(empresa=empresa)) == 'Perfil de TechBR'
    assert str(projeto) == 'API REST [Médio]'
    assert str(etapa) == 'API REST — Etapa 1'
    assert str(Inscricao.objects.create(usuario=estudante, projeto=projeto)) == 'Aluno Teste -> API REST [Em Andamento]'
    assert str(Entrega.objects.create(usuario=estudante, etapa=etapa)) == 'Aluno Teste → API REST — Etapa 1 [Pendente]'
    assert str(python) == 'Python (Hard Skill)'
    assert str(vaga) == 'Backend — TechBR'
    assert str(HabilidadeUsuario.objects.create(usuario=estudante, habilidade=python, nivel=7)) == 'Aluno Teste — Python (Nv. 7)'
    assert str(RequisitoVaga.objects.create(vaga=vaga, habilidade=python, nivel_requerido=5)) == 'Backend requer Python Nv.5'
