import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import ProjectCatalog from './ProjectCatalog';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const PROJETOS = [
  { id: 1, titulo: 'API REST', descricao: 'Construa uma API', ferramentas: 'Python, Django', dificuldade: 'facil', nivel_minimo: 0 },
  { id: 2, titulo: 'Microsserviços', descricao: 'Docker e filas', ferramentas: 'Docker', dificuldade: 'dificil', nivel_minimo: 5 },
];

beforeEach(() => {
  api.get.mockImplementation((url) => Promise.resolve(
    url === '/projetos/' ? { data: { results: PROJETOS } } : { data: { nivel: 1 } },
  ));
  api.post.mockResolvedValue({ data: {} });
});

describe('ProjectCatalog', () => {
  it('lista os projetos com dificuldade e nível mínimo', async () => {
    render(<ProjectCatalog />);

    expect(await screen.findByText('API REST')).toBeInTheDocument();
    expect(screen.getByText('Microsserviços')).toBeInTheDocument();
    expect(screen.getByText('Fácil')).toBeInTheDocument();
    expect(screen.getByText('Difícil')).toBeInTheDocument();
    expect(screen.getByText('Nível 5+')).toBeInTheDocument();
  });

  it('projeto acima do nível do aluno não abre ao clicar', async () => {
    const user = userEvent.setup();
    render(<ProjectCatalog />);

    await user.click(await screen.findByText('Microsserviços'));

    expect(screen.queryByText('Aceitar Desafio')).not.toBeInTheDocument();
  });

  it('aceitar um desafio chama a API, fecha o modal e avisa o pai', async () => {
    const user = userEvent.setup();
    const onProjectStarted = vi.fn();
    render(<ProjectCatalog onProjectStarted={onProjectStarted} />);

    await user.click(await screen.findByText('API REST'));
    expect(await screen.findByText('Construa uma API')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Aceitar Desafio/ }));

    expect(api.post).toHaveBeenCalledWith('/projetos/1/iniciar/');
    await waitFor(() => expect(onProjectStarted).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Construa uma API')).not.toBeInTheDocument();
  });

  it('mostra o motivo quando a API recusa a inscrição', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({ response: { data: { detail: 'Seu nivel atual (1) e insuficiente.' } } });
    render(<ProjectCatalog />);

    await user.click(await screen.findByText('API REST'));
    await user.click(await screen.findByRole('button', { name: /Aceitar Desafio/ }));

    expect(await screen.findByText('Seu nivel atual (1) e insuficiente.')).toBeInTheDocument();
  });

  it('"Cancelar" fecha o modal sem inscrever', async () => {
    const user = userEvent.setup();
    render(<ProjectCatalog />);

    await user.click(await screen.findByText('API REST'));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('Construa uma API')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('mostra erro se o catálogo não carregar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValue(new Error('offline'));
    render(<ProjectCatalog />);

    expect(await screen.findByText('Não foi possível carregar o catálogo.')).toBeInTheDocument();
  });
});
