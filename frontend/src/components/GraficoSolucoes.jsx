import { useId, useRef, useState } from 'react';
import { intervaloDaSemana } from '../lib/atividade';
import { caminhoColuna, topoDaEscala, useLarguraDisponivel } from '../lib/grafico';

/**
 * Soluções recebidas por semana (painel da empresa): colunas de uma série
 * só, sem legenda (o título do cartão diz o que é). Tooltip no hover e no
 * foco do teclado, rótulo direto só na semana atual e uma visão em tabela.
 */

const MARGEM_TOPO = 18;
const ALTURA_PLOT = 150;
const FAIXA_EIXO_X = 22;
const MARGEM_ESQ = 28;
const BARRA_MAX = 28;
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const plural = (n) => `${n} ${n === 1 ? 'solução' : 'soluções'}`;

export default function GraficoSolucoes({ serie }) {
  const [ativa, setAtiva] = useState(null);
  const [mostrarTabela, setMostrarTabela] = useState(false);
  const idTabela = useId();
  const conteiner = useRef(null);
  const LARGURA = useLarguraDisponivel(conteiner);

  if (!serie?.length) return null;

  const total = serie.reduce((t, s) => t + s.total, 0);
  const maximo = Math.max(...serie.map((s) => s.total));
  const topo = maximo <= 4 ? 4 : topoDaEscala(maximo); // contagens: sem meio-valor no eixo
  const marcas = topo % 2 === 0 ? [0, topo / 2, topo] : [0, topo];
  const larguraPlot = LARGURA - MARGEM_ESQ;
  const faixa = larguraPlot / serie.length;
  const larguraBarra = Math.min(BARRA_MAX, Math.max(faixa - 2, 2));
  const y = (valor) => MARGEM_TOPO + ALTURA_PLOT - (valor / topo) * ALTURA_PLOT;
  const ultima = serie.length - 1;

  // rótulo de mês na primeira semana de cada mês
  const rotulosMes = serie
    .map((semana, i) => ({ i, mes: Number(semana.inicio.slice(5, 7)) - 1 }))
    .filter(({ i, mes }) => i === 0 || mes !== Number(serie[i - 1].inicio.slice(5, 7)) - 1);

  const semanaAtiva = ativa === null ? null : serie[ativa];

  return (
    <div>
      <div className="relative" ref={conteiner}>
        <svg
          viewBox={`0 0 ${LARGURA} ${MARGEM_TOPO + ALTURA_PLOT + FAIXA_EIXO_X}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={`Soluções recebidas por semana: ${serie.length} semanas, ${plural(total)} no total`}
        >
          {marcas.map((valor) => (
            <g key={valor}>
              <line x1={MARGEM_ESQ} x2={LARGURA} y1={y(valor)} y2={y(valor)} stroke="var(--color-outline-variant)" strokeWidth="1" />
              <text
                x={MARGEM_ESQ - 8} y={y(valor)} dy="0.32em" textAnchor="end"
                fill="var(--color-on-surface-variant)" fontSize="11" style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {valor}
              </text>
            </g>
          ))}

          {serie.map((semana, i) => {
            const x = MARGEM_ESQ + i * faixa + (faixa - larguraBarra) / 2;
            return (
              <g key={semana.inicio}>
                {semana.total > 0 && (
                  <path
                    d={caminhoColuna(x, y(semana.total), larguraBarra, (semana.total / topo) * ALTURA_PLOT)}
                    fill="var(--color-primary)"
                    opacity={ativa === null || ativa === i ? 1 : 0.55}
                  />
                )}
                <rect
                  x={MARGEM_ESQ + i * faixa} y={MARGEM_TOPO} width={faixa} height={ALTURA_PLOT}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`Semana ${intervaloDaSemana(semana.inicio)}: ${plural(semana.total)}`}
                  onPointerEnter={() => setAtiva(i)}
                  onPointerLeave={() => setAtiva(null)}
                  onFocus={() => setAtiva(i)}
                  onBlur={() => setAtiva(null)}
                  style={{ outline: 'none' }}
                />
              </g>
            );
          })}

          {/* rótulo direto só na semana atual */}
          {ativa === null && serie[ultima].total > 0 && (
            <text
              x={MARGEM_ESQ + ultima * faixa + faixa / 2} y={y(serie[ultima].total) - 6}
              textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-on-surface)"
            >
              {serie[ultima].total}
            </text>
          )}

          {rotulosMes.map(({ i, mes }) => (
            <text key={`${mes}-${i}`} x={MARGEM_ESQ + i * faixa + 1} y={MARGEM_TOPO + ALTURA_PLOT + 15} fontSize="11" fill="var(--color-on-surface-variant)">
              {MESES[mes]}
            </text>
          ))}
        </svg>

        {total === 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-body-medium text-on-surface-variant">
            Nenhuma solução recebida nas últimas {serie.length} semanas.
          </p>
        )}

        {semanaAtiva && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-0 z-10 min-w-36 -translate-x-1/2 rounded-[var(--radius-sm)] border border-outline-variant bg-surface-container-lowest px-3 py-2 shadow-[var(--shadow-elevation-2)]"
            style={{ left: `${((MARGEM_ESQ + (ativa + 0.5) * faixa) / LARGURA) * 100}%` }}
          >
            <p className="text-title-small text-on-surface">{plural(semanaAtiva.total)}</p>
            <p className="text-body-small text-on-surface-variant">{intervaloDaSemana(semanaAtiva.inicio)}</p>
          </div>
        )}
      </div>

      <button
        type="button"
        aria-expanded={mostrarTabela}
        aria-controls={idTabela}
        onClick={() => setMostrarTabela((v) => !v)}
        className="mt-2 text-label-medium font-medium text-primary hover:underline"
      >
        {mostrarTabela ? 'Ocultar tabela' : 'Ver como tabela'}
      </button>

      {mostrarTabela && (
        <table id={idTabela} className="mt-2 w-full text-left text-body-small">
          <caption className="sr-only">Soluções recebidas por semana</caption>
          <thead>
            <tr className="border-b border-outline-variant text-on-surface-variant">
              <th scope="col" className="py-1.5 font-medium">Semana</th>
              <th scope="col" className="py-1.5 text-right font-medium">Soluções</th>
            </tr>
          </thead>
          <tbody>
            {serie.map((semana) => (
              <tr key={semana.inicio} className="border-b border-outline-variant/60">
                <td className="py-1.5 text-on-surface-variant">{intervaloDaSemana(semana.inicio)}</td>
                <td className="py-1.5 text-right text-on-surface" style={{ fontVariantNumeric: 'tabular-nums' }}>{semana.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
