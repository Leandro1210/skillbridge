import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import { renderComRotas } from '../test/renderComRotas';
import FeedPage from './FeedPage';

vi.mock('../api', () => ({ default: { get: vi.fn() } }));
// o resumo de atividade tem testes próprios (AtividadeResumo.test.jsx)
vi.mock('./AtividadeResumo', () => ({ default: () => <p>Resumo da atividade</p> }));

const DESAFIOS = [
  {
    id: 1, vaga_titulo: 'Estágio Back-end', vaga_modalidade: 'remoto',
    vaga_descricao: 'Apoio no desenvolvimento das APIs do produto.', vaga_tecnologias: 'Python, SQL, Python',
    titulo: 'API REST', descricao: 'Construa uma API com JWT', ferramentas: 'Python, Django',
    dificuldade: 'medio', periodo_recomendado: 4, prazo: null, publicado_em: new Date().toISOString(),
    empresa: { id: 7, nome: 'TechBR', setor: 'Tecnologia', area_atuacao: 'SaaS', cidade: 'Anápolis, GO', logo_url: '' },
    participantes: 12, ja_participa: false,
  },
  {
    // desafio antigo, de antes da separação vaga/desafio: sem vaga
    id: 2, vaga_titulo: '', vaga_modalidade: '', vaga_descricao: '', vaga_tecnologias: '',
    titulo: 'Landing page', descricao: 'HTML e CSS', ferramentas: 'HTML',
    dificuldade: 'facil', periodo_recomendado: null, prazo: null, publicado_em: null,
    empresa: null, participantes: 1, ja_participa: true,
  },
];

function mockarApi({ desafios = DESAFIOS, inscricoes = [] } = {}) {
  api.get.mockImplementation((url) => Promise.resolve(
    url === '/inscricoes/' ? { data: { results: inscricoes } } : { data: { results: desafios } },
  ));
}

beforeEach(() => {
  mockarApi();
});

