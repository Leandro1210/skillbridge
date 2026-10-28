import { describe, expect, it } from 'vitest';
import { DIFF_LABELS, DIFFICULTY_TONE } from './difficulty';

describe('vocabulário de dificuldade', () => {
  // As chaves precisam ser as mesmas de core.models.Dificuldade no backend
  const CHAVES_DO_BACKEND = ['facil', 'medio', 'dificil'];

  it('tem rótulo e tom para cada dificuldade do backend', () => {
    expect(Object.keys(DIFF_LABELS)).toEqual(CHAVES_DO_BACKEND);
    expect(Object.keys(DIFFICULTY_TONE)).toEqual(CHAVES_DO_BACKEND);
  });

  it('usa rótulos acentuados e tons do mais fácil ao mais difícil', () => {
    expect(DIFF_LABELS).toEqual({ facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' });
    expect(DIFFICULTY_TONE).toEqual({ facil: 'success', medio: 'warning', dificil: 'error' });
  });
});
