import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import CompanyChallenges from './CompanyChallenges';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const ATIVO = {
  id: 1, vaga_titulo: 'Estágio Back-end', vaga_modalidade: 'remoto', vaga_descricao: 'Apoio nas APIs do produto.',
  vaga_tecnologias: 'Python, SQL',
  titulo: 'API REST', descricao: 'Construa uma API', ferramentas: 'Python, Django, Python',
  dificuldade: 'intermediario', status: 'publicado', prazo: null, periodo_recomendado: 4,
  participantes: 8, submissoes: 6, aprovados: 2,
};
const RASCUNHO = {
  id: 2, vaga_titulo: 'Estágio Front-end', vaga_modalidade: '', vaga_descricao: 'Telas responsivas.', vaga_tecnologias: 'CSS',
  titulo: 'Landing page', descricao: 'HTML e CSS', ferramentas: 'HTML',
  dificuldade: 'iniciante', status: 'rascunho', prazo: null, periodo_recomendado: null,
};
// desafio antigo, de antes da separação vaga/desafio: sem vaga
const ENCERRADO = {
  id: 3, vaga_titulo: '', vaga_modalidade: '', vaga_descricao: '', vaga_tecnologias: '',
  titulo: 'App mobile', descricao: 'React Native', ferramentas: 'React Native',
  dificuldade: 'avancado', status: 'encerrado', prazo: null, periodo_recomendado: null,
};

beforeEach(() => {
  api.get.mockResolvedValue({ data: { results: [ATIVO, RASCUNHO, ENCERRADO] } });
  api.post.mockResolvedValue({ data: {} });
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({});
});

async function preencherVagaEDesafio(user) {
  await user.type(screen.getByLabelText('Título da vaga'), 'Estágio Dados');
  await user.type(screen.getByLabelText('Descrição da vaga'), 'Pipelines de dados.');
  await user.type(screen.getByLabelText('Tecnologias esperadas (separadas por vírgula)'), 'Python, SQL');
  await user.type(screen.getByLabelText('Título do Desafio'), 'Desafio novo');
  await user.type(screen.getByLabelText('Descrição Detalhada'), 'Descrição');
}

