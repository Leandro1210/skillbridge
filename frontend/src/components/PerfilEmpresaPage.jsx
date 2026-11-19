import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { DIFF_LABELS, DIFFICULTY_TONE } from '../lib/difficulty';
import { listaDeTecnologias } from '../lib/perfil';
import { tituloDaVaga } from '../lib/vaga';
import { publicadoHa, textoPrazo } from '../lib/datas';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { LinkButton } from './ui/Button';
import Icon from './ui/Icon';
import Skeleton from './ui/Skeleton';
import EmpresaLogo from './ui/EmpresaLogo';

/**
 * Perfil público da empresa (/empresas/:id): quem ela é, como falar com ela e
 * o histórico dos desafios que já publicou — os ativos e os encerrados
 * ficam evidentes, com quantos alunos participaram de cada um.
 *
 * `linkParaDesafios`: o aluno abre a página de cada desafio; a empresa (que
 * não tem essa página) só vê a lista.
 */
export default function PerfilEmpresaPage({ linkParaDesafios = false }) {
  const { id } = useParams();
  const [empresa, setEmpresa] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelado = false;
    api.get(`/empresas/${id}/`)
      .then(({ data }) => {
        if (!cancelado) setEmpresa(data);
      })
      .catch((err) => {
        if (!cancelado) setErro(err.response?.status === 404 ? 'Empresa não encontrada.' : 'Não foi possível carregar o perfil da empresa.');
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  if (erro) {
    return (
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Card variant="outlined" padding="lg" className="text-center"><p className="font-medium text-on-surface">{erro}</p></Card>
      </section>
    );
  }

  if (!empresa) {
    return (
      <section className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8" aria-label="Carregando perfil da empresa">
        <Skeleton className="h-48 rounded-[var(--radius-lg)]" />
        <Skeleton className="h-64 rounded-[var(--radius-lg)]" />
      </section>
    );
  }

  const tecnologias = listaDeTecnologias(empresa.tecnologias);
  const subtitulo = [empresa.area_atuacao || empresa.setor, empresa.cidade].filter(Boolean).join(' · ');
  const contatos = [
    empresa.website && { href: empresa.website, rotulo: 'Site', icone: 'language' },
    empresa.email_contato && { href: `mailto:${empresa.email_contato}`, rotulo: empresa.email_contato, icone: 'mail' },
    empresa.telefone && { href: `tel:${empresa.telefone.replace(/[^\d+]/g, '')}`, rotulo: empresa.telefone, icone: 'call' },
    empresa.linkedin_url && { href: empresa.linkedin_url, rotulo: 'LinkedIn', icone: 'open_in_new' },
    empresa.instagram_url && { href: empresa.instagram_url, rotulo: 'Instagram', icone: 'open_in_new' },
    empresa.github_url && { href: empresa.github_url, rotulo: 'GitHub', icone: 'open_in_new' },
  ].filter(Boolean);
  const { numeros } = empresa;
  const abertos = empresa.desafios.filter((d) => d.aceita_entregas);
  const encerrados = empresa.desafios.filter((d) => !d.aceita_entregas);

  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8 animate-[var(--animate-fade-in)]">
      <Card padding="lg">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <EmpresaLogo empresa={empresa} tamanho="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-headline-medium text-on-surface">{empresa.nome}</h1>
                {subtitulo && <p className="mt-0.5 flex items-center gap-1.5 text-body-large text-on-surface-variant"><Icon name="location_on" size="1rem" /> {subtitulo}</p>}
              </div>
              {empresa.propria && (
                <LinkButton to="/empresa/perfil" variant="outlined" size="sm">
                  <Icon name="edit" size="1rem" /> Editar perfil
                </LinkButton>
              )}
            </div>
            {contatos.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Contato e redes">
                {contatos.map((c) => (
                  <li key={c.rotulo}>
                    <a
                      href={c.href}
                      target={c.href.startsWith('http') ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] border border-outline-variant px-2.5 py-1 text-label-medium text-on-surface hover:bg-on-surface/5"
                    >
                      <Icon name={c.icone} size="0.9rem" /> {c.rotulo}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {empresa.descricao && <p className="mt-5 whitespace-pre-wrap leading-relaxed text-on-surface-variant">{empresa.descricao}</p>}
        {empresa.descricao_adicional && <p className="mt-3 whitespace-pre-wrap leading-relaxed text-on-surface-variant">{empresa.descricao_adicional}</p>}

        {tecnologias.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Stack tecnológico">
            {tecnologias.map((t) => (
              <li key={t} className="rounded-[var(--radius-xs)] bg-surface-container-highest px-2.5 py-1 text-body-small text-on-surface">{t}</li>
            ))}
          </ul>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-outline-variant pt-5 sm:grid-cols-4">
          <Numero rotulo="Desafios publicados" valor={numeros.desafios_publicados} />
          <Numero rotulo="Abertos agora" valor={numeros.desafios_abertos} />
          <Numero rotulo="Alunos alcançados" valor={numeros.alunos_alcancados} />
          <Numero rotulo="Submissões recebidas" valor={numeros.submissoes} />
        </dl>
      </Card>

      <ListaDesafios titulo="Desafios abertos" desafios={abertos} vazio="Nenhum desafio aberto no momento." linkParaDesafios={linkParaDesafios} />
      <ListaDesafios titulo="Desafios encerrados" desafios={encerrados} vazio="Nenhum desafio encerrado ainda." linkParaDesafios={linkParaDesafios} />
    </section>
  );
}

function Numero({ rotulo, valor }) {
  return (
    <div>
      <dt className="text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">{rotulo}</dt>
      <dd className="mt-1 text-headline-small text-on-surface">{valor}</dd>
    </div>
  );
}

function ListaDesafios({ titulo, desafios, vazio, linkParaDesafios }) {
  return (
    <Card as="section" padding="lg" aria-label={titulo}>
      <h2 className="mb-4 text-title-large text-on-surface">
        {titulo} <span className="text-on-surface-variant">({desafios.length})</span>
      </h2>
      {desafios.length === 0 ? (
        <p className="text-body-medium text-on-surface-variant">{vazio}</p>
      ) : (
        <ul className="divide-y divide-outline-variant">
          {desafios.map((d) => {
            const prazo = d.aceita_entregas ? textoPrazo(d.prazo) : '';
            return (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  {linkParaDesafios ? (
                    <Link to={`/desafios/${d.id}`} className="text-body-large font-medium text-on-surface hover:underline">{tituloDaVaga(d)}</Link>
                  ) : (
                    <p className="text-body-large font-medium text-on-surface">{tituloDaVaga(d)}</p>
                  )}
                  {d.vaga_titulo && <p className="text-body-small text-on-surface-variant">Desafio: {d.titulo}</p>}
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-small text-on-surface-variant">
                    <span>{d.participantes} {d.participantes === 1 ? 'participante' : 'participantes'}</span>
                    <span>{d.submissoes} {d.submissoes === 1 ? 'submissão' : 'submissões'}</span>
                    {d.publicado_em && <span>publicado {publicadoHa(d.publicado_em)}</span>}
                    {prazo && <span>{prazo}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={DIFFICULTY_TONE[d.dificuldade] ?? 'warning'} dot>{DIFF_LABELS[d.dificuldade] ?? 'Médio'}</Badge>
                  <Badge tone={d.aceita_entregas ? 'success' : 'neutral'}>{d.aceita_entregas ? 'Aberto' : 'Encerrado'}</Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
