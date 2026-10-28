import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import ProjectWorkspace from './ProjectWorkspace';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const PROJETO = {
  id: 1,
  titulo: 'API REST',
  descricao: 'Construa uma API',
  ferramentas: 'Python, Django, Python',
  etapas: [
    { id: 10, ordem: 1, descricao: 'Modelar o banco', criterios_tecnicos: 'Migrations ok', formato_entrega: 'repositorio' },
    { id: 11, ordem: 2, descricao: 'Criar endpoints', criterios_tecnicos: 'CRUD completo', formato_entrega: 'repositorio' },
  ],
};

function mockarApi(entregas) {
  api.get.mockImplementation((url) => Promise.resolve(
    url === '/entregas/' ? { data: { results: entregas } } : { data: PROJETO },
  ));
}

beforeEach(() => {
  mockarApi([]);
  api.post.mockResolvedValue({ data: {} });
});

describe('ProjectWorkspace', () => {
  it('sem entregas, abre na primeira etapa com o formulário de envio', async () => {
    render(<ProjectWorkspace projectId={1} onBack={vi.fn()} />);

    expect(await screen.findByText('Modelar o banco')).toBeInTheDocument();
    expect(screen.getByText('Migrations ok')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://github.com/usuario/repositorio')).toBeInTheDocument();
  });

  it('ferramentas repetidas aparecem uma vez só', async () => {
    render(<ProjectWorkspace projectId={1} onBack={vi.fn()} />);

    await screen.findByText('Modelar o banco');
    expect(screen.getAllByText('Python')).toHaveLength(1);
  });

  it('com a etapa 1 aprovada, abre na etapa 2 e marca a 1 como concluída', async () => {
    mockarApi([{ id: 5, etapa: 10, status: 'aprovado' }]);
    render(<ProjectWorkspace projectId={1} onBack={vi.fn()} />);

    expect(await screen.findByText('Criar endpoints')).toBeInTheDocument();
    expect(screen.getByText('Concluída')).toBeInTheDocument();
  });

  it('etapa aprovada não mostra o formulário de envio', async () => {
    const user = userEvent.setup();
    mockarApi([{ id: 5, etapa: 10, status: 'aprovado' }]);
    render(<ProjectWorkspace projectId={1} onBack={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: /Etapa 1/ }));

    expect(screen.getByText('Etapa concluída e aprovada!')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('https://github.com/usuario/repositorio')).not.toBeInTheDocument();
  });

  it('entrega pendente mostra "Em validação" e esconde o formulário', async () => {
    mockarApi([{ id: 5, etapa: 10, status: 'pendente' }]);
    const user = userEvent.setup();
    render(<ProjectWorkspace projectId={1} onBack={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: /Etapa 1/ }));

    expect(screen.getByText('Em validação...')).toBeInTheDocument();
    expect(screen.getByText('Validação em andamento (pendente)...')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('https://github.com/usuario/repositorio')).not.toBeInTheDocument();
  });

  it('entrega reprovada mostra o feedback e permite reenviar', async () => {
    mockarApi([{ id: 5, etapa: 10, status: 'reprovado', feedback_validacao: 'Faltaram os testes' }]);
    render(<ProjectWorkspace projectId={1} onBack={vi.fn()} />);

    expect(await screen.findByText('Feedback: Faltaram os testes')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://github.com/usuario/repositorio')).toBeInTheDocument();
  });

  it('envia a entrega com a etapa ativa e o link do repositório', async () => {
    const user = userEvent.setup();
    render(<ProjectWorkspace projectId={1} onBack={vi.fn()} />);

    await user.type(await screen.findByPlaceholderText('https://github.com/usuario/repositorio'), 'https://github.com/aluno/api');
    await user.click(screen.getByRole('button', { name: 'Enviar para Validação' }));

    expect(api.post).toHaveBeenCalledWith('/entregas/', { etapa_id: 10, repo_url: 'https://github.com/aluno/api' });
    expect(await screen.findByText(/Sucesso! Sua entrega foi enviada/)).toBeInTheDocument();
  });

  it('botão de envio fica desabilitado com o link vazio', async () => {
    render(<ProjectWorkspace projectId={1} onBack={vi.fn()} />);

    expect(await screen.findByRole('button', { name: 'Enviar para Validação' })).toBeDisabled();
  });

  it('mostra o erro devolvido pela API no envio', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({ response: { data: { detail: 'Você precisa iniciar este projeto antes de enviar uma entrega.' } } });
    render(<ProjectWorkspace projectId={1} onBack={vi.fn()} />);

    await user.type(await screen.findByPlaceholderText('https://github.com/usuario/repositorio'), 'https://github.com/aluno/api');
    await user.click(screen.getByRole('button', { name: 'Enviar para Validação' }));

    expect(await screen.findByText('Você precisa iniciar este projeto antes de enviar uma entrega.')).toBeInTheDocument();
  });

  it('falha ao carregar mostra erro e o botão Voltar', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValue(new Error('offline'));
    render(<ProjectWorkspace projectId={1} onBack={onBack} />);

    expect(await screen.findByText('Erro ao carregar o projeto.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
