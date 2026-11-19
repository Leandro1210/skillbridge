"""
Dificuldade vira nível: fácil/médio/difícil → iniciante/intermediário/avançado.
Converte os desafios existentes (e desfaz a conversão no rollback).
"""

from django.db import migrations, models

PARA_NIVEL = {'facil': 'iniciante', 'medio': 'intermediario', 'dificil': 'avancado'}


def converter(mapa):
    def executar(apps, schema_editor):
        Projeto = apps.get_model('core', 'Projeto')
        for antigo, novo in mapa.items():
            Projeto.objects.filter(dificuldade=antigo).update(dificuldade=novo)
    return executar


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_vaga_e_desafio'),
    ]

    operations = [
        # primeiro aumenta o campo ('intermediario' tem 13 letras), depois converte
        migrations.AlterField(
            model_name='projeto',
            name='dificuldade',
            field=models.CharField(
                choices=[('iniciante', 'Iniciante'), ('intermediario', 'Intermediário'), ('avancado', 'Avançado')],
                default='intermediario', max_length=15, verbose_name='Nível',
            ),
        ),
        migrations.RunPython(
            converter(PARA_NIVEL),
            converter({novo: antigo for antigo, novo in PARA_NIVEL.items()}),
        ),
    ]
