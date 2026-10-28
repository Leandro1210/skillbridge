import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import CompanyDashboard from './CompanyDashboard';

vi.mock('../api', () => ({ default: { get: vi.fn() } }));

const STATS = {
  empresa: { id: 7, nome: 'TechBR', setor: 'Tecnologia' },
  total_desafios: 4,
  desafios_ativos: 3,
  total_submissoes: 9,
  submissoes_pendentes: 2,
  submissoes_aprovadas: 5,
  submissoes_reprovadas: 2,
  estudantes_unicos: 6,
};

beforeEach(() => {
  api.get.mockResolvedValue({ data: STATS });
});

describe('CompanyDashboard', () => {
  it('mostra a empresa e as estatísticas', async () => {
    render(<CompanyDashboard onNavigate={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: 'TechBR' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/empresa/dashboard/');
    expect(screen.getByText('3 ativos')).toBeInTheDocument();
    expect(screen.getByText('2 aguardando avaliação')).toBeInTheDocument();
  });

  it('ações rápidas levam às telas certas', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<CompanyDashboard onNavigate={onNavigate} />);

    await user.click(await screen.findByText('Avaliar Submissões'));
    expect(onNavigate).toHaveBeenCalledWith('company-submissoes');

    await user.click(screen.getByText('Gerenciar Desafios'));
    expect(onNavigate).toHaveBeenCalledWith('company-desafios');
  });

  it('ação desabilitada ("Em breve") não navega', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<CompanyDashboard onNavigate={onNavigate} />);

    await user.click(await screen.findByText('Ver Resultados'));

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('mostra erro se as estatísticas não carregarem', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValue(new Error('offline'));
    render(<CompanyDashboard onNavigate={vi.fn()} />);

    expect(await screen.findByText('Erro ao carregar dashboard')).toBeInTheDocument();
  });
});