describe('FeedPage', () => {
  it('cada cartão mostra a vaga: empresa, modalidade, descrição e tecnologias esperadas', async () => {
    renderComRotas(<FeedPage />);

    const cartao = (await screen.findByRole('heading', { name: 'Estágio Back-end' })).closest('article');
    // o nome da empresa leva ao perfil público dela
    expect(within(cartao).getByRole('link', { name: 'TechBR' })).toHaveAttribute('href', '/empresas/7');
    expect(within(cartao).getByText(/SaaS · Anápolis, GO · publicado hoje/)).toBeInTheDocument();
    expect(within(cartao).getByText('Médio')).toBeInTheDocument();
    expect(within(cartao).getByText('Remoto')).toBeInTheDocument();
    expect(within(cartao).getByText('A partir do 4º período')).toBeInTheDocument();
    // o feed mostra a vaga; o enunciado do desafio fica para a página do desafio
    expect(within(cartao).getByText('Apoio no desenvolvimento das APIs do produto.')).toBeInTheDocument();
    expect(within(cartao).queryByText('Construa uma API com JWT')).not.toBeInTheDocument();
    const esperadas = within(cartao).getByRole('list', { name: 'Tecnologias esperadas' });
    expect(within(esperadas).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Python', 'SQL']);
    // e o desafio aparece como o próximo passo
    expect(within(cartao).getByText('Desafio de seleção:')).toBeInTheDocument();
    expect(within(cartao).getByText('API REST')).toBeInTheDocument();
    expect(within(cartao).getByText(/12 participantes/)).toBeInTheDocument();
  });

  it('mostra o resumo da atividade no topo', async () => {
    renderComRotas(<FeedPage />);

    expect(await screen.findByText('Resumo da atividade')).toBeInTheDocument();
  });

  it('"Ver desafio" é um link para a página do desafio, sempre liberado', async () => {
    renderComRotas(<FeedPage />);

    const link = await screen.findByRole('link', { name: 'Ver desafio da vaga Estágio Back-end' });
    expect(link).toHaveAttribute('href', '/desafios/1');
  });

  it('desafio antigo (sem vaga e sem empresa) mostra o título e a descrição do desafio', async () => {
    renderComRotas(<FeedPage />);

    const cartao = (await screen.findByRole('heading', { name: 'Landing page' })).closest('article');
    expect(within(cartao).getByText('HTML e CSS')).toBeInTheDocument();
    expect(within(cartao).getByText('Empresa parceira')).toBeInTheDocument();
    expect(within(cartao).getByText('Participando')).toBeInTheDocument();
    expect(within(cartao).getByText(/1 participante$/)).toBeInTheDocument();
  });

  it('mostra o prazo quando o desafio tem um', async () => {
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const prazo = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`;
    mockarApi({ desafios: [{ ...DESAFIOS[0], prazo }] });
    renderComRotas(<FeedPage />);

    expect(await screen.findByText('Encerra amanhã')).toBeInTheDocument();
  });

  it('busca envia ?q= ao submeter', async () => {
    const user = userEvent.setup();
    renderComRotas(<FeedPage />);
    await screen.findByRole('heading', { name: 'Estágio Back-end' });

    await user.type(screen.getByLabelText('Buscar'), ' django ');
    await user.click(screen.getByRole('button', { name: /Buscar/ }));

    expect(api.get).toHaveBeenLastCalledWith('/projetos/', { params: { q: 'django' } });
  });

  it('busca, dificuldade e botão têm a mesma altura', async () => {
    renderComRotas(<FeedPage />);
    await screen.findByRole('heading', { name: 'Estágio Back-end' });

    expect(screen.getByLabelText('Buscar')).toHaveClass('h-12');
    expect(screen.getByLabelText('Dificuldade')).toHaveClass('h-12');
    expect(screen.getByRole('button', { name: /Buscar/ })).toHaveClass('h-12');
  });

  it('filtrar por dificuldade busca na hora, mantendo a busca aplicada', async () => {
    const user = userEvent.setup();
    renderComRotas(<FeedPage />);
    await screen.findByRole('heading', { name: 'Estágio Back-end' });

    await user.type(screen.getByLabelText('Buscar'), 'api');
    await user.click(screen.getByRole('button', { name: /Buscar/ }));
    await user.selectOptions(screen.getByLabelText('Dificuldade'), 'dificil');
    expect(api.get).toHaveBeenLastCalledWith('/projetos/', { params: { q: 'api', dificuldade: 'dificil' } });

    await user.selectOptions(screen.getByLabelText('Dificuldade'), '');
    expect(api.get).toHaveBeenLastCalledWith('/projetos/', { params: { q: 'api' } });
  });

  it('sem resultados com filtro, sugere mudar a busca', async () => {
    const user = userEvent.setup();
    renderComRotas(<FeedPage />);
    await screen.findByRole('heading', { name: 'Estágio Back-end' });

    mockarApi({ desafios: [] });
    await user.type(screen.getByLabelText('Buscar'), 'cobol');
    await user.click(screen.getByRole('button', { name: /Buscar/ }));

    expect(await screen.findByText('Nenhum desafio encontrado com esses filtros.')).toBeInTheDocument();
  });

  it('feed vazio sem filtro avisa que não há desafios publicados', async () => {
    mockarApi({ desafios: [] });
    renderComRotas(<FeedPage />);

    expect(await screen.findByText('Nenhum desafio publicado no momento.')).toBeInTheDocument();
  });

  it('mostra a faixa "Seus desafios" com links para cada um', async () => {
    mockarApi({ inscricoes: [{ id: 9, projeto: 2, projeto_titulo: 'Landing page', status: 'em_andamento' }] });
    renderComRotas(<FeedPage />);

    const faixa = await screen.findByRole('region', { name: /Seus desafios/ });
    expect(within(faixa).getByRole('link', { name: /Landing page/ })).toHaveAttribute('href', '/desafios/2');
  });

  it('mostra erro se o feed não carregar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockImplementation((url) => (url === '/inscricoes/' ? Promise.resolve({ data: [] }) : Promise.reject(new Error('offline'))));
    renderComRotas(<FeedPage />);

    expect(await screen.findByText('Não foi possível carregar os desafios.')).toBeInTheDocument();
  });
});
