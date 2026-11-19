from datetime import timedelta

import pytest
from django.utils import timezone

from core.models import (
    Entrega,
    Habilidade,
    HabilidadeUsuario,
    Inscricao,
    LancamentoXP,
    PerfilEmpresa,
    Projeto,
    ProjetoAcademico,
    Publicacao,
    RequisitoVaga,
    Vaga,
)


@pytest.mark.parametrize('status, dias_de_prazo, aceita', [
    ('publicado', None, True),
    ('publicado', 0, True),       # último dia ainda vale
    ('publicado', -1, False),     # prazo vencido
    ('rascunho', None, False),
    ('encerrado', None, False),
])
def test_desafio_aceita_entregas(status, dias_de_prazo, aceita):
    prazo = None if dias_de_prazo is None else timezone.localdate() + timedelta(days=dias_de_prazo)
    assert Projeto(status=status, prazo=prazo).aceita_entregas is aceita


def test_perfil_do_usuario_criado_automaticamente(estudante):
    # o signal post_save cria o PerfilUsuario junto com o usuário
    assert estudante.perfil.bio == ''


def test_representacao_em_texto_dos_models(estudante, empresa, projeto):
    """__str__ é o que aparece no Django Admin e nos logs."""
    etapa = projeto.etapas.first()
    python = Habilidade.objects.create(nome='Python')
    vaga = Vaga.objects.create(empresa=empresa, titulo='Backend')

    assert str(estudante) == 'Aluno Teste'
    assert str(estudante.perfil) == 'Perfil de Aluno Teste'
    assert str(empresa) == 'TechBR'
    assert str(PerfilEmpresa.objects.create(empresa=empresa)) == 'Perfil de TechBR'
    assert str(projeto) == 'API REST [Intermediário]'
    assert str(etapa) == 'API REST — Etapa 1'
    assert str(Inscricao.objects.create(usuario=estudante, projeto=projeto)) == 'Aluno Teste -> API REST [Em Andamento]'
    assert str(Entrega.objects.create(usuario=estudante, etapa=etapa)) == 'Aluno Teste → API REST — Etapa 1 [Pendente]'
    assert str(python) == 'Python (Hard Skill)'
    assert str(vaga) == 'Backend — TechBR'
    assert str(HabilidadeUsuario.objects.create(usuario=estudante, habilidade=python, nivel=7)) == 'Aluno Teste — Python (Nv. 7)'
    assert str(RequisitoVaga.objects.create(vaga=vaga, habilidade=python, nivel_requerido=5)) == 'Backend requer Python Nv.5'
    lancamento = LancamentoXP.objects.create(
        usuario=estudante, origem='acesso_diario', referencia='2026-11-12', xp=5, temporada='2026.2',
    )
    assert str(lancamento) == 'Aluno Teste +5 XP (Acesso diário, 2026.2)'
    projeto_academico = ProjetoAcademico.objects.create(usuario=estudante, titulo='API', repo_url='https://github.com/a/b')
    assert str(projeto_academico) == 'API (Aluno Teste)'
    assert str(Publicacao.objects.create(usuario=estudante, titulo='Artigo', tipo='tcc', url='https://x.org/1')) == 'Artigo (TCC)'
