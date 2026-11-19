import { useId, useRef, useState } from 'react';
import { ORIGENS_XP, intervaloDaSemana } from '../lib/atividade';
import { caminhoColuna, topoDaEscala, useLarguraDisponivel } from '../lib/grafico';

/**
 * XP por semana da temporada — colunas de uma série só (uma cor, sem legenda:
 * o título da seção já diz o que é). Cada coluna tem tooltip no hover e no
 * foco do teclado, com o detalhe por origem; a tabela logo abaixo do gráfico
 * traz os mesmos valores sem depender do mouse.
 */

const MARGEM_TOPO = 16; // respiro para o rótulo do topo do eixo e o rótulo direto
const ALTURA_PLOT = 140;
const FAIXA_EIXO_X = 22;
const MARGEM_ESQ = 34; // rótulos do eixo y
const BARRA_MAX = 24;

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DISTANCIA_MIN_ROTULOS = 28; // px entre rótulos de mês, para não encostarem

export default function GraficoAtividade({ serie }) {
  const [ativa, setAtiva] = useState(null);
  const [mostrarTabela, setMostrarTabela] = useState(false);
  const idTabela = useId();
  const conteiner = useRef(null);
  const LARGURA = useLarguraDisponivel(conteiner);

  if (!serie?.length) return null;

  const topo = topoDaEscala(Math.max(...serie.map((s) => s.total)));
  const larguraPlot = LARGURA - MARGEM_ESQ;
  const faixa = larguraPlot / serie.length;
  const larguraBarra = Math.min(BARRA_MAX, Math.max(faixa - 2, 2)); // 2px de respiro entre colunas
  const y = (valor) => MARGEM_TOPO + ALTURA_PLOT - (valor / topo) * ALTURA_PLOT;
  const marcas = [0, topo / 2, topo];

  // rótulo de mês na primeira semana que cai em cada mês (pulando os que encostariam no anterior)
  const rotulosMes = [];
  serie.forEach((semana, i) => {
    const mes = Number(semana.inicio.slice(5, 7)) - 1;
    const anterior = i > 0 ? Number(serie[i - 1].inicio.slice(5, 7)) - 1 : null;
    if (i > 0 && mes === anterior) return;
    const ultimo = rotulosMes.at(-1);
    if (ultimo && (i - ultimo.i) * faixa < DISTANCIA_MIN_ROTULOS) rotulosMes.pop(); // fica o mês mais recente
    rotulosMes.push({ i, texto: MESES[mes] });
  });

  const semanaAtiva = ativa === null ? null : serie[ativa];
  const ultimaComXp = serie.reduce((ult, s, i) => (s.total > 0 ? i : ult), -1);

  return (
    <div>
      <div className="relative" ref={conteiner}>
        <svg
          viewBox={`0 0 ${LARGURA} ${MARGEM_TOPO + ALTURA_PLOT + FAIXA_EIXO_X}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={`XP por semana: ${serie.length} semanas, total de ${serie.reduce((t, s) => t + s.total, 0)} XP`}
        >
          {/* grade recessiva: linhas finas e sólidas */}
          {marcas.map((valor) => (
            <g key={valor}>
              <line
                x1={MARGEM_ESQ} x2={LARGURA} y1={y(valor)} y2={y(valor)}
                stroke="var(--color-outline-variant)" strokeWidth="1"
              />
              <text
                x={MARGEM_ESQ - 6} y={y(valor)} dy="0.32em" textAnchor="end"
                fill="var(--color-on-surface-variant)" fontSize="11" style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {valor}
              </text>
            </g>
          ))}

          {serie.map((semana, i) => {
            const x = MARGEM_ESQ + i * faixa + (faixa - larguraBarra) / 2;
            const altura = (semana.total / topo) * ALTURA_PLOT;
            return (
              <g key={semana.inicio}>
                {semana.total > 0 && (
                  <path
                    d={caminhoColuna(x, y(semana.total), larguraBarra, altura)}
                    fill="var(--color-primary)"
                    opacity={ativa === null || ativa === i ? 1 : 0.55}
                  />
                )}
                {/* área de hover/foco: a faixa inteira, não só a coluna pintada */}
                <rect
                  x={MARGEM_ESQ + i * faixa} y={MARGEM_TOPO} width={faixa} height={ALTURA_PLOT}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`Semana ${intervaloDaSemana(semana.inicio)}: ${semana.total} XP`}
                  onPointerEnter={() => setAtiva(i)}
                  onPointerLeave={() => setAtiva(null)}
                  onFocus={() => setAtiva(i)}
                  onBlur={() => setAtiva(null)}
                  style={{ outline: 'none' }}
                />
              </g>
            );
          })}

          {/* rótulo direto só na última semana com atividade */}
          {ultimaComXp >= 0 && ativa === null && (
            <text
              x={MARGEM_ESQ + ultimaComXp * faixa + faixa / 2}
              y={y(serie[ultimaComXp].total) - 6}
              textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-on-surface)"
            >
              {serie[ultimaComXp].total}
            </text>
          )}

          {rotulosMes.map(({ i, texto }) => (
            <text
              key={`${texto}-${i}`}
              x={MARGEM_ESQ + i * faixa + 1} y={MARGEM_TOPO + ALTURA_PLOT + 15}
              fontSize="11" fill="var(--color-on-surface-variant)"
            >
              {texto}
            </text>
          ))}
        </svg>

        {semanaAtiva && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-0 z-10 min-w-44 -translate-x-1/2 rounded-[var(--radius-sm)] border border-outline-variant bg-surface-container-lowest px-3 py-2 shadow-[var(--shadow-elevation-2)]"
            style={{ left: `${((MARGEM_ESQ + (ativa + 0.5) * faixa) / LARGURA) * 100}%` }}
          >
            <p className="text-title-small text-on-surface">{semanaAtiva.total} XP</p>
            <p className="text-body-small text-on-surface-variant">{intervaloDaSemana(semanaAtiva.inicio)}</p>
            {Object.entries(semanaAtiva.por_origem).map(([origem, xp]) => (
              <p key={origem} className="mt-1 flex justify-between gap-3 text-body-small text-on-surface-variant">
                <span>{ORIGENS_XP[origem] ?? origem}</span>
                <span className="font-medium text-on-surface">{xp}</span>
              </p>
            ))}
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
          <caption className="sr-only">XP por semana da temporada</caption>
          <thead>
            <tr className="border-b border-outline-variant text-on-surface-variant">
              <th scope="col" className="py-1.5 font-medium">Semana</th>
              <th scope="col" className="py-1.5 text-right font-medium">XP</th>
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
