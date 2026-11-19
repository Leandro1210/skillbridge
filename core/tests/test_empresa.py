from core.models import Empresa, Entrega, LancamentoXP, Usuario


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
