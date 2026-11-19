import { describe, expect, it } from 'vitest';
import { idDaRota } from './rotas';

describe('idDaRota', () => {
  it('aceita inteiros positivos, em texto ou número', () => {
    expect(idDaRota('7')).toBe(7);
    expect(idDaRota('123')).toBe(123);
    expect(idDaRota(42)).toBe(42);
  });

  it('recusa caminhos e qualquer coisa que não seja um id', () => {
    for (const valor of ['..', '..%2Fempresa', '../empresa/submissoes', '7/../8', '7a', ' 7', '-1', '1.5', '0', '', undefined, null, 0, -3, 2.5, '99999999999999999999']) {
      expect(idDaRota(valor)).toBeNull();
    }
  });
});
