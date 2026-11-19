import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import { renderComRotas } from '../test/renderComRotas';
import CompanySubmissions from './CompanySubmissions';

vi.mock('../api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));

const SUBMISSAO = {
  id: 7,
  status: 'pendente',
  usuario: { id: 3, nome: 'Ana Souza', email: 'ana@teste.com' },
  etapa: { id: 11, ordem: 2, descricao: 'Criar endpoints' },
  desafio: { id: 5, titulo: 'API REST' },
  repo_url: 'https://github.com/ana/api',
  entregue_em: '2026-10-20T10:00:00Z',
  feedback_validacao: '',
};

const DESAFIOS = [{ id: 5, titulo: 'API REST' }, { id: 6, titulo: 'Landing page' }];

/** GET de submissões devolve `submissoes`; GET da lista de desafios (filtro) devolve DESAFIOS. */
function mockarApi(submissoes = [SUBMISSAO]) {
  api.get.mockImplementation((url) => Promise.resolve(
    url === '/empresa/projetos/' ? { data: { results: DESAFIOS } } : { data: { results: submissoes } },
  ));
}

/** Parâmetros da última busca de submissões (ignora a busca da lista de desafios). */
function ultimosParams() {
  const chamadas = api.get.mock.calls.filter(([url]) => url === '/empresa/submissoes/');
  return chamadas.at(-1)[1].params;
}

beforeEach(() => {
  mockarApi();
  api.patch.mockResolvedValue({ data: {} });
});

describe('CompanySubmissions', () => {
  it('abre filtrando as pendentes e lista o candidato', async () => {
    renderComRotas(<CompanySubmissions />);

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(ultimosParams()).toEqual({ status: 'pendente' });
    expect(screen.getByRole('link', { name: /Ver solução/ })).toHaveAttribute('href', 'https://github.com/ana/api');
    // o nome leva ao perfil acadêmico do candidato, e a linha diz o desafio e a etapa
    expect(screen.getByRole('link', { name: 'Ana Souza' })).toHaveAttribute('href', '/alunos/3');
    expect(screen.getByText('API REST · Etapa 2: Criar endpoints')).toBeInTheDocument();
  });

  it('trocar o filtro busca de novo com o status certo', async () => {
    const user = userEvent.setup();
    renderComRotas(<CompanySubmissions />);
    await screen.findByText('Ana Souza');

    await user.click(screen.getByRole('button', { name: /Aprovadas/ }));
    expect(ultimosParams()).toEqual({ status: 'aprovado' });

    await user.click(await screen.findByRole('button', { name: /Todas/ }));
    expect(ultimosParams()).toEqual({});
  });

  it('filtra por desafio e por candidato, somando ao status', async () => {
    const user = userEvent.setup();
    renderComRotas(<CompanySubmissions />);
    await screen.findByText('Ana Souza');

    // o filtro de desafio lista os desafios da empresa
    expect(await screen.findByRole('option', { name: 'Landing page' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Desafio'), '5');
    expect(ultimosParams()).toEqual({ status: 'pendente', desafio: '5' });

    await user.type(screen.getByLabelText('Candidato'), ' ana ');
    await user.click(screen.getByRole('button', { name: /Buscar/ }));
    expect(ultimosParams()).toEqual({ status: 'pendente', desafio: '5', q: 'ana' });
  });

  it('trocar filtros mantém a tela no lugar (sem voltar ao esqueleto de carregamento)', async () => {
    const user = userEvent.setup();
    renderComRotas(<CompanySubmissions />);
    await screen.findByText('Ana Souza');

    api.get.mockImplementation((url) => (url === '/empresa/submissoes/' ? new Promise(() => {}) : Promise.resolve({ data: { results: DESAFIOS } })));
    await user.click(screen.getByRole('button', { name: /Aprovadas/ }));

    expect(screen.getByLabelText('Candidato')).toBeInTheDocument(); // os filtros continuam na tela
  });

  it('reprovar com feedback envia a avaliação e recarrega a lista', async () => {
    const user = userEvent.setup();
    renderComRotas(<CompanySubmissions />);

    await user.click(await screen.findByRole('button', { name: 'Avaliar Submissão' }));
    const modal = await screen.findByRole('dialog');
    await user.click(within(modal).getByText('Reprovar'));
    await user.type(within(modal).getByRole('textbox'), 'Faltaram os testes');
    await user.click(within(modal).getByRole('button', { name: 'Confirmar Avaliação' }));

    expect(api.patch).toHaveBeenCalledWith('/empresa/submissoes/7/avaliar/', {
      status: 'reprovado',
      feedback_validacao: 'Faltaram os testes',
    });
    expect(api.get.mock.calls.filter(([url]) => url === '/empresa/submissoes/')).toHaveLength(2);
  });

  it('aprovar é a opção padrão e avisa que conta como aprovação do aluno', async () => {
    const user = userEvent.setup();
    renderComRotas(<CompanySubmissions />);

    await user.click(await screen.findByRole('button', { name: 'Avaliar Submissão' }));
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText(/contagem de aprovações/)).toBeInTheDocument();
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
    renderComRotas(<CompanySubmissions />);

    await user.click(await screen.findByRole('button', { name: 'Avaliar Submissão' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar Avaliação' }));

    expect(await screen.findByText('Esta entrega já foi aprovada e não pode ser reavaliada.')).toBeInTheDocument();
  });

  it('entrega já avaliada mostra o feedback e não tem botão de avaliar', async () => {
    mockarApi([{ ...SUBMISSAO, status: 'aprovado', feedback_validacao: 'Ótimo trabalho' }]);
    renderComRotas(<CompanySubmissions />);

    expect(await screen.findByText('Ótimo trabalho')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Avaliar Submissão' })).not.toBeInTheDocument();
  });

  it('lista vazia mostra a mensagem de nenhuma submissão', async () => {
    mockarApi([]);
    renderComRotas(<CompanySubmissions />);

    expect(await screen.findByText('Nenhuma submissão encontrada')).toBeInTheDocument();
  });
});
