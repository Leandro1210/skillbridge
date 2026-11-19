from datetime import timedelta

from django.utils import timezone

from core.models import Empresa, Entrega, Inscricao, LancamentoXP, PerfilEmpresa, Projeto, Usuario


def avaliar_url(entrega):
    return f'/api/empresa/submissoes/{entrega.id}/avaliar/'


def xp_por_avaliacao(usuario):
    return list(LancamentoXP.objects.filter(usuario=usuario, origem='avaliacao_recebida').values_list('xp', flat=True))


def test_aprovar_registra_a_aprovacao_e_a_atividade(api_client, usuario_empresa, inscrito, projeto):
    entrega = Entrega.objects.create(usuario=inscrito, etapa=projeto.etapas.first())

    api_client.force_authenticate(usuario_empresa)
    resp = api_client.patch(avaliar_url(entrega), {'status': 'aprovado'})

    assert resp.status_code == 200
    entrega.refresh_from_db()
    assert entrega.status == 'aprovado'
    # a aprovação não dá XP de competência; receber avaliação conta como atividade
    assert xp_por_avaliacao(inscrito) == [20]


def test_reprovar_nao_concede_xp(api_client, usuario_empresa, inscrito, projeto):
    entrega = Entrega.objects.create(usuario=inscrito, etapa=projeto.etapas.first())

    api_client.force_authenticate(usuario_empresa)
    resp = api_client.patch(
        avaliar_url(entrega), {'status': 'reprovado', 'feedback_validacao': 'Faltou o README'},
    )

    assert resp.status_code == 200
    entrega.refresh_from_db()
    assert entrega.status == 'reprovado'
    assert entrega.feedback_validacao == 'Faltou o README'
    # reprovada também conta como atividade: o aluno entregou algo avaliável
    assert xp_por_avaliacao(inscrito) == [20]


def test_avaliacao_conta_atividade_uma_vez_por_desafio(api_client, usuario_empresa, inscrito, projeto):
    etapa = projeto.etapas.first()
    primeira = Entrega.objects.create(usuario=inscrito, etapa=etapa)
    segunda = Entrega.objects.create(usuario=inscrito, etapa=etapa)

    api_client.force_authenticate(usuario_empresa)
    api_client.patch(avaliar_url(primeira), {'status': 'reprovado'})
    api_client.patch(avaliar_url(segunda), {'status': 'aprovado'})

    assert xp_por_avaliacao(inscrito) == [20]


def test_outra_empresa_nao_pode_avaliar(api_client, inscrito, projeto):
    outra = Empresa.objects.create(nome='Concorrente', setor='Tecnologia')
    rh_outra = Usuario.objects.create_user(
        username='rh2', email='rh2@outra.com', password='SenhaForte#2026', nome='RH Outra', empresa=outra,
    )
    entrega = Entrega.objects.create(usuario=inscrito, etapa=projeto.etapas.first())

    api_client.force_authenticate(rh_outra)
    resp = api_client.patch(avaliar_url(entrega), {'status': 'aprovado'})

    assert resp.status_code == 403
    entrega.refresh_from_db()
    assert entrega.status == 'pendente'


def test_entrega_aprovada_nao_pode_ser_reavaliada(api_client, usuario_empresa, inscrito, projeto):
    entrega = Entrega.objects.create(
        usuario=inscrito, etapa=projeto.etapas.first(), status='aprovado',
    )

    api_client.force_authenticate(usuario_empresa)
    resp = api_client.patch(avaliar_url(entrega), {'status': 'reprovado'})

    assert resp.status_code == 409
    entrega.refresh_from_db()
    assert entrega.status == 'aprovado'
    assert xp_por_avaliacao(inscrito) == []


def test_status_invalido_retorna_400(api_client, usuario_empresa, inscrito, projeto):
    entrega = Entrega.objects.create(usuario=inscrito, etapa=projeto.etapas.first())

    api_client.force_authenticate(usuario_empresa)
    resp = api_client.patch(avaliar_url(entrega), {'status': 'xyz'})

    assert resp.status_code == 400


def test_estudante_nao_acessa_rotas_de_empresa(api_client, inscrito, projeto):
    entrega = Entrega.objects.create(usuario=inscrito, etapa=projeto.etapas.first())

    api_client.force_authenticate(inscrito)
    resp = api_client.patch(avaliar_url(entrega), {'status': 'aprovado'})

    assert resp.status_code == 403


