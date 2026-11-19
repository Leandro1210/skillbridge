import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import api from '../api';
import { intervaloDaSemana } from '../lib/atividade';
import { publicadoHa, textoPrazo } from '../lib/datas';
import { tituloDaVaga } from '../lib/vaga';
import Card from './ui/Card';
import Icon from './ui/Icon';
import Skeleton from './ui/Skeleton';
import EmpresaLogo from './ui/EmpresaLogo';
import Grafismo from './ui/Grafismo';
import { LinkButton } from './ui/Button';
import GraficoSolucoes from './GraficoSolucoes';

/**
 * Painel da empresa: o que pede ação (soluções aguardando avaliação) e como
 * estão os processos seletivos (números, soluções por semana e o funil de
 * cada vaga aberta).
 */
export default function CompanyDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/empresa/dashboard/')
      .then(({ data }) => setStats(data))
      .catch((err) => {
        console.error(err);
        setError('Erro ao carregar dashboard');
      });
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center text-error">
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8" aria-label="Carregando painel">
        <Skeleton className="h-36 rounded-[var(--radius-lg)]" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-28 rounded-[var(--radius-lg)]" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-[var(--radius-lg)] lg:col-span-2" />
          <Skeleton className="h-72 rounded-[var(--radius-lg)]" />
        </div>
      </section>
    );
  }

  const pendentes = stats.pendentes ?? [];
  const processos = stats.processos ?? [];
  const perfilPendente = stats.perfil_pendente ?? [];

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8 animate-[var(--animate-fade-in)]">
      <Cabecalho empresa={stats.empresa} pendentes={stats.submissoes_pendentes} />
      <Indicadores stats={stats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card as="section" padding="lg" className="flex flex-col lg:col-span-2" aria-labelledby="titulo-solucoes">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-solucoes" className="text-title-large text-on-surface">Soluções recebidas por semana</h2>
            <span className="text-body-small text-on-surface-variant">Últimas {stats.serie_semanal?.length ?? 12} semanas</span>
          </div>
          <div className="mb-6">
            <GraficoSolucoes serie={stats.serie_semanal} />
          </div>
          <ResumoDaSerie serie={stats.serie_semanal ?? []} />
        </Card>

        <FilaDeAvaliacao pendentes={pendentes} total={stats.submissoes_pendentes} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Processos processos={processos} rascunhos={stats.desafios_rascunho ?? 0} />
        <div className="space-y-6">
          <SituacaoDasSolucoes stats={stats} />
          {perfilPendente.length > 0 && <CompletarPerfil itens={perfilPendente} />}
        </div>
      </div>
    </section>
  );
}

