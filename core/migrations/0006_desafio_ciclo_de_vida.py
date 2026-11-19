"""
Desafios passam a ter ciclo de vida (rascunho → publicado → encerrado) e
ficam abertos a todos os alunos: saem `ativo` e `nivel_minimo`.
"""
from django.db import migrations, models


def ativo_para_status(apps, schema_editor):
    Projeto = apps.get_model('core', 'Projeto')
    for projeto in Projeto.objects.all():
        if projeto.ativo:
            projeto.status = 'publicado'
            projeto.publicado_em = projeto.created_at
        else:
            projeto.status = 'rascunho'
        projeto.save(update_fields=['status', 'publicado_em'])


def status_para_ativo(apps, schema_editor):
    Projeto = apps.get_model('core', 'Projeto')
    Projeto.objects.filter(status='publicado').update(ativo=True)
    Projeto.objects.exclude(status='publicado').update(ativo=False)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_alter_entrega_status_alter_projeto_ativo_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='projeto',
            name='status',
            field=models.CharField(
                choices=[('rascunho', 'Rascunho'), ('publicado', 'Publicado'), ('encerrado', 'Encerrado')],
                db_index=True, default='rascunho', max_length=10, verbose_name='Status',
            ),
        ),
        migrations.AddField(
            model_name='projeto',
            name='publicado_em',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Publicado em'),
        ),
        migrations.AddField(
            model_name='projeto',
            name='prazo',
            field=models.DateField(
                blank=True, null=True, verbose_name='Prazo',
                help_text='Último dia para participar e enviar entregas (opcional).',
            ),
        ),
        migrations.AddField(
            model_name='projeto',
            name='periodo_recomendado',
            field=models.PositiveSmallIntegerField(
                blank=True, null=True, verbose_name='Período recomendado',
                help_text='Período do curso a partir do qual o desafio é recomendado. Só informativo, não bloqueia.',
            ),
        ),
        migrations.RunPython(ativo_para_status, status_para_ativo),
        migrations.RemoveField(model_name='projeto', name='ativo'),
        migrations.RemoveField(model_name='projeto', name='nivel_minimo'),
        migrations.AlterModelOptions(
            name='projeto',
            options={'ordering': ['-created_at'], 'verbose_name': 'Projeto', 'verbose_name_plural': 'Projetos'},
        ),
    ]
