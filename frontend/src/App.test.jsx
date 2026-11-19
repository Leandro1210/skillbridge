/**
 * Testa as decisões do App (qual tela e quais rotas mostrar, sessão, logout).
 * As telas filhas são trocadas por versões mínimas: elas têm testes próprios.
 */
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import { getAccessToken, setTokens } from './auth';
import { renderComRotas } from './test/renderComRotas';
import App from './App';

vi.mock('./api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('./components/AuthPage', () => ({
  default: ({ onLogin }) => <button onClick={onLogin}>Tela de login</button>,
}));
vi.mock('./components/FeedPage', () => ({ default: () => <p>Painel do aluno</p> }));
vi.mock('./components/DesafioPage', async () => {
  const { useParams } = await import('react-router-dom');
  return {
    default: function DesafioFalso() {
      const { id } = useParams();
      return <p>Página do desafio {id}</p>;
    },
  };
});
vi.mock('./components/PerfilAlunoPage', async () => {
  const { useParams } = await import('react-router-dom');
  return {
    default: function PerfilFalso({ alunoId }) {
      const { id } = useParams();
      return <p>Perfil do aluno {alunoId ?? id}</p>;
    },
  };
});
vi.mock('./components/PerfilEditarPage', () => ({ default: () => <p>Edição de perfil do aluno</p> }));
vi.mock('./components/PerfilEmpresaPage', () => ({
  default: ({ linkParaDesafios }) => <p>Perfil público da empresa{linkParaDesafios ? ' (com links)' : ''}</p>,
}));
vi.mock('./components/CompanyDashboard', () => ({ default: () => <p>Painel da empresa</p> }));
vi.mock('./components/CompanyChallenges', () => ({ default: () => <p>Desafios da empresa</p> }));
vi.mock('./components/CompanySubmissions', () => ({ default: () => <p>Submissões da empresa</p> }));
vi.mock('./components/CompanyProfileEdit', () => ({ default: () => <p>Perfil da empresa</p> }));

const ESTUDANTE = { data: { id: 1, nome: 'Aluno', empresa: null } };
const EMPRESA = { data: { id: 2, nome: 'RH', empresa: 7 } };

function logado() {
  setTokens({ access: 'a', refresh: 'r' });
}

beforeEach(() => {
  api.get.mockResolvedValue(ESTUDANTE);
  api.post.mockResolvedValue({});
});

