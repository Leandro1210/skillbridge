import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import Dashboard from './Dashboard';

vi.mock('../api', () => ({ default: { get: vi.fn() } }));

const ALUNO = { nome: 'ana souza', nivel: 2, xp_total: 1250, taxa_sucesso: 75, perfil: { titulo: 'Dev Backend' } };
const INSCRICOES = [
  { id: 1, projeto: 10, projeto_titulo: 'API REST', projeto_descricao: '...', projeto_dificuldade: 'medio', status: 'em_andamento', iniciado_em: '2026-10-01T00:00:00Z' },
  { id: 2, projeto: 11, projeto_titulo: 'Landing page', projeto_descricao: '...', projeto_dificuldade: 'facil', status: 'concluido', iniciado_em: '2026-09-01T00:00:00Z' },
];

function mockarApi(usuario = ALUNO, inscricoes = INSCRICOES) {
  api.get.mockImplementation((url) => Promise.resolve(
    url === '/inscricoes/' ? { data: { results: inscricoes } } : { data: usuario },
  ));
}

beforeEach(() => {
  mockarApi();
});

describe('Dashboard do aluno', () => {
  it('mostra nome, título, nível e XP', async () => {
    render(<Dashboard />);

    expect(await screen.findByRole('heading', { name: 'ana souza' })).toBeInTheDocument();
    expect(screen.getByText('Dev Backend')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument(); // inicial do avatar, maiúscula
    expect(screen.getByText('1250 XP')).toBeInTheDocument();
  });

  it('calcula o progresso dentro do nível (a cada 1000 XP)', async () => {
    render(<Dashboard />);

    expect(await screen.findByText('Progresso para Nível 3')).toBeInTheDocument();
    expect(screen.getByText('250 / 1000 XP')).toBeInTheDocument();
    expect(screen.getByText('750 XP')).toBeInTheDocument(); // "Faltam 750 XP"
  });

  it('conta desafios em andamento e concluídos', async () => {
    render(<Dashboard />);

    const andamento = await screen.findByText('Em andamento', { selector: 'p' });
    expect(andamento.previousSibling).toHaveTextContent('1');
    expect(screen.getByText('Concluídos', { selector: 'p' }).previousSibling).toHaveTextContent('1');
  });

  it.each([
    [75, 'bg-success-container'],
    [70, 'bg-success-container'],
    [50, 'bg-warning-container'],
    [40, 'bg-warning-container'],
    [10, 'bg-surface-container-high'],
  ])('taxa de sucesso de %i%% usa o tom certo', async (taxa, classe) => {
    mockarApi({ ...ALUNO, taxa_sucesso: taxa });
    render(<Dashboard />);

    expect(await screen.findByText(`${taxa}% sucesso`)).toHaveClass(classe);
  });

  it('"Continuar" abre o projeto da inscrição', async () => {
    const user = userEvent.setup();
    const onContinueProject = vi.fn();
    render(<Dashboard onContinueProject={onContinueProject} />);

    const [primeiro] = await screen.findAllByRole('button', { name: 'Continuar' });
    await user.click(primeiro);

    expect(onContinueProject).toHaveBeenCalledWith(10);
  });

  it('sem inscrições, convida a explorar o catálogo', async () => {
    mockarApi(ALUNO, []);
    render(<Dashboard />);

    expect(await screen.findByText('Você ainda não iniciou nenhum desafio de empresa.')).toBeInTheDocument();
  });

  it('se a API falhar, não quebra a tela', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValue(new Error('offline'));
    const { container } = render(<Dashboard />);

    await vi.waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
