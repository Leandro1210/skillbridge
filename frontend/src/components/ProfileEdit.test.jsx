/** Tela de edição do perfil da empresa (GET, edição, PATCH). O do aluno está em PerfilEditarPage.test.jsx. */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import { renderComRotas } from '../test/renderComRotas';
import CompanyProfileEdit from './CompanyProfileEdit';

vi.mock('../api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));

const PERFIL_EMPRESA = {
  empresa_id: 7, nome: 'TechBR', setor: 'Tecnologia', descricao: '', area_atuacao: 'SaaS', cidade: '',
  website: '', email_contato: '', telefone: '', linkedin_url: '', instagram_url: '', github_url: '',
  logo_url: '', tecnologias: 'Django', descricao_adicional: '',
};

beforeEach(() => {
  api.get.mockResolvedValue({ data: PERFIL_EMPRESA });
  api.patch.mockResolvedValue({ data: {} });
});

describe('CompanyProfileEdit', () => {
  it('carrega nome, setor e o perfil em uma única requisição', async () => {
    renderComRotas(<CompanyProfileEdit />);

    expect(await screen.findByLabelText('Nome da empresa')).toHaveValue('TechBR');
    expect(screen.getByLabelText('Área de Atuação')).toHaveValue('SaaS');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/perfil/empresa/');
  });

  it('salva contatos e redes, sem enviar o id (somente leitura)', async () => {
    const user = userEvent.setup();
    renderComRotas(<CompanyProfileEdit />);

    await user.type(await screen.findByLabelText('Cidade'), 'Anápolis, GO');
    await user.type(screen.getByLabelText('E-mail de contato'), 'vagas@techbr.com');
    await user.type(screen.getByLabelText('Instagram'), 'https://instagram.com/techbr');
    await user.click(screen.getByRole('button', { name: 'Salvar Perfil' }));

    const [, enviado] = api.patch.mock.calls[0];
    expect(enviado).toMatchObject({
      nome: 'TechBR', cidade: 'Anápolis, GO', email_contato: 'vagas@techbr.com', instagram_url: 'https://instagram.com/techbr',
    });
    expect(enviado).not.toHaveProperty('empresa_id');
    expect(await screen.findByText('Perfil da empresa atualizado com sucesso!')).toBeInTheDocument();
  });

  it('tem o atalho para ver o perfil público', async () => {
    renderComRotas(<CompanyProfileEdit />);

    expect(await screen.findByRole('link', { name: /Ver perfil público/ })).toHaveAttribute('href', '/empresas/7');
  });

  it('mostra o campo recusado pela API', async () => {
    const user = userEvent.setup();
    api.patch.mockRejectedValue({ response: { data: { email_contato: ['Insira um endereço de email válido.'] } } });
    renderComRotas(<CompanyProfileEdit />);

    await user.click(await screen.findByRole('button', { name: 'Salvar Perfil' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('email_contato: Insira um endereço de email válido.');
  });

  it('sem detalhe da API, mostra a mensagem genérica', async () => {
    const user = userEvent.setup();
    api.patch.mockRejectedValue(new Error('offline'));
    renderComRotas(<CompanyProfileEdit />);

    await user.click(await screen.findByRole('button', { name: 'Salvar Perfil' }));

    expect(await screen.findByText('Erro ao salvar perfil da empresa')).toBeInTheDocument();
  });

  it('mostra erro se o perfil não carregar', async () => {
    api.get.mockRejectedValue(new Error('offline'));
    renderComRotas(<CompanyProfileEdit />);

    expect(await screen.findByText('Erro ao carregar perfil da empresa')).toBeInTheDocument();
  });
});
