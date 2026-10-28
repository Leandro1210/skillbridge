/**
 * Testa as decisões do App (qual tela mostrar, sessão, logout). As telas
 * filhas são trocadas por versões mínimas: elas têm testes próprios.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import { getAccessToken, setTokens } from './auth';
import App from './App';

vi.mock('./api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('./components/AuthPage', () => ({
  default: ({ onLogin }) => <button onClick={onLogin}>Tela de login</button>,
}));
vi.mock('./components/Dashboard', () => ({ default: () => <p>Painel do aluno</p> }));
vi.mock('./components/ProjectCatalog', () => ({ default: () => <p>Catálogo</p> }));
vi.mock('./components/StudentProfileEdit', () => ({ default: () => <p>Edição de perfil do aluno</p> }));
vi.mock('./components/CompanyDashboard', () => ({ default: () => <p>Painel da empresa</p> }));
vi.mock('./components/CompanyChallenges', () => ({ default: () => <p>Desafios da empresa</p> }));
vi.mock('./components/CompanySubmissions', () => ({ default: () => <p>Submissões da empresa</p> }));
vi.mock('./components/CompanyProfileEdit', () => ({ default: () => <p>Perfil da empresa</p> }));

const ESTUDANTE = { data: { id: 1, nome: 'Aluno', empresa: null } };
const EMPRESA = { data: { id: 2, nome: 'RH', empresa: 7 } };

beforeEach(() => {
  api.get.mockResolvedValue(ESTUDANTE);
  api.post.mockResolvedValue({});
});

describe('App', () => {
  it('sem token, mostra a tela de login', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'Tela de login' })).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('depois do login, carrega o perfil e mostra o painel do aluno', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Tela de login' }));

    expect(await screen.findByText('Painel do aluno')).toBeInTheDocument();
    expect(screen.getByText('Catálogo')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/auth/me/');
  });

  it('com token salvo, entra direto no painel do aluno', async () => {
    setTokens({ access: 'a', refresh: 'r' });
    render(<App />);

    expect(screen.getByText('Carregando…')).toBeInTheDocument();
    expect(await screen.findByText('Painel do aluno')).toBeInTheDocument();
  });

  it('usuário de empresa cai no painel da empresa e navega pela barra', async () => {
    const user = userEvent.setup();
    setTokens({ access: 'a', refresh: 'r' });
    api.get.mockResolvedValue(EMPRESA);
    render(<App />);

    expect(await screen.findByText('Painel da empresa')).toBeInTheDocument();
    expect(screen.queryByText('Painel do aluno')).not.toBeInTheDocument();

    // a navegação aparece duas vezes (rail em telas largas, barra inferior no celular)
    await user.click(screen.getAllByRole('button', { name: /Submissões/ })[0]);
    expect(screen.getByText('Submissões da empresa')).toBeInTheDocument();
  });

  it('aluno abre e fecha a edição de perfil pelo logo', async () => {
    const user = userEvent.setup();
    setTokens({ access: 'a', refresh: 'r' });
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /Meu Perfil/ }));
    expect(screen.getByText('Edição de perfil do aluno')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ir para o início' }));
    expect(screen.getByText('Painel do aluno')).toBeInTheDocument();
  });

  it('se o perfil falhar, oferece tentar de novo', async () => {
    const user = userEvent.setup();
    setTokens({ access: 'a', refresh: 'r' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(ESTUDANTE);
    render(<App />);

    expect(await screen.findByText('Não foi possível carregar seu perfil.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Painel do aluno')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('"Sair" na tela de erro volta para o login', async () => {
    const user = userEvent.setup();
    setTokens({ access: 'a', refresh: 'r' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValue(new Error('offline'));
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(screen.getByRole('button', { name: 'Tela de login' })).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });

  it('o evento de sessão expirada (vindo do api.js) volta para o login', async () => {
    setTokens({ access: 'a', refresh: 'r' });
    render(<App />);
    await screen.findByText('Painel do aluno');

    act(() => {
      window.dispatchEvent(new Event('skillbridge:auth-logout'));
    });

    expect(screen.getByRole('button', { name: 'Tela de login' })).toBeInTheDocument();
  });

  it('"Sair" invalida o refresh no servidor e limpa a sessão', async () => {
    const user = userEvent.setup();
    setTokens({ access: 'a', refresh: 'meu-refresh' });
    render(<App />);
    await screen.findByText('Painel do aluno');

    await user.click(screen.getByRole('button', { name: /Sair/ }));

    expect(api.post).toHaveBeenCalledWith('/auth/logout/', { refresh: 'meu-refresh' });
    expect(getAccessToken()).toBeNull();
    expect(screen.getByRole('button', { name: 'Tela de login' })).toBeInTheDocument();
  });

  it('"Sair" encerra a sessão local mesmo se o servidor falhar', async () => {
    const user = userEvent.setup();
    setTokens({ access: 'a', refresh: 'expirado' });
    api.post.mockRejectedValue(new Error('token expirado'));
    render(<App />);
    await screen.findByText('Painel do aluno');

    await user.click(screen.getByRole('button', { name: /Sair/ }));

    await waitFor(() => expect(getAccessToken()).toBeNull());
    expect(screen.getByRole('button', { name: 'Tela de login' })).toBeInTheDocument();
  });
});
