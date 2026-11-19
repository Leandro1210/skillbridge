import { describe, expect, it } from 'vitest';
import { dataCurta, publicadoHa, textoPrazo } from './datas';

const HOJE = new Date(2026, 10, 12, 15, 30); // 12/11/2026, 15h30 (hora local)

describe('publicadoHa', () => {
  it.each([
    ['2026-11-12T09:00:00', 'hoje'],
    ['2026-11-11T23:00:00', 'ontem'],
    ['2026-11-07T10:00:00', 'há 5 dias'],
    ['2026-09-12T10:00:00', 'há 2 meses'],
  ])('%s → %s', (data, esperado) => {
    expect(publicadoHa(data, HOJE)).toBe(esperado);
  });

  it('sem data, devolve vazio', () => {
    expect(publicadoHa(null, HOJE)).toBe('');
  });
});

describe('textoPrazo', () => {
  it.each([
    ['2026-11-12', 'Encerra hoje'],
    ['2026-11-13', 'Encerra amanhã'],
    ['2026-11-20', 'Encerra em 8 dias'],
    ['2026-11-11', 'Prazo encerrado'],
  ])('%s → %s', (prazo, esperado) => {
    expect(textoPrazo(prazo, HOJE)).toBe(esperado);
  });

  it('desafio sem prazo não mostra nada', () => {
    expect(textoPrazo(null, HOJE)).toBe('');
  });
});

describe('dataCurta', () => {
  it('formata no padrão brasileiro sem deslocar o dia pelo fuso', () => {
    expect(dataCurta('2026-12-31')).toBe('31/12/2026');
    expect(dataCurta('')).toBe('');
  });
});