describe('App: sessão', () => {
  it('sem token, mostra a tela de login', () => {
    renderComRotas(<App />);

    expect(screen.getByRole('button', { name: 'Tela de login' })).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('depois do login, carrega o perfil e mostra a página inicial do aluno', async () => {
    const user = userEvent.setup();
    renderComRotas(<App />);

    await user.click(screen.getByRole('button', { name: 'Tela de login' }));

    expect(await screen.findByText('Painel do aluno')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/auth/me/');
  });

  it('com token salvo, mostra "Carregando…" e depois a página inicial', async () => {
    logado();
    renderComRotas(<App />);

    expect(screen.getByText('Carregando…')).toBeInTheDocument();
    expect(await screen.findByText('Painel do aluno')).toBeInTheDocument();
  });

  it('se o perfil falhar, oferece tentar de novo', async () => {
    const user = userEvent.setup();
    logado();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(ESTUDANTE);
    renderComRotas(<App />);

    expect(await screen.findByText('Não foi possível carregar seu perfil.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Painel do aluno')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('"Sair" na tela de erro volta para o login', async () => {
    const user = userEvent.setup();
    logado();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValue(new Error('offline'));
    renderComRotas(<App />);

    await user.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(screen.getByRole('button', { name: 'Tela de login' })).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });

  it('o evento de sessão expirada (vindo do api.js) volta para o login', async () => {
    logado();
    renderComRotas(<App />);
    await screen.findByText('Painel do aluno');

    act(() => {
      window.dispatchEvent(new Event('skillbridge:auth-logout'));
    });

    expect(screen.getByRole('button', { name: 'Tela de login' })).toBeInTheDocument();
  });

  it('"Sair" invalida o refresh no servidor e limpa a sessão', async () => {
    const user = userEvent.setup();
    setTokens({ access: 'a', refresh: 'meu-refresh' });
    renderComRotas(<App />);
    await screen.findByText('Painel do aluno');

    // há um "Sair" na lateral (telas largas) e outro na barra do celular; o CSS mostra um só
    await user.click(screen.getAllByRole('button', { name: /Sair/ })[0]);

    expect(api.post).toHaveBeenCalledWith('/auth/logout/', { refresh: 'meu-refresh' });
    expect(getAccessToken()).toBeNull();
    expect(screen.getByRole('button', { name: 'Tela de login' })).toBeInTheDocument();
  });

  it('"Sair" encerra a sessão local mesmo se o servidor falhar', async () => {
    const user = userEvent.setup();
    setTokens({ access: 'a', refresh: 'expirado' });
    api.post.mockRejectedValue(new Error('token expirado'));
    renderComRotas(<App />);
    await screen.findByText('Painel do aluno');

    // há um "Sair" na lateral (telas largas) e outro na barra do celular; o CSS mostra um só
    await user.click(screen.getAllByRole('button', { name: /Sair/ })[0]);

    await waitFor(() => expect(getAccessToken()).toBeNull());
    expect(screen.getByRole('button', { name: 'Tela de login' })).toBeInTheDocument();
  });
});

describe('App: acesso diário', () => {
  beforeEach(() => {
    logado();
  });

  it('aluno registra o acesso do dia e avisa a tela de atividade quando rende XP', async () => {
    const ouvinte = vi.fn();
    window.addEventListener('skillbridge:atividade', ouvinte);
    api.post.mockResolvedValue({ data: { xp_ganho: 5 } });
    renderComRotas(<App />);

    await screen.findByText('Painel do aluno');
    expect(api.post).toHaveBeenCalledWith('/atividade/acesso/');
    await waitFor(() => expect(ouvinte).toHaveBeenCalledTimes(1));
    window.removeEventListener('skillbridge:atividade', ouvinte);
  });

  it('acesso repetido no dia não dispara o aviso', async () => {
    const ouvinte = vi.fn();
    window.addEventListener('skillbridge:atividade', ouvinte);
    api.post.mockResolvedValue({ data: { xp_ganho: 0 } });
    renderComRotas(<App />);

    await screen.findByText('Painel do aluno');
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/atividade/acesso/'));
    expect(ouvinte).not.toHaveBeenCalled();
    window.removeEventListener('skillbridge:atividade', ouvinte);
  });

  it('empresa não registra acesso de atividade', async () => {
    api.get.mockResolvedValue(EMPRESA);
    renderComRotas(<App />);

    await screen.findByText('Painel da empresa');
    expect(api.post).not.toHaveBeenCalledWith('/atividade/acesso/');
  });
});

describe('App: rotas do aluno', () => {
  beforeEach(() => {
    logado();
  });

  it('abre o desafio pela URL', async () => {
    renderComRotas(<App />, { rota: '/desafios/7' });

    expect(await screen.findByText('Página do desafio 7')).toBeInTheDocument();
  });

  it('navega para "Meu perfil" e volta ao feed pelo logo', async () => {
    const user = userEvent.setup();
    renderComRotas(<App />);
    await screen.findByText('Painel do aluno');

    // a navegação aparece duas vezes (rail em telas largas, barra inferior no celular)
    await user.click(screen.getAllByRole('link', { name: /Meu perfil/ })[0]);
    expect(screen.getByText('Perfil do aluno 1')).toBeInTheDocument(); // o próprio perfil (id do usuário logado)

    await user.click(screen.getByRole('link', { name: 'Ir para o início' }));
    expect(screen.getByText('Painel do aluno')).toBeInTheDocument();
  });

  it('marca o destino atual na navegação', async () => {
    renderComRotas(<App />, { rota: '/perfil' });
    await screen.findByText('Perfil do aluno 1');

    const [perfil] = screen.getAllByRole('link', { name: /Meu perfil/ });
    const [feed] = screen.getAllByRole('link', { name: /Feed/ });
    expect(perfil).toHaveAttribute('aria-current', 'page');
    expect(feed).not.toHaveAttribute('aria-current');
  });

  it('aluno abre o perfil público de uma empresa, com links para os desafios', async () => {
    renderComRotas(<App />, { rota: '/empresas/7' });

    expect(await screen.findByText('Perfil público da empresa (com links)')).toBeInTheDocument();
  });

  it('abre a edição do perfil', async () => {
    renderComRotas(<App />, { rota: '/perfil/editar' });

    expect(await screen.findByText('Edição de perfil do aluno')).toBeInTheDocument();
  });

  it('aluno não abre o perfil público de outro aluno pela rota', async () => {
    renderComRotas(<App />, { rota: '/alunos/9' });

    expect(await screen.findByText('Painel do aluno')).toBeInTheDocument();
  });

  it('rota desconhecida volta para o feed', async () => {
    renderComRotas(<App />, { rota: '/nao-existe' });

    expect(await screen.findByText('Painel do aluno')).toBeInTheDocument();
  });

  it('aluno não acessa as rotas da empresa', async () => {
    renderComRotas(<App />, { rota: '/empresa/desafios' });

    expect(await screen.findByText('Painel do aluno')).toBeInTheDocument();
    expect(screen.queryByText('Desafios da empresa')).not.toBeInTheDocument();
  });
});

describe('App: rotas da empresa', () => {
  beforeEach(() => {
    logado();
    api.get.mockResolvedValue(EMPRESA);
  });

  it('usuário de empresa entra no painel da empresa', async () => {
    renderComRotas(<App />);

    expect(await screen.findByText('Painel da empresa')).toBeInTheDocument();
    expect(screen.queryByText('Painel do aluno')).not.toBeInTheDocument();
  });

  it('navega pela barra até as submissões', async () => {
    const user = userEvent.setup();
    renderComRotas(<App />);
    await screen.findByText('Painel da empresa');

    await user.click(screen.getAllByRole('link', { name: /Submissões/ })[0]);

    expect(screen.getByText('Submissões da empresa')).toBeInTheDocument();
  });

  it('abre direto uma rota da empresa pela URL', async () => {
    renderComRotas(<App />, { rota: '/empresa/perfil' });

    expect(await screen.findByText('Perfil da empresa')).toBeInTheDocument();
  });

  it('empresa vê o perfil público (o próprio ou de outra), sem links de desafio', async () => {
    renderComRotas(<App />, { rota: '/empresas/7' });

    expect(await screen.findByText('Perfil público da empresa')).toBeInTheDocument();
  });

  it('empresa abre o perfil de um candidato', async () => {
    renderComRotas(<App />, { rota: '/alunos/9' });

    expect(await screen.findByText('Perfil do aluno 9')).toBeInTheDocument();
  });

  it('empresa não acessa as rotas do aluno', async () => {
    renderComRotas(<App />, { rota: '/perfil' });

    expect(await screen.findByText('Painel da empresa')).toBeInTheDocument();
  });
});
