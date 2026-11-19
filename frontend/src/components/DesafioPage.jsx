import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { DIFF_LABELS, DIFFICULTY_TONE } from '../lib/difficulty';
import { dataCurta, publicadoHa, textoPrazo } from '../lib/datas';
import { listaDeTecnologias } from '../lib/perfil';
import { MODALIDADES, tituloDaVaga } from '../lib/vaga';
import { idDaRota } from '../lib/rotas';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Icon from './ui/Icon';
import Spinner from './ui/Spinner';
import EmpresaLogo from './ui/EmpresaLogo';
import ProjectWorkspace from './ProjectWorkspace';

/**
 * Página de um processo seletivo (/desafios/:id): primeiro a vaga (contexto:
 * o que a empresa oferece e espera), depois o desafio (o que o aluno resolve
 * para mostrar que sabe). Quem já participa vê também a área de envio.
 */
export default function DesafioPage() {
  const id = idDaRota(useParams().id);
  const [desafio, setDesafio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [error, setError] = useState('');
  const [participando, setParticipando] = useState(false);
  const [erroParticipar, setErroParticipar] = useState('');

  const carregar = useCallback(async () => {
    if (id === null) {
      setNaoEncontrado(true);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.get(`/projetos/${id}/`);
      setDesafio(data);
      setError('');
      setNaoEncontrado(false);
    } catch (err) {
      if (err.response?.status === 404) setNaoEncontrado(true);
      else {
        console.error(err);
        setError('Não foi possível carregar o desafio.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const participar = async () => {
    setParticipando(true);
    setErroParticipar('');
    try {
      await api.post(`/projetos/${id}/iniciar/`);
      setDesafio((atual) => ({ ...atual, ja_participa: true, participantes: atual.participantes + 1 }));
    } catch (err) {
      setErroParticipar(err.response?.data?.detail ?? 'Não foi possível participar deste desafio.');
    } finally {
      setParticipando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (naoEncontrado || error) {
    return (
      <section className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <Card variant="outlined" padding="lg">
          <p className="font-medium text-on-surface">
            {naoEncontrado ? 'Desafio não encontrado.' : error}
          </p>
          {naoEncontrado && (
            <p className="mt-1 text-body-small text-on-surface-variant">Ele pode ter sido removido ou ainda não foi publicado.</p>
          )}
          <Link to="/" className="mt-4 inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <Icon name="arrow_back" size="1rem" /> Voltar às oportunidades
          </Link>
        </Card>
      </section>
    );
  }

  const empresa = desafio.empresa;
  const tecnologiasVaga = listaDeTecnologias(desafio.vaga_tecnologias);
  const ferramentas = listaDeTecnologias(desafio.ferramentas);
  const prazo = textoPrazo(desafio.prazo);
  const temVaga = Boolean(desafio.vaga_titulo);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8 animate-[var(--animate-fade-in)]">
      <Link to="/" className="inline-flex items-center gap-1 text-body-medium font-medium text-on-surface-variant hover:text-on-surface">
        <Icon name="arrow_back" size="1rem" /> Voltar às oportunidades
      </Link>

      {/* A vaga: contexto do desafio */}
      <Card as="section" padding="lg" aria-label="A vaga">
        <div className="flex items-start gap-3">
          <EmpresaLogo empresa={empresa} tamanho="lg" />
          <div className="min-w-0">
            {empresa ? (
              <Link to={`/empresas/${empresa.id}`} className="text-title-medium text-on-surface hover:underline">{empresa.nome}</Link>
            ) : (
              <p className="text-title-medium text-on-surface">Empresa parceira</p>
            )}
            <p className="text-body-small text-on-surface-variant">
              {[empresa?.area_atuacao || empresa?.setor, empresa?.cidade, desafio.publicado_em && `publicado ${publicadoHa(desafio.publicado_em)}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>

        {temVaga && (
          <>
            <p className="mt-5 text-label-medium uppercase tracking-wide text-on-surface-variant">A vaga</p>
            <h2 className="mt-1 text-headline-small text-on-surface">{tituloDaVaga(desafio)}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {desafio.vaga_modalidade && (
                <Badge tone="neutral"><Icon name="work" size="0.95rem" /> {MODALIDADES[desafio.vaga_modalidade] ?? desafio.vaga_modalidade}</Badge>
              )}
              {desafio.periodo_recomendado && <Badge tone="neutral">A partir do {desafio.periodo_recomendado}º período</Badge>}
            </div>
            {desafio.vaga_descricao && (
              <p className="mt-4 whitespace-pre-wrap text-body-large leading-relaxed text-on-surface-variant">{desafio.vaga_descricao}</p>
            )}
            {tecnologiasVaga.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-1.5 text-label-medium text-on-surface-variant">O que a empresa espera que você saiba</h3>
                <ul className="flex flex-wrap gap-1.5" aria-label="Tecnologias esperadas">
                  {tecnologiasVaga.map((t) => (
                    <li key={t} className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-body-small font-medium text-on-surface">{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Card>

      {/* O desafio: o que o aluno resolve */}
      <Card as="article" padding="lg" aria-labelledby="titulo-desafio">
        <p className="flex items-center gap-1.5 text-label-medium uppercase tracking-wide text-primary">
          <Icon name="code_blocks" size="1rem" /> Desafio de seleção
        </p>
        <h1 id="titulo-desafio" className="mt-1 text-headline-medium text-on-surface">{desafio.titulo}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={DIFFICULTY_TONE[desafio.dificuldade] ?? 'warning'} dot>
            {DIFF_LABELS[desafio.dificuldade] ?? 'Intermediário'}
          </Badge>
          {desafio.status === 'encerrado' && <Badge tone="error">Encerrado</Badge>}
        </div>

        <p className="mt-5 whitespace-pre-wrap text-body-large leading-relaxed text-on-surface-variant">{desafio.descricao}</p>

        {ferramentas.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2 text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">Ferramentas do desafio</h2>
            <ul className="flex flex-wrap gap-2" aria-label="Ferramentas do desafio">
              {ferramentas.map((f) => (
                <li key={f} className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-body-small font-medium text-on-surface">{f}</li>
              ))}
            </ul>
          </div>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-outline-variant pt-5 sm:grid-cols-3">
          <Info rotulo="Participantes" valor={desafio.participantes} />
          <Info rotulo="Etapas" valor={desafio.etapas?.length ?? 0} />
          <Info
            rotulo="Prazo"
            valor={desafio.prazo ? dataCurta(desafio.prazo) : 'Sem prazo'}
            detalhe={prazo && prazo !== 'Prazo encerrado' ? prazo : ''}
          />
        </dl>

        {!desafio.ja_participa && (
          <div className="mt-6 border-t border-outline-variant pt-6">
            {erroParticipar && (
              <p role="alert" className="mb-4 rounded-[var(--radius-sm)] border border-error/30 bg-error-container/30 px-4 py-3 text-body-small text-error">
                {erroParticipar}
              </p>
            )}
            {desafio.aceita_entregas ? (
              <Button onClick={participar} disabled={participando}>
                {participando ? <Spinner size="sm" /> : <Icon name="rocket_launch" size="1.1rem" />}
                Participar do desafio
              </Button>
            ) : (
              <p className="text-body-medium text-on-surface-variant">Este desafio não está recebendo novas participações.</p>
            )}
          </div>
        )}
      </Card>

      {desafio.ja_participa && <ProjectWorkspace projectId={desafio.id} />}
    </div>
  );
}

function Info({ rotulo, valor, detalhe }) {
  return (
    <div>
      <dt className="text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">{rotulo}</dt>
      <dd className="mt-1 text-title-medium text-on-surface">{valor}</dd>
      {detalhe && <dd className="text-body-small text-on-surface-variant">{detalhe}</dd>}
    </div>
  );
}
