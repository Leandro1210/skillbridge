"""
Regras do XP de atividade.

O XP mede o comprometimento do aluno no semestre — o quanto ele mantém o
perfil vivo e participa dos desafios — e NÃO a competência: não libera nem
bloqueia nada. Quem avalia se o aluno está apto é a empresa.

- Temporada = semestre do calendário (2026.1 = jan–jun, 2026.2 = jul–dez).
  O XP "zera" a cada temporada sem apagar nada: o XP atual é só a soma dos
  lançamentos da temporada vigente, e as anteriores viram histórico.
- Cada ganho é um LancamentoXP com origem e referência; a unicidade
  (usuário, origem, referência) impede ganhar duas vezes pela mesma coisa.
- Algumas origens têm limite mensal, para o XP não virar "farm".
"""
from dataclasses import dataclass
from datetime import date, timedelta

from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from core.models import Entrega, LancamentoXP, OrigemXP, StatusEntrega


@dataclass(frozen=True)
class Regra:
    xp: int
    limite_mes: int | None = None  # None: sem limite mensal (a unicidade já controla)


REGRAS = {
    OrigemXP.ACESSO_DIARIO: Regra(5),             # referência = data → 1 por dia
    OrigemXP.PERFIL_SEMESTRE: Regra(50),          # referência = temporada → 1 por semestre
    OrigemXP.PROJETO_ACADEMICO: Regra(40, limite_mes=4),
    OrigemXP.PUBLICACAO: Regra(80, limite_mes=2),
    OrigemXP.PARTICIPACAO_DESAFIO: Regra(60),     # referência = desafio → 1 por desafio
    OrigemXP.AVALIACAO_RECEBIDA: Regra(20),       # referência = desafio → 1 por desafio
}

# Do maior para o menor: o primeiro limite atingido define o nível.
NIVEIS_ATIVIDADE = [(1000, 'Destaque'), (500, 'Muito ativo'), (100, 'Ativo'), (0, 'Inativo')]


# Temporadas

def temporada_de(dia: date) -> str:
    return f'{dia.year}.{1 if dia.month <= 6 else 2}'


def temporada_atual() -> str:
    return temporada_de(timezone.localdate())


def periodo_da_temporada(temporada: str) -> tuple[date, date]:
    """Primeiro e último dia da temporada."""
    ano, semestre = (int(parte) for parte in temporada.split('.'))
    if semestre == 1:
        return date(ano, 1, 1), date(ano, 6, 30)
    return date(ano, 7, 1), date(ano, 12, 31)


# Conceder e estornar

def conceder(usuario, origem, referencia):
    """
    Registra o XP da `origem` para o usuário, se as regras permitirem.
    Devolve o lançamento criado, ou None quando não houve ganho (já ganhou por
    essa referência, estourou o limite do mês, ou o usuário é de empresa).
    """
    if usuario.empresa_id:  # XP de atividade é só de aluno
        return None

    regra = REGRAS[origem]
    agora = timezone.now()
    referencia = str(referencia)

    if regra.limite_mes is not None:
        no_mes = LancamentoXP.objects.filter(
            usuario=usuario, origem=origem,
            criado_em__year=agora.year, criado_em__month=agora.month,
        ).count()
        if no_mes >= regra.limite_mes:
            return None

    try:
        with transaction.atomic():
            return LancamentoXP.objects.create(
                usuario=usuario, origem=origem, referencia=referencia,
                xp=regra.xp, temporada=temporada_de(timezone.localdate()), criado_em=agora,
            )
    except IntegrityError:  # já ganhou por essa referência
        return None


def estornar(usuario, origem, referencia) -> bool:
    """Desfaz o XP de algo que deixou de existir (ex.: projeto removido do perfil)."""
    apagados, _ = LancamentoXP.objects.filter(usuario=usuario, origem=origem, referencia=str(referencia)).delete()
    return apagados > 0


# Consultas

