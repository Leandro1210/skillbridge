import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import ProjectWorkspace from './ProjectWorkspace';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const UMA_ETAPA = [
  { id: 10, ordem: 1, descricao: 'Entrega da solução', criterios_tecnicos: 'CRUD completo; testes; README', formato_entrega: 'repositorio' },
];
const DUAS_ETAPAS = [
  { id: 10, ordem: 1, descricao: 'Modelar o banco', criterios_tecnicos: 'Migrations ok', formato_entrega: 'repositorio' },
  { id: 11, ordem: 2, descricao: 'Criar endpoints', criterios_tecnicos: 'CRUD completo', formato_entrega: 'repositorio' },
];

function mockarApi({ etapas = UMA_ETAPA, entregas = [] } = {}) {
  api.get.mockImplementation((url) => Promise.resolve(
    url === '/entregas/' ? { data: { results: entregas } } : { data: { id: 1, etapas } },
  ));
}

function entrega(campos) {
  return { id: 1, etapa: 10, status: 'pendente', repo_url: 'https://github.com/a/v1', feedback_validacao: '', entregue_em: '2026-11-01T10:00:00Z', ...campos };
}

function passos() {
  const lista = screen.getByRole('list', { name: 'Acompanhamento da participação' });
  return within(lista).getAllByRole('listitem');
}

beforeEach(() => {
  mockarApi();
  api.post.mockResolvedValue({ data: {} });
});

describe('ProjectWorkspace: acompanhamento', () => {
  it('sem envio: passo 2 é o atual, mostra o que entregar e o formulário', async () => {
    render(<ProjectWorkspace projectId={1} />);

    expect(await screen.findByRole('heading', { name: 'Sua participação' })).toBeInTheDocument();
    expect(passos().map((p) => p.textContent)).toEqual(['Participando', '2Solução enviada', '3Avaliação da empresa']);
    expect(passos()[1]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('status')).toHaveTextContent('Envie sua solução');
    expect(screen.getByText('CRUD completo; testes; README')).toBeInTheDocument();
    expect(screen.getByText('Link do repositório', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar solução/ })).toBeDisabled(); // link vazio
  });

  it('com uma etapa só, não há abas de etapa', async () => {
    render(<ProjectWorkspace projectId={1} />);

    await screen.findByRole('heading', { name: 'Sua participação' });
    expect(screen.queryByRole('group', { name: 'Etapas do desafio' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'O que entregar' })).toBeInTheDocument();
  });

  it('enviada: aguardando avaliação, sem formulário, com o envio no histórico', async () => {
    mockarApi({ entregas: [entrega({ status: 'pendente' })] });
    render(<ProjectWorkspace projectId={1} />);

    expect(await screen.findByRole('status')).toHaveTextContent('aguardando a avaliação da empresa');
    expect(passos()[2]).toHaveTextContent('Em avaliação');
    expect(passos()[2]).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByRole('button', { name: /Enviar/ })).not.toBeInTheDocument();
    const historico = screen.getByRole('heading', { name: 'Seus envios' }).nextElementSibling;
    expect(within(historico).getByText('Em avaliação')).toBeInTheDocument();
    expect(within(historico).getByRole('link', { name: 'https://github.com/a/v1' })).toBeInTheDocument();
  });

  it('ajustes pedidos: mostra o retorno da empresa e permite enviar nova versão', async () => {
    mockarApi({ entregas: [entrega({ status: 'reprovado', feedback_validacao: 'Faltaram os testes' })] });
    render(<ProjectWorkspace projectId={1} />);

    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent('A empresa pediu ajustes');
    expect(banner).toHaveTextContent('Faltaram os testes');
    expect(passos()[2]).toHaveTextContent('Ajustes pedidos');
    expect(screen.getByRole('heading', { name: 'Enviar nova versão' })).toBeInTheDocument();
  });

  it('aprovada: todos os passos feitos e sem formulário', async () => {
    mockarApi({ entregas: [entrega({ status: 'aprovado', feedback_validacao: 'Ótimo trabalho' })] });
    render(<ProjectWorkspace projectId={1} />);

    expect(await screen.findByRole('status')).toHaveTextContent('Solução aprovada!');
    expect(screen.getByRole('status')).toHaveTextContent('Ótimo trabalho');
    expect(passos()[2]).toHaveTextContent('Aprovada');
    expect(passos().some((p) => p.hasAttribute('aria-current'))).toBe(false);
    expect(screen.queryByRole('button', { name: /Enviar/ })).not.toBeInTheDocument();
  });

  it('o histórico lista os envios do mais recente para o mais antigo', async () => {
    mockarApi({
      entregas: [
        entrega({ id: 1, status: 'reprovado', repo_url: 'https://github.com/a/v1', entregue_em: '2026-11-01T10:00:00Z' }),
        entrega({ id: 2, status: 'pendente', repo_url: 'https://github.com/a/v2', entregue_em: '2026-11-05T10:00:00Z' }),
      ],
    });
    render(<ProjectWorkspace projectId={1} />);

    const historico = (await screen.findByRole('heading', { name: 'Seus envios' })).nextElementSibling;
    expect(within(historico).getAllByRole('link').map((a) => a.textContent)).toEqual(['https://github.com/a/v2', 'https://github.com/a/v1']);
  });
});

