import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import GraficoAtividade from './GraficoAtividade';

const SERIE = [
  { inicio: '2026-06-29', total: 10, por_origem: { acesso_diario: 10 } },
  { inicio: '2026-07-06', total: 0, por_origem: {} },
  { inicio: '2026-07-13', total: 85, por_origem: { acesso_diario: 5, participacao_desafio: 60, avaliacao_recebida: 20 } },
  { inicio: '2026-07-20', total: 0, por_origem: {} },
];

describe('GraficoAtividade', () => {
  it('sem série, não desenha nada', () => {
    const { container } = render(<GraficoAtividade serie={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('desenha uma coluna por semana com atividade e descreve o gráfico', () => {
    const { container } = render(<GraficoAtividade serie={SERIE} />);

    expect(screen.getByRole('img', { name: 'XP por semana: 4 semanas, total de 95 XP' })).toBeInTheDocument();
    expect(container.querySelectorAll('path')).toHaveLength(2); // semanas zeradas não ganham coluna
    // escala com topo "redondo": 85 → 100
    expect(screen.getByText('100')).toBeInTheDocument();
    // rótulos de mês na primeira semana de cada mês
    expect(screen.getByText('jun')).toBeInTheDocument();
    expect(screen.getByText('jul')).toBeInTheDocument();
  });

  it('rotula direto só a última semana com atividade', () => {
    render(<GraficoAtividade serie={SERIE} />);

    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.queryByText('10', { selector: 'text[font-weight="600"]' })).not.toBeInTheDocument();
  });

  it('hover numa semana mostra o total e o detalhe por origem', () => {
    render(<GraficoAtividade serie={SERIE} />);

    fireEvent.pointerEnter(screen.getByRole('img', { name: 'Semana 13/07 a 19/07: 85 XP' }));

    const tooltip = screen.getByRole('tooltip');
    expect(within(tooltip).getByText('85 XP')).toBeInTheDocument();
    expect(within(tooltip).getByText('Participação em desafios')).toBeInTheDocument();
    expect(within(tooltip).getByText('60')).toBeInTheDocument();

    fireEvent.pointerLeave(screen.getByRole('img', { name: 'Semana 13/07 a 19/07: 85 XP' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('o mesmo detalhe aparece no foco do teclado', async () => {
    const user = userEvent.setup();
    render(<GraficoAtividade serie={SERIE} />);

    await user.tab(); // primeira semana

    expect(within(screen.getByRole('tooltip')).getByText('10 XP')).toBeInTheDocument();
  });

  it('tem uma visão em tabela com todos os valores', async () => {
    const user = userEvent.setup();
    render(<GraficoAtividade serie={SERIE} />);

    await user.click(screen.getByRole('button', { name: 'Ver como tabela' }));

    const tabela = screen.getByRole('table', { name: 'XP por semana da temporada' });
    expect(within(tabela).getAllByRole('row')).toHaveLength(5); // cabeçalho + 4 semanas
    expect(within(tabela).getByText('13/07 a 19/07')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ocultar tabela' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('temporada sem nenhum XP ainda desenha a grade (escala mínima de 10)', () => {
    render(<GraficoAtividade serie={[{ inicio: '2026-07-06', total: 0, por_origem: {} }]} />);

    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
