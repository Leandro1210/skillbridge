import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import { renderComRotas } from '../test/renderComRotas';
import PerfilEmpresaPage from './PerfilEmpresaPage';

vi.mock('../api', () => ({ default: { get: vi.fn() } }));

const EMPRESA = {
  id: 7, nome: 'TechBR', setor: 'Tecnologia', descricao: 'Startup de SaaS.', area_atuacao: 'SaaS B2B',
  cidade: 'Anápolis, GO', website: 'https://techbr.com', email_contato: 'vagas@techbr.com', telefone: '(62) 3333-0000',
  linkedin_url: 'https://linkedin.com/company/techbr', instagram_url: '', github_url: '', logo_url: '',
  tecnologias: 'Python, Django, Python', descricao_adicional: 'Mentoria para iniciantes.',
  numeros: { desafios_publicados: 2, desafios_abertos: 1, alunos_alcancados: 12, submissoes: 9 },
  desafios: [
    { id: 1, titulo: 'API REST', dificuldade: 'intermediario', status: 'publicado', aceita_entregas: true, prazo: null, publicado_em: null, participantes: 8, submissoes: 6 },
    { id: 2, titulo: 'App mobile', dificuldade: 'avancado', status: 'encerrado', aceita_entregas: false, prazo: null, publicado_em: null, participantes: 1, submissoes: 1 },
  ],
  propria: false,
};

function abrir({ linkParaDesafios = true, id = 7 } = {}) {
  return renderComRotas(
    <Routes><Route path="/empresas/:id" element={<PerfilEmpresaPage linkParaDesafios={linkParaDesafios} />} /></Routes>,
    { rota: `/empresas/${id}` },
  );
}

beforeEach(() => {
  api.get.mockResolvedValue({ data: EMPRESA });
});

describe('PerfilEmpresaPage', () => {
  it('mostra dados, contatos, stack e números da empresa', async () => {
    abrir();

    expect(await screen.findByRole('heading', { name: 'TechBR' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/empresas/7/');
    expect(screen.getByText('SaaS B2B · Anápolis, GO')).toBeInTheDocument();
    expect(screen.getByText('Startup de SaaS.')).toBeInTheDocument();
    expect(screen.getByText('Mentoria para iniciantes.')).toBeInTheDocument();

    const contatos = screen.getByRole('list', { name: 'Contato e redes' });
    expect(within(contatos).getByRole('link', { name: /vagas@techbr.com/ })).toHaveAttribute('href', 'mailto:vagas@techbr.com');
    expect(within(contatos).getByRole('link', { name: /3333-0000/ })).toHaveAttribute('href', 'tel:6233330000');
    expect(within(contatos).getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('target', '_blank');
    expect(within(contatos).queryByRole('link', { name: /Instagram/ })).not.toBeInTheDocument(); // vazio não aparece

    const stack = screen.getByRole('list', { name: 'Stack tecnológico' });
    expect(within(stack).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Python', 'Django']);
    expect(screen.getByText('Alunos alcançados').nextSibling).toHaveTextContent('12');
  });

  it('separa desafios abertos e encerrados, com a participação de cada um', async () => {
    abrir();

    const abertos = await screen.findByRole('region', { name: 'Desafios abertos' });
    expect(within(abertos).getByRole('link', { name: 'API REST' })).toHaveAttribute('href', '/desafios/1');
    expect(within(abertos).getByText('8 participantes')).toBeInTheDocument();
    expect(within(abertos).getByText('6 submissões')).toBeInTheDocument();
    expect(within(abertos).getByText('Aberto')).toBeInTheDocument();

    const encerrados = screen.getByRole('region', { name: 'Desafios encerrados' });
    expect(within(encerrados).getByText('App mobile')).toBeInTheDocument();
    expect(within(encerrados).getByText('1 participante')).toBeInTheDocument();
    expect(within(encerrados).getByText('1 submissão')).toBeInTheDocument();
    expect(within(encerrados).getByText('Encerrado')).toBeInTheDocument();
  });

  it('para a empresa, os desafios não são links e aparece "Editar perfil" no próprio perfil', async () => {
    api.get.mockResolvedValue({ data: { ...EMPRESA, propria: true } });
    abrir({ linkParaDesafios: false });

    await screen.findByRole('heading', { name: 'TechBR' });
    expect(screen.queryByRole('link', { name: 'API REST' })).not.toBeInTheDocument();
    expect(screen.getByText('API REST')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Editar perfil/ })).toHaveAttribute('href', '/empresa/perfil');
  });

  it('empresa sem desafios mostra as listas vazias', async () => {
    api.get.mockResolvedValue({ data: { ...EMPRESA, desafios: [], numeros: { desafios_publicados: 0, desafios_abertos: 0, alunos_alcancados: 0, submissoes: 0 } } });
    abrir();

    expect(await screen.findByText('Nenhum desafio aberto no momento.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum desafio encerrado ainda.')).toBeInTheDocument();
  });

  it('empresa inexistente mostra "não encontrada"', async () => {
    api.get.mockRejectedValue({ response: { status: 404 } });
    abrir();

    expect(await screen.findByText('Empresa não encontrada.')).toBeInTheDocument();
  });

  it('outros erros mostram mensagem genérica', async () => {
    api.get.mockRejectedValue(new Error('offline'));
    abrir();

    expect(await screen.findByText('Não foi possível carregar o perfil da empresa.')).toBeInTheDocument();
  });

  it('id que não é número (ex.: caminho forjado) não chama a API', async () => {
    abrir({ id: '..%2Fempresa%2Fdashboard' });

    expect(await screen.findByText('Empresa não encontrada.')).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });
});
