import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import { renderComRotas } from '../test/renderComRotas';
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
    renderComRotas(<CompanyDashboard />);

    expect(await screen.findByRole('heading', { name: 'TechBR' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/empresa/dashboard/');
    expect(screen.getByText('3 ativos')).toBeInTheDocument();
    expect(screen.getByText('2 aguardando avaliação')).toBeInTheDocument();
  });

  it('ações rápidas são links para as telas certas (acessíveis pelo teclado)', async () => {
    renderComRotas(<CompanyDashboard />);

    expect(await screen.findByRole('link', { name: /Avaliar Submissões/ })).toHaveAttribute('href', '/empresa/submissoes');
    expect(screen.getByRole('link', { name: /Gerenciar Desafios/ })).toHaveAttribute('href', '/empresa/desafios');
  });

  it('ação desabilitada ("Em breve") não é um link', async () => {
    renderComRotas(<CompanyDashboard />);

    await screen.findByText('Ver Resultados');
    expect(screen.queryByRole('link', { name: /Ver Resultados/ })).not.toBeInTheDocument();
  });

  it('mostra erro se as estatísticas não carregarem', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValue(new Error('offline'));
    renderComRotas(<CompanyDashboard />);

    expect(await screen.findByText('Erro ao carregar dashboard')).toBeInTheDocument();
  });
});
