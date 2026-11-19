import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import { renderComRotas } from '../test/renderComRotas';
import PerfilAlunoPage from './PerfilAlunoPage';

vi.mock('../api', () => ({ default: { get: vi.fn() } }));

const ATIVIDADE = {
  temporada: '2026.2', xp: 565, nivel: 'Muito ativo', proximo_nivel: { nome: 'Destaque', xp_faltante: 435 },
  serie_semanal: [{ inicio: '2026-06-29', total: 15, por_origem: { acesso_diario: 15 } }],
  temporadas_anteriores: [{ temporada: '2026.1', xp: 620, nivel: 'Muito ativo' }],
};

const ALUNO = {
  id: 3,
  nome: 'ana souza',
  proprio: false,
  aprovacoes: 2,
  perfil: {
    titulo: 'Dev back-end em formação', curso: 'Engenharia de Software', instituicao_ensino: 'UniEVANGÉLICA',
    periodo_atual: 6, estudando_atualmente: 'Testes de Software', bio: 'Gosto de backend.',
    tecnologias: 'Python, , Django, Python', portfolio_url: '', github_url: 'https://github.com/ana', linkedin_url: '',
  },
  projetos: [
    { id: 1, titulo: 'API de biblioteca', disciplina: 'Programação Web', periodo: 4, repo_url: 'https://github.com/ana/api', tecnologias: 'Django', descricao: '', destaque: true },
  ],
  publicacoes: [
    { id: 1, titulo: 'Testes em projetos acadêmicos', tipo: 'resumo', veiculo: 'Semana de Tecnologia', ano: 2026, url: 'https://doi.org/10.1/x', coautores: 'Prof. Silva' },
  ],
  historico: [
    { desafio: { id: 9, titulo: 'API REST' }, empresa: { id: 7, nome: 'TechBR' }, participou_em: '2026-10-20T10:00:00Z' },
  ],
};

function abrirComoEmpresa(id = 3) {
  return renderComRotas(
    <Routes><Route path="/alunos/:id" element={<PerfilAlunoPage />} /></Routes>,
    { rota: `/alunos/${id}` },
  );
}

beforeEach(() => {
  api.get.mockResolvedValue({ data: ALUNO });
});

