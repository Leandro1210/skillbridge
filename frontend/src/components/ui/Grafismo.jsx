import clsx from 'clsx';

/**
 * Grafismos de apoio do manual de marca: faixas (pílulas diagonais) e
 * círculos — as "pessoas" do símbolo — mais a grade de pontos ligados.
 *
 * Regras de composição, iguais para todas as variantes:
 * - todas as faixas são paralelas, no mesmo ângulo (27°, o da marca);
 * - o espaço entre faixas vizinhas é sempre o mesmo (VAO);
 * - os círculos ficam no prolongamento de uma faixa, à mesma distância
 *   da ponta (VAO), como a cabeça de uma pessoa no símbolo;
 * - a área do desenho é calculada a partir das formas (com folga para a
 *   flutuação), então nenhuma forma aparece cortada.
 *
 * Variantes (cada lugar do sistema usa uma diferente, para não repetir):
 *   ponte      três faixas em escada + dois círculos  (tela de entrada)
 *   trilhas    duas faixas + um círculo               (destaque do feed, capa da empresa)
 *   pessoas    duas faixas, cada uma com sua "cabeça" (capa do perfil do aluno)
 *   assinatura versão pequena, para o rodapé
 *   pontos     grade de pontos com uma ligação        (painel da empresa, estados vazios)
 *
 * Tons: escuro (sobre Azul-noturno) · azul (sobre Azul Bridge) ·
 *       vivo (sobre fundo claro) · claro (suave, atrás de texto escuro).
 * Sempre decorativos (aria-hidden). O pai só define a altura (ou a largura).
 */
const CORES = {
  escuro: { faixa: 'var(--color-brand-blue)', suave: 'var(--color-brand-blue-light)', verde: 'var(--color-brand-green)', ponto: 'rgba(255,255,255,0.2)' },
  // sobre o Azul Bridge a faixa azul sumiria: vira branca, como no manual
  azul: { faixa: '#ffffff', suave: 'var(--color-brand-blue-light)', verde: 'var(--color-brand-green)', ponto: 'rgba(255,255,255,0.28)' },
  vivo: { faixa: 'var(--color-brand-blue)', suave: 'var(--color-brand-blue-light)', verde: 'var(--color-brand-green)', ponto: 'rgba(1,24,58,0.14)' },
  claro: { faixa: '#c9dbff', suave: '#e3ecff', verde: '#bfeee3', ponto: 'rgba(1,24,58,0.12)' },
};

const ANGULO = -27; // graus
const VAO = 28; // espaço entre faixas vizinhas e entre a ponta da faixa e o círculo
const FOLGA = 20; // margem do desenho para a flutuação

/*
 * Composições num quadro "deitado" (faixas horizontais), que depois é girado.
 * faixa: { y, de, ate, esp, cor }  — y é o centro da faixa
 * circulo: { na: índice da faixa, lado: 'fim' | 'inicio', r, cor }
 * As posições de y saem do VAO: cada faixa fica a (esp_anterior/2 + VAO + esp/2) da anterior.
 */
const COMPOSICOES = {
  ponte: {
    faixas: [
      { de: 160, ate: 420, esp: 40, cor: 'suave' },
      { de: 80, ate: 480, esp: 80, cor: 'faixa' },
      { de: 0, ate: 400, esp: 80, cor: 'verde' },
    ],
    circulos: [
      { na: 2, lado: 'fim', r: 32, cor: 'verde' },
      { na: 0, lado: 'inicio', r: 20, cor: 'suave' },
    ],
  },
  trilhas: {
    faixas: [
      { de: 70, ate: 360, esp: 56, cor: 'faixa' },
      { de: 0, ate: 290, esp: 56, cor: 'verde' },
    ],
    circulos: [{ na: 0, lado: 'fim', r: 24, cor: 'suave' }],
  },
  pessoas: {
    faixas: [
      { de: 70, ate: 300, esp: 52, cor: 'faixa' },
      { de: 0, ate: 230, esp: 52, cor: 'verde' },
    ],
    circulos: [
      { na: 0, lado: 'inicio', r: 26, cor: 'verde' },
      { na: 1, lado: 'fim', r: 26, cor: 'suave' },
    ],
  },
  assinatura: {
    faixas: [
      { de: 40, ate: 200, esp: 28, cor: 'faixa' },
      { de: 0, ate: 160, esp: 28, cor: 'verde' },
    ],
    circulos: [{ na: 0, lado: 'fim', r: 14, cor: 'suave' }],
  },
};

const rad = (ANGULO * Math.PI) / 180;
const girar = (x, y) => [x * Math.cos(rad) - y * Math.sin(rad), x * Math.sin(rad) + y * Math.cos(rad)];

