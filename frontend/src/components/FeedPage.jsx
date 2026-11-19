import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { DIFF_LABELS, DIFFICULTY_TONE } from '../lib/difficulty';
import { publicadoHa, textoPrazo } from '../lib/datas';
import { listaDeTecnologias } from '../lib/perfil';
import { MODALIDADES, tituloDaVaga } from '../lib/vaga';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { LinkButton } from './ui/Button';
import Icon from './ui/Icon';
import Skeleton from './ui/Skeleton';
import PageHeader from './ui/PageHeader';
import { Input, Select } from './ui/Input';
import AtividadeResumo from './AtividadeResumo';
import EmpresaLogo from './ui/EmpresaLogo';

/**
 * Página inicial do aluno: feed de desafios publicados pelas empresas, do
 * mais recente para o mais antigo. Todos os desafios ficam abertos — quem
 * avalia se o aluno está apto é a empresa, ao analisar a entrega.
 */
export default function FeedPage() {
  const [desafios, setDesafios] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busca, setBusca] = useState('');
  const [dificuldade, setDificuldade] = useState('');
  const [filtros, setFiltros] = useState({}); // filtros aplicados (busca só vale ao enviar)

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/projetos/', { params: filtros });
        if (cancelado) return;
        setDesafios(data.results ?? data);
        setError('');
      } catch (err) {
        if (cancelado) return;
        console.error(err);
        setError('Não foi possível carregar os desafios.');
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [filtros]);

  useEffect(() => {
    api.get('/inscricoes/')
      .then(({ data }) => setInscricoes(data.results ?? data))
      .catch(() => setInscricoes([])); // a faixa "seus desafios" é opcional
  }, []);

  const aplicarFiltros = (e) => {
    e.preventDefault();
    const novos = {};
    if (busca.trim()) novos.q = busca.trim();
    if (dificuldade) novos.dificuldade = dificuldade;
    setFiltros(novos);
  };

  const filtrando = Object.keys(filtros).length > 0;

  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 animate-[var(--animate-fade-in)]">
      <PageHeader
        title="Oportunidades"
        description="Vagas reais de empresas, cada uma com um desafio para você mostrar o que sabe fazer."
      />

      <AtividadeResumo />

      {inscricoes.length > 0 && <SeusDesafios inscricoes={inscricoes} />}

      <form onSubmit={aplicarFiltros} role="search" className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Buscar"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Vaga, desafio ou tecnologia"
            className="h-12"
          />
        </div>
        <div className="sm:w-44">
          <Select
            label="Dificuldade"
            className="h-12"
            value={dificuldade}
            onChange={(e) => {
              setDificuldade(e.target.value);
              setFiltros((atuais) => {
                const novos = { ...atuais };
                if (e.target.value) novos.dificuldade = e.target.value;
                else delete novos.dificuldade;
                return novos;
              });
            }}
          >
            <option value="">Todas</option>
            {Object.entries(DIFF_LABELS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </Select>
        </div>
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-1.5 rounded-[var(--radius-full)] border border-outline px-5 text-label-large text-on-surface transition-colors hover:bg-on-surface/5"
        >
          <Icon name="search" size="1.1rem" /> Buscar
        </button>
      </form>

      {loading && (
        <div className="space-y-4" aria-label="Carregando desafios">
          <Skeleton className="h-52 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-52 rounded-[var(--radius-lg)]" />
        </div>
      )}

      {!loading && error && (
        <Card variant="outlined" padding="md" className="border-error/40 bg-error-container/20">
          <p className="font-medium text-error">{error}</p>
        </Card>
      )}

      {!loading && !error && desafios.length === 0 && (
        <Card variant="outlined" padding="lg" className="text-center">
          <Icon name="explore" size="2.5rem" className="mx-auto mb-3 text-on-surface-variant/50" />
          <p className="font-medium text-on-surface-variant">
            {filtrando ? 'Nenhum desafio encontrado com esses filtros.' : 'Nenhum desafio publicado no momento.'}
          </p>
          <p className="mt-1 text-body-small text-on-surface-variant/70">
            {filtrando ? 'Tente outra busca ou limpe os filtros.' : 'Volte em breve: novas empresas publicam desafios toda semana.'}
          </p>
        </Card>
      )}

      {!loading && !error && desafios.length > 0 && (
        <ol className="space-y-4" aria-label="Desafios publicados">
          {desafios.map((desafio) => (
            <li key={desafio.id}>
              <CartaoDesafio desafio={desafio} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CartaoDesafio({ desafio }) {
  const empresa = desafio.empresa;
  const vaga = tituloDaVaga(desafio);
  const tecnologias = listaDeTecnologias(desafio.vaga_tecnologias || desafio.ferramentas);
  const prazo = textoPrazo(desafio.prazo);

  return (
    <Card as="article" padding="md" className="flex flex-col gap-4">
      <header className="flex items-start gap-3">
        <EmpresaLogo empresa={empresa} />
        <div className="min-w-0 flex-1">
          {empresa ? (
            <Link to={`/empresas/${empresa.id}`} className="block truncate text-title-small text-on-surface hover:underline">
              {empresa.nome}
            </Link>
          ) : (
            <p className="truncate text-title-small text-on-surface">Empresa parceira</p>
          )}
          <p className="truncate text-body-small text-on-surface-variant">
            {[empresa?.area_atuacao || empresa?.setor, empresa?.cidade, desafio.publicado_em && `publicado ${publicadoHa(desafio.publicado_em)}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {desafio.ja_participa && <Badge tone="accent">Participando</Badge>}
      </header>

      <div>
        <h2 className="text-title-large text-on-surface">{vaga}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {desafio.vaga_modalidade && (
            <Badge tone="neutral">
              <Icon name="work" size="0.95rem" /> {MODALIDADES[desafio.vaga_modalidade] ?? desafio.vaga_modalidade}
            </Badge>
          )}
          {desafio.periodo_recomendado && (
            <Badge tone="neutral">A partir do {desafio.periodo_recomendado}º período</Badge>
          )}
        </div>
        <p className="mt-3 line-clamp-3 text-body-medium leading-relaxed text-on-surface-variant">
          {desafio.vaga_descricao || desafio.descricao}
        </p>
      </div>

      {tecnologias.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-label-medium text-on-surface-variant">O que a empresa espera que você saiba</h3>
          <ul className="flex flex-wrap gap-1.5" aria-label="Tecnologias esperadas">
            {tecnologias.map((t) => (
              <li key={t} className="rounded-[var(--radius-xs)] bg-surface-container-highest px-2 py-1 text-body-small text-on-surface">
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* o desafio: o próximo passo para se candidatar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-md)] bg-surface-container-low px-4 py-3">
        <Icon name="code_blocks" size="1.1rem" className="text-primary" />
        <span className="text-body-small text-on-surface-variant">Desafio de seleção:</span>
        <span className="text-label-large text-on-surface">{desafio.titulo}</span>
        <Badge tone={DIFFICULTY_TONE[desafio.dificuldade] ?? 'warning'} dot>
          {DIFF_LABELS[desafio.dificuldade] ?? 'Médio'}
        </Badge>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-4">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-small text-on-surface-variant">
          <span className="inline-flex items-center gap-1">
            <Icon name="groups" size="1rem" />
            {desafio.participantes} {desafio.participantes === 1 ? 'participante' : 'participantes'}
          </span>
          {prazo && (
            <span className="inline-flex items-center gap-1">
              <Icon name="event" size="1rem" /> {prazo}
            </span>
          )}
        </p>
        <LinkButton to={`/desafios/${desafio.id}`} size="sm" aria-label={`Ver desafio da vaga ${vaga}`}>
          Ver desafio <Icon name="arrow_forward" size="1rem" />
        </LinkButton>
      </footer>
    </Card>
  );
}

function SeusDesafios({ inscricoes }) {
  return (
    <section aria-labelledby="seus-desafios" className="mb-8">
      <h2 id="seus-desafios" className="mb-3 flex items-center gap-2 text-title-medium text-on-surface">
        <Icon name="checklist" className="text-primary" /> Seus desafios
      </h2>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {inscricoes.map((insc) => (
          <li key={insc.id} className="shrink-0">
            <Link
              to={`/desafios/${insc.projeto}`}
              className="flex max-w-60 flex-col rounded-[var(--radius-md)] border border-outline-variant bg-surface-container-lowest px-4 py-3 transition-colors hover:border-outline"
            >
              <span className="truncate text-label-large text-on-surface">{insc.projeto_titulo}</span>
              <span className="text-body-small text-on-surface-variant">
                {insc.status === 'concluido' ? 'Concluído' : 'Em andamento'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
