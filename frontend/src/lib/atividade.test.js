import { describe, expect, it } from 'vitest';
import { ORIGENS_XP, intervaloDaSemana, nomeTemporada, totalPorOrigem } from './atividade';

describe('vocabulário do XP de atividade', () => {
  it('tem rótulo para cada origem do backend (core.models.OrigemXP)', () => {
    expect(Object.keys(ORIGENS_XP).sort()).toEqual([
      'acesso_diario', 'avaliacao_recebida', 'participacao_desafio',
      'perfil_semestre', 'projeto_academico', 'publicacao',
    ]);
  });

  it('nomeTemporada', () => {
    expect(nomeTemporada('2026.2')).toBe('2º semestre de 2026');
    expect(nomeTemporada('2027.1')).toBe('1º semestre de 2027');
  });

  it('intervaloDaSemana vai de segunda a domingo, atravessando o mês', () => {
    expect(intervaloDaSemana('2026-06-29')).toBe('29/06 – 05/07');
  });

  it('totalPorOrigem soma a temporada e ordena do maior para o menor', () => {
    const serie = [
      { inicio: '2026-07-06', total: 25, por_origem: { acesso_diario: 5, avaliacao_recebida: 20 } },
      { inicio: '2026-07-13', total: 70, por_origem: { acesso_diario: 10, participacao_desafio: 60 } },
    ];

    expect(totalPorOrigem(serie)).toEqual([
      { origem: 'participacao_desafio', rotulo: 'Participação em desafios', xp: 60 },
      { origem: 'avaliacao_recebida', rotulo: 'Avaliações recebidas', xp: 20 },
      { origem: 'acesso_diario', rotulo: 'Acessos', xp: 15 },
    ]);
  });
});
