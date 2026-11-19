import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import { renderComRotas } from '../test/renderComRotas';
import CompanyDashboard from './CompanyDashboard';

vi.mock('../api', () => ({ default: { get: vi.fn() } }));
// o gráfico tem testes próprios (GraficoSolucoes.test.jsx)
vi.mock('./GraficoSolucoes', () => ({ default: () => <p>Gráfico de soluções</p> }));

const STATS = {
  empresa: { id: 7, nome: 'TechBR', setor: 'Tecnologia', area_atuacao: 'SaaS', cidade: 'Anápolis, GO', logo_url: '' },
  total_desafios: 5,
  desafios_ativos: 3,
  desafios_rascunho: 1,
  desafios_encerrados: 1,
  total_submissoes: 10,
  submissoes_pendentes: 2,
  submissoes_aprovadas: 6,
  submissoes_reprovadas: 2,
  submissoes_ultimos_7_dias: 4,
  estudantes_unicos: 8,
  serie_semanal: [{ inicio: '2026-11-16', total: 4 }],
  pendentes: [
    { id: 1, candidato: { id: 3, nome: 'Ana Souza' }, desafio: { id: 9, titulo: 'API REST', vaga_titulo: 'Estágio Back-end' }, entregue_em: new Date().toISOString() },
  ],
  processos: [
    { id: 9, vaga_titulo: 'Estágio Back-end', titulo: 'API REST', prazo: null, aceita_entregas: true, participantes: 5, submissoes: 4, aprovados: 2, pendentes: 2 },
  ],
  perfil_pendente: ['Logo', 'E-mail de contato'],
};

function mockar(campos = {}) {
  api.get.mockResolvedValue({ data: { ...STATS, ...campos } });
}

beforeEach(() => {
  mockar();
});

