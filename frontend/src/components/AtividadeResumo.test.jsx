import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import AtividadeResumo from './AtividadeResumo';

vi.mock('../api', () => ({ default: { get: vi.fn() } }));

const RESUMO = {
  temporada: '2026.2',
  xp: 355,
  nivel: 'Ativo',
  proximo_nivel: { nome: 'Muito ativo', xp_faltante: 145 },
  serie_semanal: [
    { inicio: '2026-06-29', total: 15, por_origem: { acesso_diario: 15 } },
    { inicio: '2026-07-06', total: 340, por_origem: { acesso_diario: 20, participacao_desafio: 300, avaliacao_recebida: 20 } },
  ],
  temporadas_anteriores: [{ temporada: '2026.1', xp: 620, nivel: 'Muito ativo' }],
  limites_do_mes: {
    projeto_academico: { limite: 4, usados: 1, restantes: 3 },
    publicacao: { limite: 2, usados: 0, restantes: 2 },
  },
};

beforeEach(() => {
  api.get.mockResolvedValue({ data: RESUMO });
});

describe('AtividadeResumo', () => {
  it('mostra o XP da temporada, o nível de atividade e o quanto falta', async () => {
    render(<AtividadeResumo />);

    expect(await screen.findByRole('heading', { name: 'Sua atividade' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/perfil/atividade/');
    expect(screen.getByText('2º semestre de 2026')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Faltam 145 XP para "Muito ativo"')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progresso até Muito ativo' })).toHaveAttribute('aria-valuenow', '71');
    expect(screen.getByRole('img', { name: /XP por semana/ })).toBeInTheDocument();
  });

  it('detalhes: de onde veio o XP, limites do mês e temporadas anteriores', async () => {
    const user = userEvent.setup();
    render(<AtividadeResumo />);

    await user.click(await screen.findByText('Detalhes da atividade'));

    const origens = screen.getByText('De onde veio seu XP').nextElementSibling;
    const itens = within(origens).getAllByRole('listitem').map((li) => li.textContent);
    expect(itens).toEqual(['Participação em desafios300 XP', 'Acessos35 XP', 'Avaliações recebidas20 XP']);
    expect(screen.getByText(/Projetos acadêmicos:/).textContent).toBe('Projetos acadêmicos: 1 de 4 com XP');
    expect(screen.getByText(/1º semestre de 2026/).textContent).toBe('1º semestre de 2026: 620 XP · Muito ativo');
    expect(screen.getByText(/não libera nem bloqueia desafios/)).toBeInTheDocument();
  });

  it('no nível máximo não mostra "faltam"', async () => {
    api.get.mockResolvedValue({ data: { ...RESUMO, xp: 1200, nivel: 'Destaque', proximo_nivel: null } });
    render(<AtividadeResumo />);

    expect(await screen.findByText('Você está no nível máximo de atividade nesta temporada.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('temporada sem atividade avisa nos detalhes', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({
      data: { ...RESUMO, xp: 0, serie_semanal: [{ inicio: '2026-07-06', total: 0, por_origem: {} }], temporadas_anteriores: [] },
    });
    render(<AtividadeResumo />);

    await user.click(await screen.findByText('Detalhes da atividade'));

    expect(screen.getByText('Nenhuma atividade nesta temporada ainda.')).toBeInTheDocument();
    expect(screen.queryByText('Temporadas anteriores')).not.toBeInTheDocument();
  });

  it('recarrega quando o App avisa que o acesso do dia rendeu XP', async () => {
    render(<AtividadeResumo />);
    await screen.findByRole('heading', { name: 'Sua atividade' });

    api.get.mockResolvedValue({ data: { ...RESUMO, xp: 360 } });
    await act(async () => {
      window.dispatchEvent(new Event('skillbridge:atividade'));
    });

    expect(await screen.findByText('360')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('se falhar, some sem quebrar a página (a atividade é complementar)', async () => {
    api.get.mockRejectedValue(new Error('offline'));
    const { container } = render(<AtividadeResumo />);

    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