/** Posiciona as faixas pelo VAO, gira tudo e calcula a área exata do desenho. */
function montar({ faixas, circulos }) {
  let y = 0;
  const posicionadas = faixas.map((f, i) => {
    if (i > 0) y += faixas[i - 1].esp / 2 + VAO + f.esp / 2;
    return { ...f, y };
  });
  const formas = [];
  posicionadas.forEach((f) => {
    const [x1, y1] = girar(f.de, f.y);
    const [x2, y2] = girar(f.ate, f.y);
    formas.push({ tipo: 'faixa', x1, y1, x2, y2, esp: f.esp, cor: f.cor, caixa: [Math.min(x1, x2) - f.esp / 2, Math.min(y1, y2) - f.esp / 2, Math.max(x1, x2) + f.esp / 2, Math.max(y1, y2) + f.esp / 2] });
  });
  circulos.forEach((c) => {
    const f = posicionadas[c.na];
    const x = c.lado === 'fim' ? f.ate + f.esp / 2 + VAO + c.r : f.de - f.esp / 2 - VAO - c.r;
    const [cx, cy] = girar(x, f.y);
    formas.push({ tipo: 'circulo', cx, cy, r: c.r, cor: c.cor, caixa: [cx - c.r, cy - c.r, cx + c.r, cy + c.r] });
  });
  const minX = Math.min(...formas.map((f) => f.caixa[0])) - FOLGA;
  const minY = Math.min(...formas.map((f) => f.caixa[1])) - FOLGA;
  const maxX = Math.max(...formas.map((f) => f.caixa[2])) + FOLGA;
  const maxY = Math.max(...formas.map((f) => f.caixa[3])) + FOLGA;
  return { formas, viewBox: [minX, minY, maxX - minX, maxY - minY] };
}

const MONTADAS = Object.fromEntries(Object.entries(COMPOSICOES).map(([nome, c]) => [nome, montar(c)]));

// deriva da flutuação de cada forma (px), alternando a direção para dar vida
const DERIVAS = [[8, -12], [-8, -10], [10, -8], [-6, -12], [6, -10]];

function Faixas({ montada, cores, animar, flutuar }) {
  return montada.formas.map((f, i) => {
    const [dx, dy] = DERIVAS[i % DERIVAS.length];
    const entrada = animar ? { animation: `faixa-in 0.9s var(--ease-brand) ${i * 110}ms both` } : undefined;
    const deriva = animar && flutuar
      ? { '--dx': `${dx}px`, '--dy': `${dy}px`, animation: `deriva ${5.5 + i * 0.6}s ease-in-out ${1 + i * 0.3}s infinite` }
      : undefined;
    return (
      <g key={`${f.tipo}-${i}`} style={entrada}>
        {f.tipo === 'faixa' ? (
          <line x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} stroke={cores[f.cor]} strokeWidth={f.esp} strokeLinecap="round" style={deriva} />
        ) : (
          <circle cx={f.cx} cy={f.cy} r={f.r} fill={cores[f.cor]} style={deriva} />
        )}
      </g>
    );
  });
}

// grade 4×4 com espaçamento regular; a ligação vai de um ponto da grade a outro
const PASSO = 90;
const PONTOS_VIEWBOX = [-30, -30, PASSO * 3 + 60, PASSO * 3 + 60];

function Pontos({ cores, animar }) {
  const pontos = [];
  for (let linha = 0; linha < 4; linha += 1) {
    for (let coluna = 0; coluna < 4; coluna += 1) pontos.push([coluna * PASSO, linha * PASSO]);
  }
  const [a, b] = [[PASSO, PASSO], [PASSO * 3, PASSO * 3]];
  return (
    <g>
      {pontos.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="7" fill={cores.ponto} />)}
      <line
        x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={cores.suave} strokeWidth="4" strokeDasharray="8 10" strokeLinecap="round"
        style={animar ? { strokeDashoffset: 120, animation: 'ligar 1.4s var(--ease-brand) 300ms both' } : undefined}
      />
      <circle cx={a[0]} cy={a[1]} r="18" fill={cores.suave} style={animar ? { transformOrigin: `${a[0]}px ${a[1]}px`, animation: 'pulso 3s ease-in-out infinite' } : undefined} />
      <circle cx={b[0]} cy={b[1]} r="18" fill={cores.verde} style={animar ? { transformOrigin: `${b[0]}px ${b[1]}px`, animation: 'pulso 3s ease-in-out 1.5s infinite' } : undefined} />
    </g>
  );
}

export default function Grafismo({ variante = 'ponte', tom = 'escuro', animar = true, flutuar = true, className }) {
  const cores = CORES[tom] ?? CORES.escuro;
  const montada = MONTADAS[variante];
  const viewBox = montada ? montada.viewBox : PONTOS_VIEWBOX;
  return (
    <svg
      viewBox={viewBox.join(' ')}
      aria-hidden="true"
      focusable="false"
      className={clsx('pointer-events-none select-none overflow-visible', className)}
      style={{ aspectRatio: `${viewBox[2]} / ${viewBox[3]}` }}
    >
      {montada
        ? <Faixas montada={montada} cores={cores} animar={animar} flutuar={flutuar} />
        : <Pontos cores={cores} animar={animar} />}
    </svg>
  );
}