function Cabecalho({ empresa, pendentes }) {
  const subtitulo = [empresa.area_atuacao || empresa.setor, empresa.cidade].filter(Boolean).join(' · ');
  let resumo = 'Nenhuma solução aguardando avaliação. Tudo em dia!';
  if (pendentes === 1) resumo = '1 solução aguardando a sua avaliação.';
  if (pendentes > 1) resumo = `${pendentes} soluções aguardando a sua avaliação.`;

  return (
    <div className="relative isolate overflow-hidden rounded-[var(--radius-xl)] bg-brand-navy p-6 text-white shadow-[var(--shadow-elevation-2)] sm:p-8 animate-[var(--animate-rise)]">
      {/* grafismo da marca: as faixas atravessam o canto direito */}
      <Grafismo variante="pontos" className="absolute right-6 top-1/2 -z-10 hidden h-[78%] -translate-y-1/2 md:block" />

      <div className="flex flex-col gap-6 md:max-w-[calc(100%-15rem)]">
        <div className="flex items-center gap-4">
          <EmpresaLogo empresa={empresa} tamanho="xl" className="ring-4 ring-white/15" />
          <div className="min-w-0">
            <p className="text-label-medium uppercase tracking-[0.16em] text-brand-green">Painel da empresa</p>
            <h1 className="text-headline-medium text-white wrap-anywhere">{empresa.nome}</h1>
            {subtitulo && <p className="text-body-medium text-white/70">{subtitulo}</p>}
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-body-medium text-white">
              <Icon name={pendentes > 0 ? 'hourglass_empty' : 'task_alt'} size="1.05rem" className={pendentes > 0 ? 'text-[#ffc56b]' : 'text-brand-green'} />
              {resumo}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton to="/empresa/desafios" variant="success">
            <Icon name="add" size="1.1rem" /> Novo desafio
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

/** Três números que resumem o gráfico: a semana atual, a média e a melhor semana. */
function ResumoDaSerie({ serie }) {
  if (serie.length === 0) return null;
  const total = serie.reduce((t, s) => t + s.total, 0);
  const media = total / serie.length;
  const melhor = serie.reduce((m, s) => (s.total > m.total ? s : m), serie[0]);
  const itens = [
    { rotulo: 'Esta semana', valor: serie.at(-1).total },
    { rotulo: 'Média por semana', valor: media.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) },
    { rotulo: 'Melhor semana', valor: melhor.total, detalhe: melhor.total > 0 ? intervaloDaSemana(melhor.inicio) : '' },
  ];
  return (
    <dl className="mt-auto grid grid-cols-3 gap-3 border-t border-outline-variant pt-4">
      {itens.map((item) => (
        <div key={item.rotulo}>
          <dt className="text-body-small text-on-surface-variant">{item.rotulo}</dt>
          <dd className="text-title-large text-on-surface" style={{ fontVariantNumeric: 'tabular-nums' }}>{item.valor}</dd>
          {item.detalhe && <dd className="text-body-small text-on-surface-variant">{item.detalhe}</dd>}
        </div>
      ))}
    </dl>
  );
}

function Indicadores({ stats }) {
  const avaliadas = stats.submissoes_aprovadas + stats.submissoes_reprovadas;
  const taxa = avaliadas > 0 ? `${Math.round((stats.submissoes_aprovadas / avaliadas) * 100)}%` : 'Sem dados';
  const detalhesDesafios = [
    stats.desafios_rascunho > 0 && `${stats.desafios_rascunho} ${stats.desafios_rascunho === 1 ? 'rascunho' : 'rascunhos'}`,
    stats.desafios_encerrados > 0 && `${stats.desafios_encerrados} ${stats.desafios_encerrados === 1 ? 'encerrado' : 'encerrados'}`,
  ].filter(Boolean).join(' · ');
  const recentes = stats.submissoes_ultimos_7_dias ?? 0;

  const tiles = [
    {
      rotulo: 'Desafios abertos', valor: stats.desafios_ativos, icone: 'work',
      detalhe: detalhesDesafios || `${stats.total_desafios} no total`,
    },
    {
      rotulo: 'Candidatos', valor: stats.estudantes_unicos, icone: 'groups',
      detalhe: 'alunos que enviaram solução',
    },
    {
      rotulo: 'Soluções recebidas', valor: stats.total_submissoes, icone: 'upload_file',
      detalhe: recentes > 0 ? `+${recentes} nos últimos 7 dias` : 'nenhuma nos últimos 7 dias',
      destaque: recentes > 0,
    },
    {
      rotulo: 'Taxa de aprovação', valor: taxa, icone: 'verified',
      detalhe: avaliadas > 0 ? `${stats.submissoes_aprovadas} de ${avaliadas} avaliadas` : 'nenhuma avaliada ainda',
    },
  ];

  return (
    <ul className="em-sequencia grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Indicadores">
      {tiles.map((tile) => (
        <li key={tile.rotulo}>
          <Card padding="md" hoverable className="h-full">
            <div className="flex items-center justify-between gap-2">
              <p className="text-label-large text-on-surface-variant">{tile.rotulo}</p>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-primary" aria-hidden="true">
                <Icon name={tile.icone} size="1.1rem" />
              </span>
            </div>
            <p className="mt-2 font-display text-headline-medium text-on-surface" style={{ fontVariantNumeric: 'tabular-nums' }}>{tile.valor}</p>
            <p className={clsx('mt-0.5 text-body-small', tile.destaque ? 'font-medium text-success' : 'text-on-surface-variant')}>
              {tile.detalhe}
            </p>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function FilaDeAvaliacao({ pendentes, total }) {
  return (
    <Card as="section" padding="lg" aria-labelledby="titulo-fila" className="flex flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="titulo-fila" className="text-title-large text-on-surface">Aguardando avaliação</h2>
        {total > 0 && (
          <span className="rounded-full bg-warning-container px-2.5 py-0.5 text-label-large text-on-warning-container">{total}</span>
        )}
      </div>

      {pendentes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-container text-on-success-container" aria-hidden="true">
            <Icon name="task_alt" size="1.5rem" />
          </span>
          <p className="text-title-small text-on-surface">Tudo avaliado</p>
          <p className="text-body-small text-on-surface-variant">As novas soluções aparecem aqui.</p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-body-small text-on-surface-variant">As mais antigas primeiro.</p>
          <ul className="em-sequencia -mx-2 flex-1 divide-y divide-outline-variant/60">
            {pendentes.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-2 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-label-large font-display text-white" aria-hidden="true">
                  {p.candidato.nome?.charAt(0)?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <Link to={`/alunos/${p.candidato.id}`} className="block text-body-large text-on-surface wrap-anywhere hover:text-primary hover:underline">
                    {p.candidato.nome}
                  </Link>
                  <p className="text-body-small text-on-surface-variant wrap-anywhere">{tituloDaVaga(p.desafio)}</p>
                </div>
                <span className="shrink-0 text-body-small text-on-surface-variant">{publicadoHa(p.entregue_em)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <LinkButton to="/empresa/submissoes" variant={total > 0 ? 'filled' : 'tonal'} className="mt-4 w-full">
        {total > 0 ? 'Avaliar soluções' : 'Ver todas as soluções'} <Icon name="arrow_forward" size="1.1rem" />
      </LinkButton>
    </Card>
  );
}

const ETAPAS_DO_FUNIL = [
  { chave: 'participantes', rotulo: 'Participantes' },
  { chave: 'submissoes', rotulo: 'Soluções' },
  { chave: 'aprovados', rotulo: 'Aprovados' },
];

function Processos({ processos, rascunhos }) {
  return (
    <Card as="section" padding="lg" className="lg:col-span-2" aria-labelledby="titulo-processos">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="titulo-processos" className="text-title-large text-on-surface">Processos abertos</h2>
          <p className="text-body-small text-on-surface-variant">Do interesse à aprovação, em cada vaga publicada.</p>
        </div>
        <Link to="/empresa/desafios" className="text-label-large text-primary hover:underline">Gerenciar desafios</Link>
      </div>

      {processos.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-outline-variant p-6 text-center">
          <p className="text-title-small text-on-surface">Nenhum processo aberto</p>
          <p className="mt-1 text-body-small text-on-surface-variant">
            {rascunhos > 0
              ? `Você tem ${rascunhos} ${rascunhos === 1 ? 'desafio em rascunho' : 'desafios em rascunho'}. Publique para aparecer no feed dos alunos.`
              : 'Crie uma vaga com um desafio para começar a receber candidatos.'}
          </p>
        </div>
      ) : (
        <ul className="em-sequencia space-y-4">
          {processos.map((p) => <Processo key={p.id} processo={p} />)}
        </ul>
      )}
    </Card>
  );
}

function Processo({ processo }) {
  const base = Math.max(processo.participantes, 1);
  const prazo = textoPrazo(processo.prazo);
  return (
    <li className="rounded-[var(--radius-lg)] border border-outline-variant p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-elevation-1)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-title-medium text-on-surface wrap-anywhere">{tituloDaVaga(processo)}</h3>
          {processo.vaga_titulo && <p className="text-body-small text-on-surface-variant">Desafio: {processo.titulo}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-body-small">
          {processo.pendentes > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-container px-2 py-0.5 text-on-warning-container">
              <Icon name="hourglass_empty" size="0.9rem" /> {processo.pendentes} para avaliar
            </span>
          )}
          {prazo && (
            <span className="inline-flex items-center gap-1 text-on-surface-variant">
              <Icon name="schedule" size="0.9rem" /> {prazo}
            </span>
          )}
        </div>
      </div>

      {/* funil: cada barra é proporcional aos participantes do processo */}
      <dl className="mt-3 space-y-1.5">
        {ETAPAS_DO_FUNIL.map(({ chave, rotulo }) => (
          <div key={chave} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3">
            <dt className="text-body-small text-on-surface-variant">{rotulo}</dt>
            <dd className="h-2.5 overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
              <div
                className="h-full origin-left rounded-full bg-primary"
                style={{ width: `${(processo[chave] / base) * 100}%`, animation: 'crescer 0.9s var(--ease-brand) 0.2s both' }}
              />
            </dd>
            <dd className="text-right text-label-large text-on-surface" style={{ fontVariantNumeric: 'tabular-nums' }}>{processo[chave]}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

const SITUACOES = [
  { chave: 'submissoes_pendentes', rotulo: 'Aguardando', icone: 'hourglass_empty', cor: 'bg-warning', texto: 'text-warning' },
  { chave: 'submissoes_aprovadas', rotulo: 'Aprovadas', icone: 'check_circle', cor: 'bg-success', texto: 'text-success' },
  { chave: 'submissoes_reprovadas', rotulo: 'Ajustes pedidos', icone: 'feedback', cor: 'bg-error', texto: 'text-error' },
];

function SituacaoDasSolucoes({ stats }) {
  const total = stats.total_submissoes;
  return (
    <Card as="section" padding="lg" aria-labelledby="titulo-situacao">
      <h2 id="titulo-situacao" className="text-title-large text-on-surface">Situação das soluções</h2>
      <p className="text-body-small text-on-surface-variant">{total} no total</p>

      {total > 0 && (
        <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
          {SITUACOES.filter((s) => stats[s.chave] > 0).map((s) => (
            <div key={s.chave} className={clsx('h-full', s.cor)} style={{ flexGrow: stats[s.chave] }} />
          ))}
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {SITUACOES.map((s) => (
          <li key={s.chave} className="flex items-center justify-between gap-3 text-body-medium">
            <span className="inline-flex items-center gap-2 text-on-surface">
              <Icon name={s.icone} size="1.1rem" className={s.texto} /> {s.rotulo}
            </span>
            <span className="text-label-large text-on-surface" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {stats[s.chave]}
              {total > 0 && <span className="ml-1.5 font-normal text-on-surface-variant">({Math.round((stats[s.chave] / total) * 100)}%)</span>}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CompletarPerfil({ itens }) {
  return (
    <Card as="section" padding="lg" aria-labelledby="titulo-perfil" className="border border-dashed border-primary/40">
      <h2 id="titulo-perfil" className="flex items-center gap-2 text-title-medium text-on-surface">
        <Icon name="edit" size="1.1rem" className="text-primary" /> Complete o perfil da empresa
      </h2>
      <p className="mt-1 text-body-small text-on-surface-variant">Os alunos veem seu perfil antes de participar. Falta:</p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {itens.map((item) => (
          <li key={item} className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-label-medium text-on-surface-variant">{item}</li>
        ))}
      </ul>
      <LinkButton to="/empresa/perfil" variant="text" size="sm" className="mt-3 -ml-3">
        Editar perfil <Icon name="arrow_forward" size="1rem" />
      </LinkButton>
    </Card>
  );
}
