import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import api from '../api';
import { EVENTO_ATIVIDADE, ORIGENS_XP, nomeTemporada, totalPorOrigem } from '../lib/atividade';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Skeleton from './ui/Skeleton';
import GraficoAtividade from './GraficoAtividade';

/**
 * Atividade do aluno na temporada (semestre): XP, nível de atividade, o
 * quanto falta para o próximo, o gráfico semanal e de onde veio o XP.
 * O XP mede comprometimento — não libera nem bloqueia desafios.
 */
export default function AtividadeResumo() {
  const [resumo, setResumo] = useState(null);
  const [falhou, setFalhou] = useState(false);

  const carregar = useCallback(() => {
    // o estado só muda no retorno da requisição (callback), nunca direto no effect
    api.get('/perfil/atividade/')
      .then(({ data }) => {
        setResumo(data);
        setFalhou(false);
      })
      .catch(() => setFalhou(true));
  }, []);

  useEffect(() => {
    carregar();
    // o App avisa quando o acesso do dia rendeu XP: atualiza o resumo
    window.addEventListener(EVENTO_ATIVIDADE, carregar);
    return () => window.removeEventListener(EVENTO_ATIVIDADE, carregar);
  }, [carregar]);

  if (falhou) return null; // a atividade é complementar: o feed segue sem ela
  if (!resumo) return <Skeleton className="mb-8 h-64 rounded-[var(--radius-lg)]" />;

  const proximo = resumo.proximo_nivel;
  const origens = totalPorOrigem(resumo.serie_semanal);
  const maiorOrigem = origens[0]?.xp ?? 0;
  // progresso dentro da faixa atual até o próximo nível
  const progresso = proximo ? resumo.xp / (resumo.xp + proximo.xp_faltante) : 1;

  return (
    <Card as="section" padding="md" className="mb-8" aria-labelledby="titulo-atividade">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-atividade" className="text-title-medium text-on-surface">Sua atividade</h2>
          <p className="text-body-small text-on-surface-variant">{nomeTemporada(resumo.temporada)}</p>
        </div>
        <Badge tone="accent">{resumo.nivel}</Badge>
      </div>

      <p className="mt-3 text-headline-large text-on-surface">
        {resumo.xp} <span className="text-title-medium text-on-surface-variant">XP</span>
      </p>

      <div className="mt-2">
        {/* <progress> nativo, com a aparência do navegador trocada pela do tema */}
        <progress
          className={clsx(
            'block h-2 w-full appearance-none overflow-hidden rounded-full border-0 bg-primary-container',
            '[&::-webkit-progress-bar]:bg-primary-container',
            '[&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary',
            '[&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary',
          )}
          aria-label={proximo ? `Progresso até ${proximo.nome}` : 'Nível máximo de atividade'}
          max={100}
          value={Math.round(progresso * 100)}
        />
        <p className="mt-1.5 text-body-small text-on-surface-variant">
          {proximo
            ? `Faltam ${proximo.xp_faltante} XP para "${proximo.nome}"`
            : 'Você está no nível máximo de atividade nesta temporada.'}
        </p>
      </div>

      <h3 className="mb-2 mt-6 text-title-small text-on-surface">XP por semana</h3>
      <GraficoAtividade serie={resumo.serie_semanal} />

      <details className="mt-4 border-t border-outline-variant pt-3">
        <summary className="cursor-pointer text-label-large text-on-surface">Detalhes da atividade</summary>

        {origens.length > 0 ? (
          <div className="mt-3">
            <h4 className="mb-2 text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">
              De onde veio seu XP
            </h4>
            <ul className="space-y-2">
              {origens.map(({ origem, rotulo, xp }) => (
                <li key={origem}>
                  <div className="flex justify-between text-body-small">
                    <span className="text-on-surface-variant">{rotulo}</span>
                    <span className="font-medium text-on-surface">{xp} XP</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-primary-container">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(xp / maiorOrigem) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-body-small text-on-surface-variant">Nenhuma atividade nesta temporada ainda.</p>
        )}

        <h4 className="mb-2 mt-5 text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">
          Limites deste mês
        </h4>
        <ul className="space-y-1 text-body-small text-on-surface-variant">
          {Object.entries(resumo.limites_do_mes).map(([origem, { limite, usados }]) => (
            <li key={origem}>
              {ORIGENS_XP[origem] ?? origem}: <span className="font-medium text-on-surface">{usados} de {limite}</span> com XP
            </li>
          ))}
        </ul>

        {resumo.temporadas_anteriores.length > 0 && (
          <>
            <h4 className="mb-2 mt-5 text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">
              Temporadas anteriores
            </h4>
            <ul className="space-y-1 text-body-small text-on-surface-variant">
              {resumo.temporadas_anteriores.map((t) => (
                <li key={t.temporada}>
                  {nomeTemporada(t.temporada)}: <span className="font-medium text-on-surface">{t.xp} XP</span> · {t.nivel}
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-5 text-body-small text-on-surface-variant/80">
          O XP mede sua atividade no semestre e recomeça a cada temporada. Ele não libera nem bloqueia desafios.
        </p>
      </details>
    </Card>
  );
}