describe('ProjectWorkspace: envio', () => {
  it('envia o link e recarrega a participação', async () => {
    const user = userEvent.setup();
    render(<ProjectWorkspace projectId={1} />);

    await user.type(await screen.findByPlaceholderText('https://github.com/usuario/repositorio'), 'https://github.com/aluno/api');
    mockarApi({ entregas: [entrega({ status: 'pendente' })] });
    await user.click(screen.getByRole('button', { name: /Enviar solução/ }));

    expect(api.post).toHaveBeenCalledWith('/entregas/', { etapa_id: 10, repo_url: 'https://github.com/aluno/api' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Solução enviada!');
    expect(await screen.findByText(/aguardando a avaliação da empresa/)).toBeInTheDocument();
  });

  it('mostra o erro devolvido pela API', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({ response: { data: { detail: 'Este desafio não está recebendo entregas.' } } });
    render(<ProjectWorkspace projectId={1} />);

    await user.type(await screen.findByPlaceholderText('https://github.com/usuario/repositorio'), 'https://github.com/aluno/api');
    await user.click(screen.getByRole('button', { name: /Enviar solução/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Este desafio não está recebendo entregas.');
  });

  it('falha ao carregar mostra erro', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValue(new Error('offline'));
    render(<ProjectWorkspace projectId={1} />);

    expect(await screen.findByText('Não foi possível carregar sua participação.')).toBeInTheDocument();
  });
});

describe('ProjectWorkspace: várias etapas', () => {
  it('abre na primeira etapa que pede ação e marca o estado de cada aba', async () => {
    mockarApi({ etapas: DUAS_ETAPAS, entregas: [entrega({ etapa: 10, status: 'aprovado' })] });
    render(<ProjectWorkspace projectId={1} />);

    const abas = await screen.findByRole('group', { name: 'Etapas do desafio' });
    expect(within(abas).getByRole('button', { name: /Etapa 2/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Etapa 2: Criar endpoints' })).toBeInTheDocument();
  });

  it('trocar de aba mostra a outra etapa', async () => {
    const user = userEvent.setup();
    mockarApi({ etapas: DUAS_ETAPAS, entregas: [entrega({ etapa: 10, status: 'aprovado' })] });
    render(<ProjectWorkspace projectId={1} />);

    await user.click(await screen.findByRole('button', { name: /Etapa 1/ }));

    expect(screen.getByRole('heading', { name: 'Etapa 1: Modelar o banco' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Solução aprovada!');
  });

  it('com tudo enviado, abre na última etapa', async () => {
    mockarApi({
      etapas: DUAS_ETAPAS,
      entregas: [entrega({ id: 1, etapa: 10, status: 'aprovado' }), entrega({ id: 2, etapa: 11, status: 'pendente' })],
    });
    render(<ProjectWorkspace projectId={1} />);

    expect(await screen.findByRole('heading', { name: 'Etapa 2: Criar endpoints' })).toBeInTheDocument();
  });
});
