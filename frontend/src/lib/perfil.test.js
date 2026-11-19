import { describe, expect, it } from 'vitest';
import { TIPOS_PUBLICACAO, listaDeTecnologias } from './perfil';

describe('perfil', () => {
  it('tipos de publicação espelham core.models.TipoPublicacao', () => {
    expect(Object.keys(TIPOS_PUBLICACAO)).toEqual(['artigo', 'resumo', 'tcc', 'iniciacao_cientifica', 'outro']);
  });

  it('listaDeTecnologias tira vazios e repetidos', () => {
    expect(listaDeTecnologias('React, , Python, React ')).toEqual(['React', 'Python']);
    expect(listaDeTecnologias(null)).toEqual([]);
  });
});