describe('CompanyDashboard', () => {
  it('cabeçalho com a empresa, o resumo do que pede ação e os atalhos', async () => {
    renderComRotas(<CompanyDashboard />);

    expect(await screen.findByRole('heading', { level: 1, name: 'TechBR' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/empresa/dashboard/');
    expect(screen.getByText('SaaS · Anápolis, GO')).toBeInTheDocument();
    expect(screen.getByText('2 soluções aguardando a sua avaliação.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Novo desafio/ })).toHaveAttribute('href', '/empresa/desafios');
  });

  it('sem pendências, o cabeçalho diz que está tudo em dia', async () => {
    mockar({ submissoes_pendentes: 0, pendentes: [] });
    renderComRotas(<CompanyDashboard />);

    expect(await screen.findByText('Nenhuma solução aguardando avaliação. Tudo em dia!')).toBeInTheDocument();
    expect(screen.getByText('Tudo avaliado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver todas as soluções/ })).toHaveAttribute('href', '/empresa/submissoes');
  });

  it('indicadores: desafios abertos, candidatos, soluções recentes e taxa de aprovação', async () => {
    renderComRotas(<CompanyDashboard />);

    const indicadores = await screen.findByRole('list', { name: 'Indicadores' });
    const itens = within(indicadores).getAllByRole('listitem').map((li) => li.textContent);
    expect(itens[0]).toContain('Desafios abertos3');
    expect(itens[0]).toContain('1 rascunho · 1 encerrado');
    expect(itens[1]).toContain('Candidatos8');
    expect(itens[2]).toContain('+4 nos últimos 7 dias');
    expect(itens[3]).toContain('75%'); // 6 aprovadas de 8 avaliadas
    expect(itens[3]).toContain('6 de 8 avaliadas');
  });

  it('sem avaliações, a taxa de aprovação fica em branco', async () => {
    mockar({ submissoes_aprovadas: 0, submissoes_reprovadas: 0, submissoes_ultimos_7_dias: 0 });
    renderComRotas(<CompanyDashboard />);

    const indicadores = await screen.findByRole('list', { name: 'Indicadores' });
    expect(within(indicadores).getByText('Sem dados')).toBeInTheDocument();
    expect(within(indicadores).getByText('nenhuma avaliada ainda')).toBeInTheDocument();
    expect(within(indicadores).getByText('nenhuma nos últimos 7 dias')).toBeInTheDocument();
  });

  it('abaixo do gráfico, resume a semana atual, a média e a melhor semana', async () => {
    mockar({ serie_semanal: [{ inicio: '2026-11-02', total: 5 }, { inicio: '2026-11-09', total: 0 }, { inicio: '2026-11-16', total: 2 }] });
    renderComRotas(<CompanyDashboard />);

    const cartao = await screen.findByRole('region', { name: 'Soluções recebidas por semana' });
    expect(within(cartao).getByText('Esta semana').nextSibling).toHaveTextContent('2');
    expect(within(cartao).getByText('Média por semana').nextSibling).toHaveTextContent('2,3');
    expect(within(cartao).getByText('Melhor semana').nextSibling).toHaveTextContent('5');
    expect(within(cartao).getByText('02/11 a 08/11')).toBeInTheDocument();
  });

  it('a fila de avaliação leva ao perfil do candidato e à tela de submissões', async () => {
    renderComRotas(<CompanyDashboard />);

    const fila = await screen.findByRole('region', { name: 'Aguardando avaliação' });
    expect(within(fila).getByRole('link', { name: 'Ana Souza' })).toHaveAttribute('href', '/alunos/3');
    expect(within(fila).getByText('Estágio Back-end')).toBeInTheDocument();
    expect(within(fila).getByText('hoje')).toBeInTheDocument();
    expect(within(fila).getByRole('link', { name: /Avaliar soluções/ })).toHaveAttribute('href', '/empresa/submissoes');
  });

  it('cada processo aberto mostra o funil e o que falta avaliar', async () => {
    renderComRotas(<CompanyDashboard />);

    const processos = await screen.findByRole('region', { name: 'Processos abertos' });
    expect(within(processos).getByRole('heading', { name: 'Estágio Back-end' })).toBeInTheDocument();
    expect(within(processos).getByText('Desafio: API REST')).toBeInTheDocument();
    expect(within(processos).getByText(/2 para avaliar/)).toBeInTheDocument();
    const valores = within(processos).getAllByRole('definition').map((dd) => dd.textContent).filter(Boolean);
    expect(valores).toEqual(['5', '4', '2']);
  });

  it('sem processos abertos, lembra dos rascunhos', async () => {
    mockar({ processos: [] });
    renderComRotas(<CompanyDashboard />);

    expect(await screen.findByText(/Você tem 1 desafio em rascunho/)).toBeInTheDocument();
  });

  it('situação das soluções com rótulo e porcentagem, não só a cor', async () => {
    renderComRotas(<CompanyDashboard />);

    const situacao = await screen.findByRole('region', { name: 'Situação das soluções' });
    expect(within(situacao).getByText('Aguardando').parentElement).toHaveTextContent('2(20%)');
    expect(within(situacao).getByText('Aprovadas').parentElement).toHaveTextContent('6(60%)');
    expect(within(situacao).getByText('Ajustes pedidos').parentElement).toHaveTextContent('2(20%)');
  });

  it('lembra o que falta no perfil da empresa, e some quando está completo', async () => {
    const { unmount } = renderComRotas(<CompanyDashboard />);

    const perfil = await screen.findByRole('region', { name: /Complete o perfil/ });
    expect(within(perfil).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Logo', 'E-mail de contato']);
    expect(within(perfil).getByRole('link', { name: /Editar perfil/ })).toHaveAttribute('href', '/empresa/perfil');
    unmount();

    mockar({ perfil_pendente: [] });
    renderComRotas(<CompanyDashboard />);
    await screen.findByRole('heading', { level: 1, name: 'TechBR' });
    expect(screen.queryByRole('region', { name: /Complete o perfil/ })).not.toBeInTheDocument();
  });

  it('mostra erro se as estatísticas não carregarem', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValue(new Error('offline'));
    renderComRotas(<CompanyDashboard />);

    expect(await screen.findByText('Erro ao carregar dashboard')).toBeInTheDocument();
  });
});
