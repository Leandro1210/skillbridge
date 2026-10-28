import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import CompanySubmissions from './CompanySubmissions';

vi.mock('../api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));

const SUBMISSAO = {
  id: 7,
  status: 'pendente',
  usuario: { nome: 'Ana Souza', email: 'ana@teste.com' },
  etapa: { descricao: 'Criar endpoints' },
  repo_url: 'https://github.com/ana/api',
  entregue_em: '2026-10-20T10:00:00Z',
  xp_ganho: 0,
  feedback_validacao: '',
};

beforeEach(() => {
  api.get.mockResolvedValue({ data: { results: [SUBMISSAO] } });
  api.patch.mockResolvedValue({ data: {} });
});

describe('CompanySubmissions', () => {
  it('abre filtrando as pendentes e lista o candidato', async () => {
    render(<CompanySubmissions />);

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/empresa/submissoes/?status=pendente');
    expect(screen.getByRole('link', { name: /Ver solução/ })).toHaveAttribute('href', 'https://github.com/ana/api');
  });

  it('trocar o filtro busca de novo com o status certo', async () => {
    const user = userEvent.setup();
    render(<CompanySubmissions />);
    await screen.findByText('Ana Souza');

    await user.click(screen.getByRole('button', { name: /Aprovadas/ }));
    expect(api.get).toHaveBeenLastCalledWith('/empresa/submissoes/?status=aprovado');

    await user.click(await screen.findByRole('button', { name: /Todas/ }));
    expect(api.get).toHaveBeenLastCalledWith('/empresa/submissoes/');
  });

  it('reprovar com feedback envia a avaliação e recarrega a lista', async () => {
    const user = userEvent.setup();
    render(<CompanySubmissions />);

    await user.click(await screen.findByRole('button', { name: 'Avaliar Submissão' }));
    const modal = await screen.findByRole('dialog');
    await user.click(within(modal).getByText('Reprovar'));
    await user.type(within(modal).getByRole('textbox'), 'Faltaram os testes');
    await user.click(within(modal).getByRole('button', { name: 'Confirmar Avaliação' }));

    expect(api.patch).toHaveBeenCalledWith('/empresa/submissoes/7/avaliar/', {
      status: 'reprovado',
      feedback_validacao: 'Faltaram os testes',
    });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('aprovar é a opção padrão e avisa que o aluno ganha XP', async () => {
    const user = userEvent.setup();
    render(<CompanySubmissions />);

    await user.click(await screen.findByRole('button', { name: 'Avaliar Submissão' }));
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText(/receberá pontos de XP/)).toBeInTheDocument();
    await user.click(within(modal).getByRole('button', { name: 'Confirmar Avaliação' }));

    expect(api.patch).toHaveBeenCalledWith('/empresa/submissoes/7/avaliar/', {
      status: 'aprovado',
      feedback_validacao: '',
    });
  });

  it('mostra o erro devolvido pela API ao avaliar', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.patch.mockRejectedValue({ response: { data: { detail: 'Esta entrega já foi aprovada e não pode ser reavaliada.' } } });
    render(<CompanySubmissions />);

    await user.click(await screen.findByRole('button', { name: 'Avaliar Submissão' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar Avaliação' }));

    expect(await screen.findByText('Esta entrega já foi aprovada e não pode ser reavaliada.')).toBeInTheDocument();
  });

  it('entrega já avaliada mostra o feedback e não tem botão de avaliar', async () => {
    api.get.mockResolvedValue({
      data: { results: [{ ...SUBMISSAO, status: 'aprovado', xp_ganho: 250, feedback_validacao: 'Ótimo trabalho' }] },
    });
    render(<CompanySubmissions />);

    expect(await screen.findByText('Ótimo trabalho')).toBeInTheDocument();
    expect(screen.getByText(/250 XP concedidos/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Avaliar Submissão' })).not.toBeInTheDocument();
  });

  it('lista vazia mostra a mensagem de nenhuma submissão', async () => {
    api.get.mockResolvedValue({ data: { results: [] } });
    render(<CompanySubmissions />);

    expect(await screen.findByText('Nenhuma submissão encontrada')).toBeInTheDocument();
  });
});