def test_dashboard_conta_desafios_e_submissoes(api_client, usuario_empresa, inscrito, projeto):
    etapa = projeto.etapas.first()
    Entrega.objects.create(usuario=inscrito, etapa=etapa, status='pendente')
    Entrega.objects.create(usuario=inscrito, etapa=etapa, status='aprovado')

    api_client.force_authenticate(usuario_empresa)
    resp = api_client.get('/api/empresa/dashboard/')

    assert resp.status_code == 200
    assert resp.data['total_desafios'] == 1
    assert resp.data['total_submissoes'] == 2
    assert resp.data['submissoes_pendentes'] == 1
    assert resp.data['submissoes_aprovadas'] == 1
    assert resp.data['estudantes_unicos'] == 1


def _painel(api_client, usuario_empresa):
    api_client.force_authenticate(usuario_empresa)
    resp = api_client.get('/api/empresa/dashboard/')
    assert resp.status_code == 200
    return resp.data


def test_dashboard_traz_identidade_e_desafios_por_status(api_client, usuario_empresa, empresa, projeto):
    PerfilEmpresa.objects.update_or_create(empresa=empresa, defaults={'area_atuacao': 'SaaS', 'cidade': 'Anápolis, GO'})
    Projeto.objects.create(empresa=empresa, titulo='Rascunho', descricao='...', status='rascunho')
    Projeto.objects.create(empresa=empresa, titulo='Antigo', descricao='...', status='encerrado')

    dados = _painel(api_client, usuario_empresa)

    assert dados['empresa']['area_atuacao'] == 'SaaS'
    assert dados['empresa']['cidade'] == 'Anápolis, GO'
    assert (dados['desafios_ativos'], dados['desafios_rascunho'], dados['desafios_encerrados']) == (1, 1, 1)


def test_dashboard_serie_semanal_tem_12_semanas_e_conta_a_atual(api_client, usuario_empresa, inscrito, projeto):
    etapa = projeto.etapas.first()
    Entrega.objects.create(usuario=inscrito, etapa=etapa)
    antiga = Entrega.objects.create(usuario=inscrito, etapa=etapa)
    Entrega.objects.filter(pk=antiga.pk).update(entregue_em=timezone.now() - timedelta(weeks=20))  # fora da janela

    dados = _painel(api_client, usuario_empresa)

    serie = dados['serie_semanal']
    assert len(serie) == 12
    assert serie[-1]['total'] == 1
    assert sum(s['total'] for s in serie) == 1
    assert dados['submissoes_ultimos_7_dias'] == 1


def test_dashboard_fila_de_pendentes_comeca_pela_mais_antiga(api_client, usuario_empresa, inscrito, projeto):
    etapa = projeto.etapas.first()
    recente = Entrega.objects.create(usuario=inscrito, etapa=etapa)
    antiga = Entrega.objects.create(usuario=inscrito, etapa=etapa)
    Entrega.objects.filter(pk=antiga.pk).update(entregue_em=timezone.now() - timedelta(days=3))
    Entrega.objects.create(usuario=inscrito, etapa=etapa, status='aprovado')  # fora da fila

    dados = _painel(api_client, usuario_empresa)

    assert [p['id'] for p in dados['pendentes']] == [antiga.id, recente.id]
    assert dados['pendentes'][0]['candidato'] == {'id': inscrito.id, 'nome': 'Aluno Teste'}
    assert dados['pendentes'][0]['desafio']['vaga_titulo'] == 'Estágio Back-end'


def test_dashboard_processos_abertos_com_funil(api_client, usuario_empresa, empresa, inscrito, outro_estudante, projeto):
    Inscricao.objects.create(usuario=outro_estudante, projeto=projeto)
    etapa = projeto.etapas.first()
    Entrega.objects.create(usuario=inscrito, etapa=etapa, status='aprovado')
    Entrega.objects.create(usuario=outro_estudante, etapa=etapa)
    Projeto.objects.create(empresa=empresa, titulo='Rascunho', descricao='...', status='rascunho')

    dados = _painel(api_client, usuario_empresa)

    assert len(dados['processos']) == 1  # só os publicados
    processo = dados['processos'][0]
    assert processo['vaga_titulo'] == 'Estágio Back-end'
    assert (processo['participantes'], processo['submissoes'], processo['aprovados'], processo['pendentes']) == (2, 2, 1, 1)


def test_dashboard_lista_o_que_falta_no_perfil(api_client, usuario_empresa, empresa):
    empresa.descricao = 'Fazemos software.'
    empresa.save()
    PerfilEmpresa.objects.update_or_create(empresa=empresa, defaults={'cidade': 'Anápolis, GO', 'website': 'https://techbr.com'})

    dados = _painel(api_client, usuario_empresa)

    assert dados['perfil_pendente'] == ['Logo', 'Área de atuação', 'E-mail de contato']
