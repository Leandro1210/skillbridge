import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import { renderComRotas } from '../test/renderComRotas';
import PerfilEditarPage from './PerfilEditarPage';

vi.mock('../api', () => ({ default: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

const PERFIL = {
  titulo: '', curso: 'Engenharia de Software', instituicao_ensino: 'UniEVANGÉLICA', periodo_atual: null,
  estudando_atualmente: '', bio: '', tecnologias: '', portfolio_url: '', github_url: '', linkedin_url: '',
  descricao_adicional: '', mostrar_atividade: false,
};
const PROJETO = { id: 1, titulo: 'API de biblioteca', disciplina: 'Programação Web', periodo: 4, destaque: true, repo_url: 'https://github.com/a/b' };

function mockarApi({ projetos = [PROJETO], publicacoes = [] } = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/perfil/usuario/') return Promise.resolve({ data: PERFIL });
    if (url === '/perfil/projetos/') return Promise.resolve({ data: { results: projetos } });
    return Promise.resolve({ data: { results: publicacoes } });
  });
}

beforeEach(() => {
  mockarApi();
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({});
});

function abrir() {
  return renderComRotas(<PerfilEditarPage />, { rota: '/perfil/editar' });
}

describe('PerfilEditarPage: dados do perfil', () => {
  it('carrega o perfil atual nos campos', async () => {
    abrir();

    expect(await screen.findByLabelText('Curso')).toHaveValue('Engenharia de Software');
    expect(screen.getByLabelText('Período atual')).toHaveValue(null);
    expect(screen.getByRole('checkbox', { name: /Mostrar minha atividade/ })).not.toBeChecked();
  });

  it('salva período, estudos e a opção de mostrar a atividade', async () => {
    const user = userEvent.setup();
    abrir();

    await user.type(await screen.findByLabelText('Período atual'), '6');
    await user.type(screen.getByLabelText('Estudando atualmente'), 'React');
    await user.click(screen.getByRole('checkbox', { name: /Mostrar minha atividade/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar perfil' }));

    expect(api.patch).toHaveBeenCalledWith('/perfil/usuario/', expect.objectContaining({
      periodo_atual: 6, estudando_atualmente: 'React', mostrar_atividade: true,
    }));
    expect(await screen.findByText('Perfil salvo.')).toBeInTheDocument();
  });

  it('período vazio vai como null', async () => {
    const user = userEvent.setup();
    abrir();

    await user.click(await screen.findByRole('button', { name: 'Salvar perfil' }));

    expect(api.patch).toHaveBeenCalledWith('/perfil/usuario/', expect.objectContaining({ periodo_atual: null }));
  });

  it('mostra o erro de validação da API', async () => {
    const user = userEvent.setup();
    api.patch.mockRejectedValue({ response: { data: { periodo_atual: ['Certifique-se que este valor seja menor ou igual a 12.'] } } });
    abrir();

    await user.click(await screen.findByRole('button', { name: 'Salvar perfil' }));

    expect(await screen.findByText('Certifique-se que este valor seja menor ou igual a 12.')).toBeInTheDocument();
  });

  it('se o perfil não carregar, avisa', async () => {
    api.get.mockRejectedValue(new Error('offline'));
    abrir();

    expect(await screen.findByText('Não foi possível carregar seu perfil.')).toBeInTheDocument();
  });
});

describe('PerfilEditarPage: projetos e publicações', () => {
  it('lista os projetos existentes', async () => {
    abrir();

    const projetos = await screen.findByRole('region', { name: 'Projetos acadêmicos' });
    expect(await within(projetos).findByText('API de biblioteca')).toBeInTheDocument();
    expect(within(projetos).getByText('Programação Web · 4º período · destaque')).toBeInTheDocument();
  });

  it('adiciona um projeto e mostra o XP ganho', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 2, titulo: 'Jogo da velha', repo_url: 'https://github.com/a/velha', periodo: null, xp_ganho: 40 } });
    abrir();
    const projetos = await screen.findByRole('region', { name: 'Projetos acadêmicos' });

    await user.click(within(projetos).getByRole('button', { name: /Adicionar projeto/ }));
    await user.type(within(projetos).getByLabelText('Título do projeto'), 'Jogo da velha');
    await user.type(within(projetos).getByLabelText('Repositório'), 'https://github.com/a/velha');
    await user.click(within(projetos).getByRole('button', { name: 'Salvar' }));

    expect(api.post).toHaveBeenCalledWith('/perfil/projetos/', expect.objectContaining({
      titulo: 'Jogo da velha', repo_url: 'https://github.com/a/velha', periodo: null, destaque: false,
    }));
    expect(await within(projetos).findByText('+40 XP de atividade.')).toBeInTheDocument();
    expect(within(projetos).getByText('Jogo da velha')).toBeInTheDocument();
  });

  it('no limite do mês, avisa que o item entrou sem XP', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 3, titulo: 'Quinto', xp_ganho: 0 } });
    abrir();
    const projetos = await screen.findByRole('region', { name: 'Projetos acadêmicos' });

    await user.click(within(projetos).getByRole('button', { name: /Adicionar projeto/ }));
    await user.type(within(projetos).getByLabelText('Título do projeto'), 'Quinto');
    await user.type(within(projetos).getByLabelText('Repositório'), 'https://github.com/a/q');
    await user.click(within(projetos).getByRole('button', { name: 'Salvar' }));

    expect(await within(projetos).findByText(/limite de XP deste mês/)).toBeInTheDocument();
  });

  it('mostra o erro da API (ex.: repositório repetido)', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({ response: { data: { repo_url: ['Este repositório já está no seu perfil.'] } } });
    abrir();
    const projetos = await screen.findByRole('region', { name: 'Projetos acadêmicos' });

    await user.click(within(projetos).getByRole('button', { name: /Adicionar projeto/ }));
    await user.type(within(projetos).getByLabelText('Título do projeto'), 'X');
    await user.type(within(projetos).getByLabelText('Repositório'), 'https://github.com/a/b');
    await user.click(within(projetos).getByRole('button', { name: 'Salvar' }));

    expect(await within(projetos).findByText('Este repositório já está no seu perfil.')).toBeInTheDocument();
  });

  it('cancelar fecha o formulário', async () => {
    const user = userEvent.setup();
    abrir();
    const projetos = await screen.findByRole('region', { name: 'Projetos acadêmicos' });

    await user.click(within(projetos).getByRole('button', { name: /Adicionar projeto/ }));
    await user.click(within(projetos).getByRole('button', { name: 'Cancelar' }));

    expect(within(projetos).queryByLabelText('Título do projeto')).not.toBeInTheDocument();
  });

  it('remover pede confirmação e só apaga se confirmado', async () => {
    const user = userEvent.setup();
    const confirmar = vi.spyOn(window, 'confirm');
    abrir();
    const projetos = await screen.findByRole('region', { name: 'Projetos acadêmicos' });
    const botao = await within(projetos).findByRole('button', { name: 'Remover API de biblioteca' });

    confirmar.mockReturnValueOnce(false);
    await user.click(botao);
    expect(api.delete).not.toHaveBeenCalled();

    confirmar.mockReturnValueOnce(true);
    await user.click(botao);
    expect(api.delete).toHaveBeenCalledWith('/perfil/projetos/1/');
    expect(within(projetos).queryByText('API de biblioteca')).not.toBeInTheDocument();
  });

  it('adiciona uma publicação escolhendo o tipo', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 5, titulo: 'Artigo', tipo: 'tcc', ano: 2026, xp_ganho: 80 } });
    abrir();
    const publicacoes = await screen.findByRole('region', { name: 'Produção científica' });

    await user.click(within(publicacoes).getByRole('button', { name: /Adicionar publicação/ }));
    await user.type(within(publicacoes).getByLabelText('Título da publicação'), 'Artigo');
    await user.selectOptions(within(publicacoes).getByLabelText('Tipo'), 'tcc');
    await user.type(within(publicacoes).getByLabelText('Ano'), '2026');
    await user.type(within(publicacoes).getByLabelText('Link ou DOI'), 'https://doi.org/10.1/x');
    await user.click(within(publicacoes).getByRole('button', { name: 'Salvar' }));

    expect(api.post).toHaveBeenCalledWith('/perfil/publicacoes/', expect.objectContaining({
      titulo: 'Artigo', tipo: 'tcc', ano: '2026', url: 'https://doi.org/10.1/x',
    }));
    expect(await within(publicacoes).findByText('+80 XP de atividade.')).toBeInTheDocument();
    expect(within(publicacoes).getByText('TCC · 2026')).toBeInTheDocument();
  });
});
