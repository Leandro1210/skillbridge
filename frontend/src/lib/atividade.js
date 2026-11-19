/**
 * Vocabulário do XP de atividade — espelha core.models.OrigemXP e as regras
 * de core/xp.py no backend. O XP mede comprometimento no semestre, não
 * competência, e não libera nem bloqueia nada.
 */

export const ORIGENS_XP = {
  acesso_diario: 'Acessos',
  perfil_semestre: 'Perfil do semestre',
  projeto_academico: 'Projetos acadêmicos',
  publicacao: 'Publicações',
  participacao_desafio: 'Participação em desafios',
  avaliacao_recebida: 'Avaliações recebidas',
};

/** "2026.2" → "2º semestre de 2026" */
export function nomeTemporada(temporada) {
  const [ano, semestre] = temporada.split('.');
  return `${semestre}º semestre de ${ano}`;
}

/** Soma o XP de cada origem ao longo da série semanal, do maior para o menor. */
export function totalPorOrigem(serie) {
  const totais = {};
  for (const semana of serie) {
    for (const [origem, xp] of Object.entries(semana.por_origem)) {
      totais[origem] = (totais[origem] ?? 0) + xp;
    }
  }
  return Object.entries(totais)
    .map(([origem, xp]) => ({ origem, rotulo: ORIGENS_XP[origem] ?? origem, xp }))
    .sort((a, b) => b.xp - a.xp);
}

/** "29/06 – 05/07" para a semana que começa na segunda-feira informada ("YYYY-MM-DD"). */
export function intervaloDaSemana(inicioIso) {
  const [ano, mes, dia] = inicioIso.split('-').map(Number);
  const inicio = new Date(ano, mes - 1, dia);
  const fim = new Date(ano, mes - 1, dia + 6);
  const curta = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${curta(inicio)} a ${curta(fim)}`;
}

/** Evento que o App dispara quando o acesso do dia rende XP — a tela de atividade recarrega. */
export const EVENTO_ATIVIDADE = 'skillbridge:atividade';
