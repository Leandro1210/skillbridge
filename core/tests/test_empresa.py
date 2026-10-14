from core.models import Empresa, Entrega, Usuario


def avaliar_url(entrega):
    return f'/api/empresa/submissoes/{entrega.id}/avaliar/'


def test_aprovar_concede_xp_e_sobe_nivel(api_client, usuario_empresa, inscrito, projeto):
    inscrito.xp_total = 900
    inscrito.save()
    entrega = Entrega.objects.create(usuario=inscrito, etapa=projeto.etapas.first())

    api_client.force_authenticate(usuario_empresa)
    resp = api_client.patch(avaliar_url(entrega), {'status': 'aprovado'})

    assert resp.status_code == 200
    inscrito.refresh_from_db()
    assert inscrito.xp_total == 1150
    assert inscrito.nivel == 2
    assert inscrito.taxa_sucesso == 100.0


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
    inscrito.refresh_from_db()
    assert inscrito.xp_total == 0


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
        usuario=inscrito, etapa=projeto.etapas.first(), status='aprovado', xp_ganho=250,
    )

    api_client.force_authenticate(usuario_empresa)
    resp = api_client.patch(avaliar_url(entrega), {'status': 'aprovado'})

    assert resp.status_code == 409
    inscrito.refresh_from_db()
    assert inscrito.xp_total == 0  # não concedeu XP de novo


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
