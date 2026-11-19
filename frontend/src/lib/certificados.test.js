import { describe, expect, it } from 'vitest';
import { lerCertificado, listaDeCertificados } from './certificados';

describe('lerCertificado', () => {
  it('separa título, instituição, ano e carga horária', () => {
    expect(lerCertificado('AWS Cloud Practitioner, Amazon Web Services, 2026, 40h')).toEqual({
      titulo: 'AWS Cloud Practitioner', detalhes: 'Amazon Web Services', ano: '2026', horas: '40',
    });
  });

  it('aceita outros separadores e "horas" por extenso, em qualquer ordem', () => {
    expect(lerCertificado('Python Avançado | 60 horas | Senai | 2025')).toEqual({
      titulo: 'Python Avançado', detalhes: 'Senai', ano: '2025', horas: '60',
    });
    expect(lerCertificado('Scrum Foundation - Escola Ágil; Turma B')).toEqual({
      titulo: 'Scrum Foundation', detalhes: 'Escola Ágil · Turma B', ano: '', horas: '',
    });
  });

  it('ignora marcadores no início da linha', () => {
    expect(lerCertificado('• Git e GitHub, Alura').titulo).toBe('Git e GitHub');
    expect(lerCertificado('1. Docker, Alura').titulo).toBe('Docker');
  });

  it('só o nome do curso também funciona', () => {
    expect(lerCertificado('Inglês avançado')).toEqual({ titulo: 'Inglês avançado', detalhes: '', ano: '', horas: '' });
  });

  it('hífen dentro do nome não separa (só " - " com espaços)', () => {
    expect(lerCertificado('Front-end com React, Rocketseat').titulo).toBe('Front-end com React');
  });
});

describe('listaDeCertificados', () => {
  it('uma linha por certificado, sem linhas vazias ou só com marcador', () => {
    const lista = listaDeCertificados('AWS, Amazon\n\n  \n- \nScrum, Escola Ágil\r\n');
    expect(lista.map((c) => c.titulo)).toEqual(['AWS', 'Scrum']);
  });

  it('texto vazio ou ausente vira lista vazia', () => {
    expect(listaDeCertificados('')).toEqual([]);
    expect(listaDeCertificados(undefined)).toEqual([]);
  });
});
