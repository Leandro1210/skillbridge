/** Telas de edição de perfil do aluno e da empresa (mesmo padrão: GET, edição, PATCH). */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import CompanyProfileEdit from './CompanyProfileEdit';
import StudentProfileEdit from './StudentProfileEdit';

vi.mock('../api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));

const PERFIL_ALUNO = {
  titulo: 'Dev', bio: '', instituicao_ensino: 'UniEVANGÉLICA', tecnologias: 'Python', portfolio_url: '', descricao_adicional: '',
};
const PERFIL_EMPRESA = { website: '', tecnologias: 'Django', area_atuacao: 'SaaS', descricao_adicional: '' };

beforeEach(() => {
  api.patch.mockResolvedValue({ data: {} });
});

describe('StudentProfileEdit', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: PERFIL_ALUNO });
  });

  it('carrega o perfil atual nos campos', async () => {
    render(<StudentProfileEdit onBack={vi.fn()} />);

    expect(await screen.findByDisplayValue('UniEVANGÉLICA')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/perfil/usuario/');
  });

  it('salva as alterações com PATCH e confirma', async () => {
    const user = userEvent.setup();
    render(<StudentProfileEdit onBack={vi.fn()} />);

    const bio = await screen.findByPlaceholderText(/Conte um pouco sobre você/);
    await user.type(bio, 'Gosto de backend');
    await user.click(screen.getByRole('button', { name: 'Salvar Perfil' }));

    expect(api.patch).toHaveBeenCalledWith('/perfil/usuario/', expect.objectContaining({
      bio: 'Gosto de backend',
      instituicao_ensino: 'UniEVANGÉLICA',
    }));
    expect(await screen.findByText('Perfil atualizado com sucesso!')).toBeInTheDocument();
  });

  it('mostra erro se salvar falhar', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.patch.mockRejectedValue(new Error('400'));
    render(<StudentProfileEdit onBack={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Salvar Perfil' }));

    expect(await screen.findByText('Erro ao salvar perfil')).toBeInTheDocument();
  });

  it('"Voltar" chama onBack', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<StudentProfileEdit onBack={onBack} />);

    await user.click(await screen.findByRole('button', { name: /Voltar/ }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('mostra erro se o perfil não carregar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValue(new Error('offline'));
    render(<StudentProfileEdit onBack={vi.fn()} />);

    expect(await screen.findByText('Erro ao carregar perfil')).toBeInTheDocument();
  });
});

describe('CompanyProfileEdit', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: PERFIL_EMPRESA });
  });

  it('carrega e salva o perfil da empresa', async () => {
    const user = userEvent.setup();
    render(<CompanyProfileEdit onBack={vi.fn()} />);

    expect(await screen.findByDisplayValue('SaaS')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/perfil/empresa/');

    await user.click(screen.getByRole('button', { name: 'Salvar Perfil' }));

    expect(api.patch).toHaveBeenCalledWith('/perfil/empresa/', expect.objectContaining({ area_atuacao: 'SaaS' }));
  });

  it('mostra erro se salvar falhar', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.patch.mockRejectedValue(new Error('400'));
    render(<CompanyProfileEdit onBack={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Salvar Perfil' }));

    expect(await screen.findByText(/Erro ao salvar/)).toBeInTheDocument();
  });
});