def xp_da_temporada(usuario, temporada=None) -> int:
    temporada = temporada or temporada_atual()
    total = LancamentoXP.objects.filter(usuario=usuario, temporada=temporada).aggregate(total=Sum('xp'))['total']
    return total or 0


def nivel_atividade(xp: int) -> str:
    return next(nome for minimo, nome in NIVEIS_ATIVIDADE if xp >= minimo)


def proximo_nivel(xp: int):
    """{'nome', 'xp_faltante'} do próximo nível de atividade, ou None se já é o máximo."""
    acima = [(minimo, nome) for minimo, nome in NIVEIS_ATIVIDADE if minimo > xp]
    if not acima:
        return None
    minimo, nome = min(acima)
    return {'nome': nome, 'xp_faltante': minimo - xp}


def serie_semanal(usuario, temporada=None):
    """
    XP por semana da temporada, separado por origem, do início da temporada
    até a semana atual (ou até o fim, se a temporada já passou). Semanas sem
    atividade aparecem com zero — o "vazio" também é informação no gráfico.
    """
    temporada = temporada or temporada_atual()
    inicio, fim = periodo_da_temporada(temporada)
    fim = min(fim, timezone.localdate())
    segunda_inicial = inicio - timedelta(days=inicio.weekday())

    semanas = []
    segunda = segunda_inicial
    while segunda <= fim:
        semanas.append({'inicio': segunda, 'total': 0, 'por_origem': {}})
        segunda += timedelta(days=7)

    lancamentos = LancamentoXP.objects.filter(usuario=usuario, temporada=temporada).values_list('criado_em', 'origem', 'xp')
    for criado_em, origem, xp in lancamentos:
        indice = (timezone.localtime(criado_em).date() - segunda_inicial).days // 7
        if 0 <= indice < len(semanas):
            semana = semanas[indice]
            semana['total'] += xp
            semana['por_origem'][origem] = semana['por_origem'].get(origem, 0) + xp

    return [{**semana, 'inicio': semana['inicio'].isoformat()} for semana in semanas]


def temporadas_anteriores(usuario):
    """Histórico das temporadas passadas: [{'temporada', 'xp', 'nivel'}], da mais recente para a mais antiga."""
    linhas = (
        LancamentoXP.objects.filter(usuario=usuario)
        .exclude(temporada=temporada_atual())
        .values('temporada')
        .annotate(xp=Sum('xp'))
        .order_by('-temporada')
    )
    return [{'temporada': linha['temporada'], 'xp': linha['xp'], 'nivel': nivel_atividade(linha['xp'])} for linha in linhas]


def limites_do_mes(usuario):
    """Quanto ainda cabe no mês nas origens com limite: {origem: {'limite', 'usados', 'restantes'}}."""
    agora = timezone.now()
    resultado = {}
    for origem, regra in REGRAS.items():
        if regra.limite_mes is None:
            continue
        usados = LancamentoXP.objects.filter(
            usuario=usuario, origem=origem, criado_em__year=agora.year, criado_em__month=agora.month,
        ).count()
        resultado[origem] = {'limite': regra.limite_mes, 'usados': usados, 'restantes': max(regra.limite_mes - usados, 0)}
    return resultado


def contar_aprovacoes(usuario) -> int:
    """Desafios distintos com alguma entrega aprovada — o selo do perfil (só a contagem)."""
    return (
        Entrega.objects.filter(usuario=usuario, status=StatusEntrega.APROVADO)
        .values('etapa__projeto')
        .distinct()
        .count()
    )


def resumo_atividade(usuario):
    """Tudo o que a tela de atividade precisa, numa resposta."""
    temporada = temporada_atual()
    xp = xp_da_temporada(usuario, temporada)
    return {
        'temporada': temporada,
        'xp': xp,
        'nivel': nivel_atividade(xp),
        'proximo_nivel': proximo_nivel(xp),
        'serie_semanal': serie_semanal(usuario, temporada),
        'temporadas_anteriores': temporadas_anteriores(usuario),
        'limites_do_mes': limites_do_mes(usuario),
    }