describe('CompanyChallenges', () => {
  it('lista vaga e desafio de cada processo, com status e ferramentas sem repetição', async () => {
    render(<CompanyChallenges />);

    expect(await screen.findByRole('heading', { name: 'Estágio Back-end' })).toBeInTheDocument();
    expect(screen.getByText('API REST')).toBeInTheDocument(); // "Desafio: API REST"
    expect(screen.getByText(/· Remoto/)).toBeInTheDocument();
    expect(screen.getByText('Apoio nas APIs do produto.')).toBeInTheDocument();
    // desafio antigo, sem vaga: o título do desafio ocupa o lugar
    expect(screen.getByRole('heading', { name: 'App mobile' })).toBeInTheDocument();
    expect(screen.getByText('Publicado')).toBeInTheDocument();
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
    expect(screen.getByText('Encerrado')).toBeInTheDocument();
    expect(screen.getByText('4º período+')).toBeInTheDocument();
    expect(screen.getAllByText('Python')).toHaveLength(1);
  });

  it('mostra os números de participação de cada desafio', async () => {
    render(<CompanyChallenges />);

    const cartao = (await screen.findByRole('heading', { name: 'Estágio Back-end' })).closest('div.flex.flex-col');
    expect(cartao).toHaveTextContent('8 participantes');
    expect(cartao).toHaveTextContent('6 submissões');
    expect(cartao).toHaveTextContent('2 aprovados');
  });

  it('o formulário separa "Sobre a vaga" e "O desafio"', async () => {
    const user = userEvent.setup();
    render(<CompanyChallenges />);
    await screen.findByRole('heading', { name: 'Estágio Back-end' });

    await user.click(screen.getByRole('button', { name: /Novo Desafio/ }));

    expect(screen.getByRole('group', { name: 'Sobre a vaga' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'O desafio' })).toBeInTheDocument();
    expect(screen.getByLabelText('Título da vaga')).toBeRequired();
    expect(screen.getByLabelText('Descrição da vaga')).toBeRequired();
    expect(screen.getByLabelText('Tecnologias esperadas (separadas por vírgula)')).toBeRequired();
  });

  it('cria vaga + desafio pelo botão flutuante', async () => {
    const user = userEvent.setup();
    render(<CompanyChallenges />);
    await screen.findByRole('heading', { name: 'Estágio Back-end' });

    await user.click(screen.getByRole('button', { name: /Novo Desafio/ }));
    await preencherVagaEDesafio(user);
    await user.selectOptions(screen.getByLabelText('Modalidade'), 'hibrido');
    await user.click(screen.getByRole('button', { name: 'Criar Desafio' }));

    expect(api.post).toHaveBeenCalledWith('/empresa/projetos/', {
      vaga_titulo: 'Estágio Dados',
      vaga_modalidade: 'hibrido',
      vaga_descricao: 'Pipelines de dados.',
      vaga_tecnologias: 'Python, SQL',
      titulo: 'Desafio novo',
      descricao: 'Descrição',
      ferramentas: '',
      dificuldade: 'intermediario',
      prazo: null, // opcionais vazios vão como null, não como ''
      periodo_recomendado: null,
    });
    expect(api.get).toHaveBeenCalledTimes(2); // recarregou a lista
  });

  it('envia prazo e período recomendado quando preenchidos', async () => {
    const user = userEvent.setup();
    render(<CompanyChallenges />);
    await screen.findByRole('heading', { name: 'Estágio Back-end' });

    await user.click(screen.getByRole('button', { name: /Novo Desafio/ }));
    await preencherVagaEDesafio(user);
    await user.type(screen.getByLabelText('Período recomendado (opcional)'), '4');
    await user.type(screen.getByLabelText('Prazo para participar (opcional)'), '2030-12-31');
    await user.click(screen.getByRole('button', { name: 'Criar Desafio' }));

    expect(api.post).toHaveBeenCalledWith('/empresa/projetos/', expect.objectContaining({
      prazo: '2030-12-31',
      periodo_recomendado: 4,
    }));
  });

  it('edita um desafio existente com o formulário preenchido', async () => {
    const user = userEvent.setup();
    render(<CompanyChallenges />);

    const [editarPrimeiro] = await screen.findAllByRole('button', { name: 'Editar' });
    await user.click(editarPrimeiro);
    expect(screen.getByLabelText('Título da vaga')).toHaveValue('Estágio Back-end');
    const titulo = screen.getByLabelText('Título do Desafio');
    expect(titulo).toHaveValue('API REST');

    await user.clear(titulo);
    await user.type(titulo, 'API REST v2');
    await user.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    const [, enviado] = api.patch.mock.calls[0];
    expect(enviado).toMatchObject({ titulo: 'API REST v2', vaga_titulo: 'Estágio Back-end', periodo_recomendado: 4 });
    // só os campos editáveis: status, id e etapas não vão no PATCH
    expect(Object.keys(enviado).sort()).toEqual([
      'descricao', 'dificuldade', 'ferramentas', 'periodo_recomendado', 'prazo', 'titulo',
      'vaga_descricao', 'vaga_modalidade', 'vaga_tecnologias', 'vaga_titulo',
    ]);
  });

  it('"Cancelar" fecha o formulário sem salvar', async () => {
    const user = userEvent.setup();
    render(<CompanyChallenges />);
    await screen.findByRole('heading', { name: 'Estágio Back-end' });

    await user.click(screen.getByRole('button', { name: /Novo Desafio/ }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('button', { name: 'Criar Desafio' })).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('publica o rascunho, encerra o publicado e reabre o encerrado', async () => {
    const user = userEvent.setup();
    render(<CompanyChallenges />);

    await user.click(await screen.findByRole('button', { name: 'Publicar' }));
    expect(api.post).toHaveBeenCalledWith('/empresa/projetos/2/publicar/');

    await user.click(await screen.findByRole('button', { name: 'Encerrar' }));
    expect(api.post).toHaveBeenCalledWith('/empresa/projetos/1/encerrar/');

    await user.click(await screen.findByRole('button', { name: 'Reabrir' }));
    expect(api.post).toHaveBeenCalledWith('/empresa/projetos/3/publicar/');
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
    await screen.findByRole('heading', { name: 'Estágio Back-end' });

    await user.click(screen.getByRole('button', { name: /Novo Desafio/ }));
    await preencherVagaEDesafio(user);
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
