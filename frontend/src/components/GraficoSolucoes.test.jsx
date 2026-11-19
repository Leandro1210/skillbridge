import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import GraficoSolucoes from './GraficoSolucoes';

const SERIE = [
  { inicio: '2026-10-26', total: 0 },
  { inicio: '2026-11-02', total: 3 },
  { inicio: '2026-11-09', total: 1 },
  { inicio: '2026-11-16', total: 2 },
];

describe('GraficoSolucoes', () => {
  it('descreve o gráfico e cada semana para leitores de tela', () => {
    render(<GraficoSolucoes serie={SERIE} />);

    expect(screen.getByRole('img', { name: 'Soluções recebidas por semana: 4 semanas, 6 soluções no total' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Semana 02\/11 a 08\/11: 3 soluções/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Semana 09\/11 a 15\/11: 1 solução$/ })).toBeInTheDocument();
  });

  it('eixo de contagem sem meio-valor e rótulos de mês', () => {
    const { container } = render(<GraficoSolucoes serie={SERIE} />);

    const textos = [...container.querySelectorAll('svg text')].map((t) => t.textContent);
    expect(textos).toEqual(expect.arrayContaining(['0', '2', '4', 'out', 'nov']));
    expect(textos).toContain('2'); // rótulo direto da semana atual
  });

  it('tooltip aparece no hover e no foco do teclado', async () => {
    const user = userEvent.setup();
    render(<GraficoSolucoes serie={SERIE} />);

    fireEvent.pointerEnter(screen.getByRole('img', { name: /Semana 02\/11/ }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('3 soluções02/11 a 08/11');
    fireEvent.pointerLeave(screen.getByRole('img', { name: /Semana 02\/11/ }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.tab();
    expect(screen.getByRole('tooltip')).toHaveTextContent('0 soluções');
  });

  it('visão em tabela com os mesmos valores', async () => {
    const user = userEvent.setup();
    render(<GraficoSolucoes serie={SERIE} />);

    await user.click(screen.getByRole('button', { name: 'Ver como tabela' }));

    const linhas = screen.getAllByRole('row').slice(1).map((tr) => tr.textContent);
    expect(linhas).toEqual(['26/10 a 01/110', '02/11 a 08/113', '09/11 a 15/111', '16/11 a 22/112']);
  });

  it('sem soluções, avisa no lugar das colunas', () => {
    render(<GraficoSolucoes serie={SERIE.map((s) => ({ ...s, total: 0 }))} />);

    expect(screen.getByText('Nenhuma solução recebida nas últimas 4 semanas.')).toBeInTheDocument();
  });

  it('série vazia não desenha nada', () => {
    const { container } = render(<GraficoSolucoes serie={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
