import { useEffect, useState } from 'react';

/**
 * Peças comuns dos gráficos de colunas (atividade do aluno, soluções da
 * empresa): escala "redonda", coluna com topo arredondado e a largura real
 * do conteiner.
 */

export const LARGURA_PADRAO = 640; // até medir o espaço disponível (e nos testes, sem ResizeObserver)
const RAIO = 4;

/** Topo "redondo" para a escala: ... 5, 10, 20, 50, 100, 200... (10 quando não há dado). */
export function topoDaEscala(maximo) {
  if (maximo <= 0) return 10;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  const passo = [1, 2, 5, 10].find((m) => m * potencia >= maximo);
  return passo * potencia;
}

/** Coluna com 4px arredondados no topo e base reta (cresce da linha de base). */
export function caminhoColuna(x, y, largura, altura) {
  const r = Math.min(RAIO, altura, largura / 2);
  const base = y + altura;
  return [
    `M${x},${base}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + largura - r}`,
    `Q${x + largura},${y} ${x + largura},${y + r}`,
    `V${base}`,
    'Z',
  ].join(' ');
}

/**
 * Largura real do conteiner. O SVG é desenhado nessa largura (em vez de um
 * viewBox fixo esticado), então o texto fica sempre com o tamanho de verdade —
 * no celular ele não encolhe até ficar ilegível.
 */
export function useLarguraDisponivel(ref) {
  const [largura, setLargura] = useState(LARGURA_PADRAO);
  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || typeof ResizeObserver === 'undefined') return undefined;
    const observador = new ResizeObserver(([entrada]) => {
      setLargura(Math.max(260, Math.round(entrada.contentRect.width)));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [ref]);
  return largura;
}
