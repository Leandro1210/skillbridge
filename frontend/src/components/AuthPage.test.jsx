import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import { getAccessToken, getRefreshToken } from '../auth';
import AuthPage from './AuthPage';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const TOKENS = { data: { access: 'acc', refresh: 'ref' } };
const CONTA_ESTUDANTE = { data: { id: 1, empresa: null } };
const CONTA_EMPRESA = { data: { id: 2, empresa: 7 } };
const ERRO_LOGIN = 'E-mail ou senha incorretos.';

async function preencherLogin(user, email = 'aluno@teste.com', senha = 'SenhaForte#2026') {
  await user.type(screen.getByLabelText('E-mail'), email);
  await user.type(screen.getByLabelText('Senha'), senha);
}

beforeEach(() => {
  api.post.mockImplementation((url) => (url === '/auth/token/' ? Promise.resolve(TOKENS) : Promise.resolve({})));
  api.get.mockResolvedValue(CONTA_ESTUDANTE);
});

describe('AuthPage: login', () => {
  it('login de estudante grava os tokens e chama onLogin', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    render(<AuthPage onLogin={onLogin} />);

    await preencherLogin(user);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(api.post).toHaveBeenCalledWith('/auth/token/', { email: 'aluno@teste.com', password: 'SenhaForte#2026' });
    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('acc');
    expect(getRefreshToken()).toBe('ref');
  });

  it('credenciais erradas mostram a mensagem genérica e não logam', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    api.post.mockRejectedValue({ response: { status: 401, data: { detail: 'No active account' } } });
    render(<AuthPage onLogin={onLogin} />);

    await preencherLogin(user, 'aluno@teste.com', 'SenhaErrada#1');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText(ERRO_LOGIN)).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it('conta de EMPRESA entrando por "Sou Estudante" é recusada e a sessão é desfeita', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    api.get.mockResolvedValue(CONTA_EMPRESA);
    render(<AuthPage onLogin={onLogin} />);

    await preencherLogin(user, 'rh@empresa.com');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    // mesma mensagem da senha errada: não revela que o par e-mail/senha existe
    expect(await screen.findByText(ERRO_LOGIN)).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('conta de ESTUDANTE entrando por "Sou Empresa" também é recusada', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    render(<AuthPage onLogin={onLogin} />);

    await user.click(screen.getByRole('button', { name: 'Sou Empresa' }));
    await preencherLogin(user);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText(ERRO_LOGIN)).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it('conta de empresa entrando por "Sou Empresa" funciona', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    api.get.mockResolvedValue(CONTA_EMPRESA);
    render(<AuthPage onLogin={onLogin} />);

    await user.click(screen.getByRole('button', { name: 'Sou Empresa' }));
    await preencherLogin(user, 'rh@empresa.com');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('desabilita o botão e mostra "Carregando..." durante o envio', async () => {
    const user = userEvent.setup();
    api.post.mockReturnValue(new Promise(() => {})); // nunca responde
    render(<AuthPage onLogin={vi.fn()} />);

    await preencherLogin(user);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByRole('button', { name: 'Carregando...' })).toBeDisabled();
  });
});

describe('AuthPage: cadastro', () => {
  async function abrirCadastro(user) {
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    await user.type(screen.getByLabelText(/Nome completo/), 'Novo Aluno');
    await user.type(screen.getByLabelText('Username'), 'novo');
    await preencherLogin(user, 'novo@teste.com');
    await user.type(screen.getByLabelText('Confirmar senha'), 'SenhaForte#2026');
  }

  it('cadastra, faz login em seguida e chama onLogin', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    render(<AuthPage onLogin={onLogin} />);

    await abrirCadastro(user);
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(api.post).toHaveBeenNthCalledWith(1, '/auth/register/', expect.objectContaining({
      username: 'novo',
      nome: 'Novo Aluno',
      email: 'novo@teste.com',
      password: 'SenhaForte#2026',
      password_confirm: 'SenhaForte#2026',
      is_company: false,
    }));
    expect(api.post).toHaveBeenNthCalledWith(2, '/auth/token/', expect.anything());
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('mostra o erro do campo recusado pelo backend', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({ response: { data: { email: ['usuário com este e-mail já existe.'] } } });
    render(<AuthPage onLogin={vi.fn()} />);

    await abrirCadastro(user);
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('usuário com este e-mail já existe.')).toBeInTheDocument();
  });

  it('sem detalhe do backend, mostra uma mensagem genérica', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(new Error('Network Error'));
    render(<AuthPage onLogin={vi.fn()} />);

    await abrirCadastro(user);
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Erro ao processar. Verifique seus dados.')).toBeInTheDocument();
  });

  it('cadastro de empresa pede e envia nome e setor', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(CONTA_EMPRESA);
    render(<AuthPage onLogin={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Sou Empresa' }));
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    await user.type(screen.getByLabelText('Nome da Empresa'), 'TechBR');
    await user.type(screen.getByLabelText('Setor de Atuação'), 'Tecnologia');
    await user.type(screen.getByLabelText(/Nome completo \(Recrutador\)/), 'RH');
    await user.type(screen.getByLabelText('Username'), 'rh');
    await preencherLogin(user, 'rh@techbr.com');
    await user.type(screen.getByLabelText('Confirmar senha'), 'SenhaForte#2026');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(api.post).toHaveBeenCalledWith('/auth/register/', expect.objectContaining({
      is_company: true,
      empresa_nome: 'TechBR',
      empresa_setor: 'Tecnologia',
    }));
  });

  it('alternar entre login e cadastro limpa a mensagem de erro', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({ response: { status: 401 } });
    render(<AuthPage onLogin={vi.fn()} />);

    await preencherLogin(user);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(ERRO_LOGIN)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.queryByText(ERRO_LOGIN)).not.toBeInTheDocument();
  });
});
