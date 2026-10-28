import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import CompanyChallenges from './CompanyChallenges';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const ATIVO = {
  id: 1, titulo: 'API REST', descricao: 'Construa uma API', ferramentas: 'Python, Django, Python',
  dificuldade: 'medio', nivel_minimo: 1, ativo: true,
};
const RASCUNHO = {
  id: 2, titulo: 'Landing page', descricao: 'HTML e CSS', ferramentas: 'HTML',
  dificuldade: 'facil', nivel_minimo: 0, ativo: false,
};

beforeEach(() => {
  api.get.mockResolvedValue({ data: { results: [ATIVO, RASCUNHO] } });
  api.post.mockResolvedValue({ data: {} });
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({});
});

describe('CompanyChallenges', () => {
  it('lista os desafios com status e ferramentas sem repetição', async () => {
    render(<CompanyChallenges />);

    expect(await screen.findByText('API REST')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
    expect(screen.getAllByText('Python')).toHaveLength(1);
  });

  it('cria um desafio pelo botão flutuante', async () => {
    const user = userEvent.setup();
    render(<CompanyChallenges />);
    await screen.findByText('API REST');

    await user.click(screen.getByRole('button', { name: /Novo Desafio/ }));
    await user.type(screen.getByPlaceholderText('Ex: API de E-commerce com Node.js'), 'Desafio novo');
    await user.type(screen.getByPlaceholderText(/Descreva o que o candidato deve construir/), 'Descrição');
    await user.click(screen.getByRole('button', { name: 'Criar Desafio' }));

    expect(api.post).toHaveBeenCalledWith('/empresa/projetos/', expect.objectContaining({
      titulo: 'Desafio novo',
      descricao: 'Descrição',
      dificuldade: 'medio',
    }));
    expect(api.get).toHaveBeenCalledTimes(2); // recarregou a lista
  });

  it('edita um desafio existente com o formulário preenchido', async () => {
    const user = userEvent.setup();
    render(<CompanyChallenges />);

    const [editarPrimeiro] = await screen.findAllByRole('button', { name: 'Editar' });
    await user.click(editarPrimeiro);
    const titulo = screen.getByPlaceholderText('Ex: API de E-commerce com Node.js');
    expect(titulo).toHaveValue('API REST');

    await user.clear(titulo);
    await user.type(titulo, 'API REST v2');
    await user.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    expect(api.patch).toHaveBeenCalledWith('/empresa/projetos/1/', expect.objectContaining({ titulo: 'API REST v2' }));
  });

  it('"Cancelar" fecha o formulário sem salvar', async () => {
    const user = userEvent.setup();
    render(<CompanyChallenges />);
    await screen.findByText('API REST');

    await user.click(screen.getByRole('button', { name: /Novo Desafio/ }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('button', { name: 'Criar Desafio' })).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('publica o rascunho e desativa o ativo', async () => {
    const user = userEvent.setup();
    render(<CompanyChallenges />);

    await user.click(await screen.findByRole('button', { name: 'Publicar' }));
    expect(api.post).toHaveBeenCalledWith('/empresa/projetos/2/publicar/');

    await user.click(await screen.findByRole('button', { name: 'Desativar' }));
    expect(api.post).toHaveBeenCalledWith('/empresa/projetos/1/desativar/');
  });

  it('excluir pede confirmação e só apaga se confirmado', async () => {
    const user = userEvent.setup();
    const confirmar = vi.spyOn(window, 'confirm');
    render(<CompanyChallenges />);
    const [excluirPrimeiro] = await screen.findAllByRole('button', { name: 'Excluir' });

    confirmar.mockReturnValueOnce(false);
    await user.click(excluirPrimeiro);
    expect(api.delete).not.toHaveBeenCalled();

    confirmar.mockReturnValueOnce(true);
    await user.click(excluirPrimeiro);
    expect(api.delete).toHaveBeenCalledWith('/empresa/projetos/1/');
  });

  it('mostra o erro devolvido pela API ao salvar', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.post.mockRejectedValue({ response: { data: { detail: 'Você não está associado a uma empresa.' } } });
    render(<CompanyChallenges />);
    await screen.findByText('API REST');

    await user.click(screen.getByRole('button', { name: /Novo Desafio/ }));
    await user.type(screen.getByPlaceholderText('Ex: API de E-commerce com Node.js'), 'X');
    await user.type(screen.getByPlaceholderText(/Descreva o que o candidato deve construir/), 'Y');
    await user.click(screen.getByRole('button', { name: 'Criar Desafio' }));

    expect(await screen.findByText('Você não está associado a uma empresa.')).toBeInTheDocument();
  });

  it('sem desafios, convida a criar o primeiro', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: { results: [] } });
    render(<CompanyChallenges />);

    await user.click(await screen.findByRole('button', { name: 'Criar Primeiro Desafio' }));

    expect(screen.getByText('Criar Novo Desafio')).toBeInTheDocument();
  });
});