describe('PerfilAlunoPage', () => {
  it('mostra os dados acadêmicos, o selo de aprovações e os links', async () => {
    abrirComoEmpresa();

    expect(await screen.findByRole('heading', { name: 'ana souza' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/alunos/3/');
    expect(screen.getByText('Engenharia de Software · UniEVANGÉLICA · 6º período')).toBeInTheDocument();
    expect(screen.getByText('Testes de Software')).toBeInTheDocument();
    expect(screen.getByText('2 aprovações em desafios')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/ana');
    expect(screen.queryByRole('link', { name: /LinkedIn/ })).not.toBeInTheDocument(); // vazio não aparece
    const tecnologias = screen.getByRole('list', { name: 'Tecnologias' });
    expect(within(tecnologias).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Python', 'Django']);
  });

  it('lista projetos, publicações e o histórico só com a participação', async () => {
    abrirComoEmpresa();

    const projetos = await screen.findByRole('region', { name: 'Projetos' });
    expect(within(projetos).getByText('API de biblioteca')).toBeInTheDocument();
    expect(within(projetos).getByText('Destaque')).toBeInTheDocument();
    expect(within(projetos).getByRole('link', { name: /Ver repositório/ })).toHaveAttribute('href', 'https://github.com/ana/api');

    const publicacoes = screen.getByRole('region', { name: 'Produção científica' });
    expect(within(publicacoes).getByText('Resumo em evento · Semana de Tecnologia · 2026')).toBeInTheDocument();
    expect(within(publicacoes).getByText('Coautores: Prof. Silva')).toBeInTheDocument();

    const historico = screen.getByRole('region', { name: 'Participações em desafios' });
    expect(within(historico).getByText('API REST')).toBeInTheDocument();
    expect(within(historico).getByText('TechBR')).toBeInTheDocument();
    expect(within(historico).getByText(/Participou em/)).toBeInTheDocument();
    expect(within(historico).queryByText(/aprovad|reprovad/i)).not.toBeInTheDocument();
  });

  it('para a empresa, sem atividade permitida, não há seção de atividade nem botão editar', async () => {
    abrirComoEmpresa();

    await screen.findByRole('heading', { name: 'ana souza' });
    expect(screen.queryByRole('region', { name: 'Atividade no semestre' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Editar perfil/ })).not.toBeInTheDocument();
  });

  it('para a empresa, com atividade permitida, mostra XP, nível e gráfico', async () => {
    api.get.mockResolvedValue({ data: { ...ALUNO, atividade: ATIVIDADE } });
    abrirComoEmpresa();

    const atividade = await screen.findByRole('region', { name: 'Atividade no semestre' });
    expect(atividade).toHaveTextContent('565 XP');
    expect(within(atividade).getByText('Muito ativo')).toBeInTheDocument();
    expect(within(atividade).getByRole('img', { name: /XP por semana/ })).toBeInTheDocument();
    expect(within(atividade).getByText(/1º semestre de 2026 \(620 XP · Muito ativo\)/)).toBeInTheDocument();
    expect(within(atividade).queryByText(/Visível para as empresas|Só você vê/)).not.toBeInTheDocument();
  });

  it('o próprio aluno vê o botão editar e se a atividade está visível para empresas', async () => {
    api.get.mockResolvedValue({
      data: { ...ALUNO, proprio: true, atividade: ATIVIDADE, perfil: { ...ALUNO.perfil, mostrar_atividade: false } },
    });
    renderComRotas(<PerfilAlunoPage alunoId={3} />, { rota: '/perfil' });

    expect(await screen.findByRole('link', { name: /Editar perfil/ })).toHaveAttribute('href', '/perfil/editar');
    expect(screen.getByText(/Só você vê/)).toBeInTheDocument();
  });

  it('perfil vazio mostra convites ao próprio aluno', async () => {
    api.get.mockResolvedValue({
      data: { ...ALUNO, proprio: true, aprovacoes: 0, projetos: [], publicacoes: [], historico: [], perfil: { mostrar_atividade: false } },
    });
    renderComRotas(<PerfilAlunoPage alunoId={3} />, { rota: '/perfil' });

    expect(await screen.findByText(/Adicione os projetos das suas disciplinas/)).toBeInTheDocument();
    expect(screen.getByText('Nenhuma participação ainda.')).toBeInTheDocument();
    expect(screen.queryByText(/aprovaç/)).not.toBeInTheDocument(); // sem aprovação, sem selo
  });

  it.each([[404], [403]])('perfil inexistente ou proibido (%i) mostra "não encontrado"', async (status) => {
    api.get.mockRejectedValue({ response: { status } });
    abrirComoEmpresa(99);

    expect(await screen.findByText('Perfil não encontrado.')).toBeInTheDocument();
  });

  it('outros erros mostram mensagem genérica', async () => {
    api.get.mockRejectedValue(new Error('offline'));
    abrirComoEmpresa();

    expect(await screen.findByText('Não foi possível carregar o perfil.')).toBeInTheDocument();
  });

  it('id que não é número (ex.: caminho forjado) não chama a API', async () => {
    abrirComoEmpresa('..%2Fempresa%2Fsubmissoes');

    expect(await screen.findByText('Perfil não encontrado.')).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('a empresa vê os certificados do aluno como ele escreveu', async () => {
    api.get.mockResolvedValue({ data: { ...ALUNO, perfil: { ...ALUNO.perfil, certificados: 'AWS Cloud Practitioner\nScrum Foundation' } } });
    abrirComoEmpresa();

    const secao = await screen.findByRole('region', { name: 'Certificados' });
    const itens = within(secao).getAllByRole('listitem');
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent('AWS Cloud Practitioner');
    expect(itens[1]).toHaveTextContent('Scrum Foundation');
  });

  it('sem certificados, a empresa não vê a seção', async () => {
    abrirComoEmpresa();
    await screen.findByRole('heading', { name: 'ana souza' });
    expect(screen.queryByRole('region', { name: 'Certificados' })).not.toBeInTheDocument();
  });

  it('o próprio aluno sem certificados vê o convite para preencher', async () => {
    api.get.mockResolvedValue({ data: { ...ALUNO, proprio: true } });
    renderComRotas(<PerfilAlunoPage alunoId={3} />, { rota: '/perfil' });

    const secao = await screen.findByRole('region', { name: 'Certificados' });
    expect(secao).toHaveTextContent('Conte quais cursos e certificações você já concluiu');
  });
});
