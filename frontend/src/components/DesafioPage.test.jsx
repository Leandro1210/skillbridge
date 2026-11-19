import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import { renderComRotas } from '../test/renderComRotas';
import DesafioPage from './DesafioPage';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('./ProjectWorkspace', () => ({
  default: ({ projectId }) => <p>Área de participação do desafio {projectId}</p>,
}));

const DESAFIO = {
  id: 5,
  vaga_titulo: 'Estágio Back-end', vaga_modalidade: 'remoto',
  vaga_descricao: 'Apoio no desenvolvimento das APIs do produto.', vaga_tecnologias: 'Python, SQL',
  titulo: 'API REST', descricao: 'Construa uma API com JWT', ferramentas: 'Python, Django',
  dificuldade: 'intermediario', periodo_recomendado: 4, prazo: '2030-12-31', publicado_em: null,
  empresa: { id: 7, nome: 'TechBR', setor: 'Tecnologia', area_atuacao: '', cidade: '', logo_url: '' },
  participantes: 3, ja_participa: false, status: 'publicado', aceita_entregas: true,
  etapas: [{ id: 1 }],
};

function abrir(id = 5) {
  return renderComRotas(
    <Routes>
      <Route path="/desafios/:id" element={<DesafioPage />} />
    </Routes>,
    { rota: `/desafios/${id}` },
  );
}

beforeEach(() => {
  api.get.mockResolvedValue({ data: DESAFIO });
  api.post.mockResolvedValue({ data: {} });
});

describe('DesafioPage', () => {
  it('primeiro a vaga: empresa, título, modalidade, descrição e o que a empresa espera', async () => {
    abrir();

    const vaga = await screen.findByRole('region', { name: 'A vaga' });
    expect(api.get).toHaveBeenCalledWith('/projetos/5/');
    expect(within(vaga).getByRole('link', { name: 'TechBR' })).toHaveAttribute('href', '/empresas/7');
    expect(within(vaga).getByText('Tecnologia')).toBeInTheDocument(); // sem área de atuação, usa o setor
    expect(within(vaga).getByRole('heading', { name: 'Estágio Back-end' })).toBeInTheDocument();
    expect(within(vaga).getByText('Remoto')).toBeInTheDocument();
    expect(within(vaga).getByText('A partir do 4º período')).toBeInTheDocument();
    expect(within(vaga).getByText('Apoio no desenvolvimento das APIs do produto.')).toBeInTheDocument();
    const esperadas = within(vaga).getByRole('list', { name: 'Tecnologias esperadas' });
    expect(within(esperadas).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Python', 'SQL']);
  });

  it('depois o desafio: título, dificuldade, enunciado, ferramentas e informações', async () => {
    abrir();

    const desafio = await screen.findByRole('article', { name: 'API REST' });
    expect(within(desafio).getByText('Desafio de seleção')).toBeInTheDocument();
    expect(within(desafio).getByText('Intermediário')).toBeInTheDocument();
    expect(within(desafio).getByText('Construa uma API com JWT')).toBeInTheDocument();
    const ferramentas = within(desafio).getByRole('list', { name: 'Ferramentas do desafio' });
    expect(within(ferramentas).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Python', 'Django']);
    expect(within(desafio).getByText('31/12/2030')).toBeInTheDocument();
    expect(within(desafio).getByText('Etapas').nextSibling).toHaveTextContent('1');
  });

  it('desafio antigo, sem vaga cadastrada, mostra só a empresa no topo', async () => {
    api.get.mockResolvedValue({ data: { ...DESAFIO, vaga_titulo: '', vaga_descricao: '', vaga_tecnologias: '', vaga_modalidade: '' } });
    abrir();

    const vaga = await screen.findByRole('region', { name: 'A vaga' });
    expect(within(vaga).getByRole('link', { name: 'TechBR' })).toBeInTheDocument();
    expect(within(vaga).queryByRole('heading')).not.toBeInTheDocument();
  });

  it('quem não participa vê "Participar" e não vê a área de participação', async () => {
    abrir();

    expect(await screen.findByRole('button', { name: /Participar do desafio/ })).toBeInTheDocument();
    expect(screen.queryByText(/Área de participação/)).not.toBeInTheDocument();
  });

  it('participar inscreve o aluno e libera a área de participação', async () => {
    const user = userEvent.setup();
    abrir();

    await user.click(await screen.findByRole('button', { name: /Participar do desafio/ }));

    expect(api.post).toHaveBeenCalledWith('/projetos/5/iniciar/');
    expect(await screen.findByText('Área de participação do desafio 5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Participar/ })).not.toBeInTheDocument();
    expect(screen.getByText('Participantes').nextSibling).toHaveTextContent('4');
  });

  it('mostra o motivo se a API recusar a participação', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({ response: { data: { detail: 'Este desafio não está recebendo novas participações.' } } });
    abrir();

    await user.click(await screen.findByRole('button', { name: /Participar do desafio/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Este desafio não está recebendo novas participações.');
  });

  it('quem já participa vê direto a área de participação', async () => {
    api.get.mockResolvedValue({ data: { ...DESAFIO, ja_participa: true } });
    abrir();

    expect(await screen.findByText('Área de participação do desafio 5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Participar/ })).not.toBeInTheDocument();
  });

  it('desafio encerrado não oferece participação', async () => {
    api.get.mockResolvedValue({ data: { ...DESAFIO, status: 'encerrado', aceita_entregas: false } });
    abrir();

    expect(await screen.findByText('Encerrado')).toBeInTheDocument();
    expect(screen.getByText('Este desafio não está recebendo novas participações.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Participar/ })).not.toBeInTheDocument();
  });

  it('desafio inexistente (ou em rascunho) mostra "não encontrado" e link de volta', async () => {
    api.get.mockRejectedValue({ response: { status: 404 } });
    abrir(999);

    expect(await screen.findByText('Desafio não encontrado.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar às oportunidades/ })).toHaveAttribute('href', '/');
  });

  it('id que não é número (ex.: caminho forjado) não chama a API', async () => {
    abrir('..%2Fempresa%2Fdashboard');

    expect(await screen.findByText('Desafio não encontrado.')).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('outros erros mostram mensagem genérica', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValue(new Error('offline'));
    abrir();

    expect(await screen.findByText('Não foi possível carregar o desafio.')).toBeInTheDocument();
  });
});
