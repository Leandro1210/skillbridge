import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { nomeTemporada } from '../lib/atividade';
import { idDaRota } from '../lib/rotas';
import { TIPOS_PUBLICACAO, listaDeTecnologias } from '../lib/perfil';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { LinkButton } from './ui/Button';
import Icon from './ui/Icon';
import Skeleton from './ui/Skeleton';
import GraficoAtividade from './GraficoAtividade';
import Grafismo from './ui/Grafismo';
import ListaCertificados from './ListaCertificados';

/**
 * Perfil acadêmico do aluno. Uma página para dois públicos:
 * - /perfil: o próprio aluno (vê sempre a atividade e tem o botão Editar);
 * - /alunos/:id: a empresa avaliando um candidato (a atividade só aparece se
 *   o aluno permitiu — a API nem envia o campo quando não permitiu).
 *
 * O histórico de desafios mostra só a participação, nunca o resultado; as
 * aprovações aparecem apenas como uma contagem geral (o selo).
 */
export default function PerfilAlunoPage({ alunoId }) {
  const params = useParams();
  const id = idDaRota(alunoId ?? params.id);
  const [aluno, setAluno] = useState(null);
  const [erroDaApi, setErro] = useState('');
  const erro = id === null ? 'Perfil não encontrado.' : erroDaApi;

  useEffect(() => {
    if (id === null) return undefined;
    let cancelado = false;
    api.get(`/alunos/${id}/`)
      .then(({ data }) => {
        if (!cancelado) setAluno(data);
      })
      .catch((err) => {
        if (cancelado) return;
        const status = err.response?.status;
        setErro(status === 404 || status === 403 ? 'Perfil não encontrado.' : 'Não foi possível carregar o perfil.');
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  if (erro) {
    return (
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Card variant="outlined" padding="lg" className="text-center">
          <p className="font-medium text-on-surface">{erro}</p>
        </Card>
      </section>
    );
  }

  if (!aluno) {
    return (
      <section className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8" aria-label="Carregando perfil">
        <Skeleton className="h-44 rounded-[var(--radius-lg)]" />
        <Skeleton className="h-64 rounded-[var(--radius-lg)]" />
      </section>
    );
  }

  const { perfil } = aluno;
  const formacao = [perfil.curso, perfil.instituicao_ensino, perfil.periodo_atual && `${perfil.periodo_atual}º período`]
    .filter(Boolean)
    .join(' · ');
  const tecnologias = listaDeTecnologias(perfil.tecnologias);
  const links = [
    { url: perfil.github_url, rotulo: 'GitHub' },
    { url: perfil.linkedin_url, rotulo: 'LinkedIn' },
    { url: perfil.portfolio_url, rotulo: 'Portfólio' },
  ].filter((l) => l.url);

  return (
    <section className="em-sequencia mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Cabeçalho: capa Azul Bridge com as faixas e o avatar sobreposto */}
      <Card padding="none" className="overflow-hidden">
        <div className="relative isolate h-28 overflow-hidden bg-brand-blue sm:h-32">
          <Grafismo variante="pessoas" tom="azul" className="absolute right-6 top-1/2 -z-10 h-[82%] -translate-y-1/2" />
        </div>
        <div className="flex flex-col gap-5 px-6 pb-7 sm:flex-row sm:items-start sm:px-8">
          <div
            aria-hidden="true"
            className="relative z-10 -mt-12 flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary font-display text-headline-medium text-white shadow-[var(--shadow-brand)] ring-[5px] ring-surface-container-lowest"
          >
            {iniciais(aluno.nome)}
          </div>
          <div className="min-w-0 flex-1 sm:pt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-headline-medium text-on-surface wrap-anywhere">{aluno.nome}</h1>
                {perfil.titulo && <p className="mt-0.5 text-title-medium text-primary">{perfil.titulo}</p>}
              </div>
              {aluno.proprio && (
                <LinkButton to="/perfil/editar" variant="outlined" size="sm">
                  <Icon name="edit" size="1rem" /> Editar perfil
                </LinkButton>
              )}
            </div>
            {formacao && (
              <p className="mt-2 flex items-center gap-1.5 text-body-medium text-on-surface-variant">
                <Icon name="school" size="1rem" /> {formacao}
              </p>
            )}
            {perfil.estudando_atualmente && (
              <p className="mt-1 text-body-medium text-on-surface-variant">
                <span className="font-medium text-on-surface">Estudando agora:</span> {perfil.estudando_atualmente}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {aluno.aprovacoes > 0 && (
                <Badge tone="success" className="py-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-white"><Icon name="check" size="0.75rem" /></span>
                  {aluno.aprovacoes} {aluno.aprovacoes === 1 ? 'aprovação' : 'aprovações'} em desafios
                </Badge>
              )}
              {links.map((l) => (
                <a
                  key={l.rotulo}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-3 py-1 text-label-medium text-on-surface transition-colors hover:border-primary/40 hover:bg-primary-container hover:text-primary"
                >
                  {l.rotulo} <Icon name="open_in_new" size="0.85rem" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {(perfil.bio || tecnologias.length > 0) && (
          <div className="border-t border-outline-variant/70 px-6 py-6 sm:px-8">
            {perfil.bio && <p className="whitespace-pre-wrap leading-relaxed text-on-surface-variant">{perfil.bio}</p>}
            {tecnologias.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5 first:mt-0" aria-label="Tecnologias">
                {tecnologias.map((t) => (
                  <li key={t} className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-body-small font-medium text-on-surface">{t}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {/* Atividade do semestre (sempre para o próprio aluno; para a empresa, só se permitido) */}
      {aluno.atividade && <SecaoAtividade atividade={aluno.atividade} proprio={aluno.proprio} visivel={perfil.mostrar_atividade} />}

      <Secao titulo="Projetos" icone="code_blocks" vazio={aluno.proprio ? 'Adicione os projetos das suas disciplinas, com o link do repositório.' : 'Nenhum projeto adicionado.'}>
        {aluno.projetos.length > 0 && (
          <ul className="space-y-3">
            {aluno.projetos.map((p) => (
              <li key={p.id} className={ITEM}>
                <span aria-hidden="true" className="w-1 shrink-0 self-stretch rounded-full bg-brand-blue" />
                <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-title-medium text-on-surface">{p.titulo}</h3>
                  {p.destaque && <Badge tone="accent">Destaque</Badge>}
                </div>
                <p className="mt-0.5 text-body-small text-on-surface-variant">
                  {[p.disciplina, p.periodo && `${p.periodo}º período`, p.tecnologias].filter(Boolean).join(' · ')}
                </p>
                {p.descricao && <p className="mt-2 text-body-medium text-on-surface-variant">{p.descricao}</p>}
                <a href={p.repo_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-body-small font-medium text-primary hover:underline">
                  <Icon name="link" size="0.9rem" /> Ver repositório
                </a>
                </div>
                <span className="shrink-0 text-body-small text-on-surface-variant">Projeto</span>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao titulo="Produção científica" icone="article" vazio={aluno.proprio ? 'Artigos, resumos em eventos, TCC e iniciação científica aparecem aqui.' : 'Nenhuma publicação adicionada.'}>
        {aluno.publicacoes.length > 0 && (
          <ul className="space-y-3">
            {aluno.publicacoes.map((p) => (
              <li key={p.id} className={ITEM}>
                <span aria-hidden="true" className="w-1 shrink-0 self-stretch rounded-full bg-brand-green" />
                <div className="min-w-0 flex-1">
                <h3 className="text-title-medium text-on-surface">{p.titulo}</h3>
                <p className="mt-0.5 text-body-small text-on-surface-variant">
                  {[TIPOS_PUBLICACAO[p.tipo] ?? p.tipo, p.veiculo, p.ano].filter(Boolean).join(' · ')}
                </p>
                {p.coautores && <p className="text-body-small text-on-surface-variant">Coautores: {p.coautores}</p>}
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-body-small font-medium text-primary hover:underline">
                  <Icon name="open_in_new" size="0.9rem" /> Acessar publicação
                </a>
                </div>
                <span className="shrink-0 text-body-small text-on-surface-variant">{TIPOS_PUBLICACAO[p.tipo] ?? 'Artigo'}</span>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      {(perfil.certificados || aluno.proprio) && (
        <Secao titulo="Certificados" icone="workspace_premium" vazio={'Conte quais cursos e certificações você já concluiu em "Editar perfil".'}>
          {perfil.certificados && <ListaCertificados texto={perfil.certificados} />}
        </Secao>
      )}

      <Secao titulo="Participações em desafios" icone="history" vazio="Nenhuma participação ainda.">
        {aluno.historico.length > 0 && (
          <ul className="space-y-3">
            {aluno.historico.map((h) => (
              <li key={h.desafio.id} className={ITEM}>
                <span aria-hidden="true" className="w-1 shrink-0 self-stretch rounded-full bg-brand-navy" />
                <div className="min-w-0 flex-1">
                  <p className="text-body-large text-on-surface">{h.desafio.titulo}</p>
                  <p className="text-body-small text-on-surface-variant">{h.empresa?.nome ?? 'Empresa parceira'}</p>
                </div>
                <span className="shrink-0 text-body-small text-on-surface-variant">
                  Participou em {new Date(h.participou_em).toLocaleDateString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </section>
  );
}

// linha de item no estilo do manual: fundo névoa, barra colorida à esquerda
const ITEM = 'flex flex-wrap items-start gap-x-4 gap-y-1 rounded-[var(--radius-md)] bg-surface-container-low px-4 py-3.5 transition-colors hover:bg-surface-container';

/** Iniciais do nome (até duas letras), como o avatar "NE" do manual. */
function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const ultima = partes.length > 1 ? partes.at(-1)[0] : '';
  return (partes[0][0] + ultima).toUpperCase();
}

function Secao({ titulo, icone, vazio, children }) {
  return (
    <Card as="section" padding="lg" aria-label={titulo}>
      <h2 className="mb-4 flex items-center gap-2.5 text-title-large text-on-surface">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-primary"><Icon name={icone} size="1.15rem" /></span>
        {titulo}
      </h2>
      {children || <p className="text-body-medium text-on-surface-variant">{vazio}</p>}
    </Card>
  );
}

function SecaoAtividade({ atividade, proprio, visivel }) {
  return (
    <Card as="section" padding="lg" aria-label="Atividade no semestre">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-title-large text-on-surface">
            <Icon name="bar_chart" className="text-primary" /> Atividade no semestre
          </h2>
          <p className="text-body-small text-on-surface-variant">{nomeTemporada(atividade.temporada)}</p>
        </div>
        <Badge tone="accent">{atividade.nivel}</Badge>
      </div>
      <p className="mt-3 font-display text-headline-medium text-on-surface">{atividade.xp} <span className="text-title-medium text-on-surface-variant">XP</span></p>
      {proprio && (
        <p className="mt-1 flex items-center gap-1.5 text-body-small text-on-surface-variant">
          <Icon name={visivel ? 'visibility' : 'visibility_off'} size="1rem" />
          {visivel ? 'Visível para as empresas.' : 'Só você vê. Você pode mostrar para as empresas em "Editar perfil".'}
        </p>
      )}
      <div className="mt-4">
        <GraficoAtividade serie={atividade.serie_semanal} />
      </div>
      {atividade.temporadas_anteriores.length > 0 && (
        <p className="mt-3 text-body-small text-on-surface-variant">
          Temporadas anteriores:{' '}
          {atividade.temporadas_anteriores.map((t) => `${nomeTemporada(t.temporada)} (${t.xp} XP · ${t.nivel})`).join('; ')}
        </p>
      )}
    </Card>
  );
}
