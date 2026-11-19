import clsx from 'clsx';
import Logo from './Logo';

/**
 * Carregamento da marca: o símbolo e três faixas diagonais (azul,
 * azul-claro, verde) que crescem em sequência, como uma ponte se
 * formando. Para telas inteiras ou áreas grandes; dentro de botões e
 * listas use o <Spinner />.
 */
const FAIXAS = ['bg-brand-blue', 'bg-brand-blue-light', 'bg-brand-green'];

export default function Carregando({ texto = 'Carregando…', telaCheia = false, className }) {
  return (
    // <output> já tem o papel "status": leitores de tela anunciam o carregamento
    <output
      className={clsx(
        'flex flex-col items-center justify-center gap-6 animate-[var(--animate-fade-in)]',
        telaCheia && 'min-h-screen bg-surface',
        className,
      )}
    >
      <Logo variant="mark" height="3rem" aria-hidden="true" />
      <span className="flex -rotate-[27deg] flex-col gap-1.5" aria-hidden="true">
        {FAIXAS.map((cor, i) => (
          <span
            key={cor}
            className={clsx('block h-2 w-14 origin-left rounded-full', cor)}
            style={{ animation: `carregar-faixa 1.2s var(--ease-brand-in-out) ${i * 0.15}s infinite` }}
          />
        ))}
      </span>
      <span className="text-label-large text-on-surface-variant">{texto}</span>
    </output>
  );
}
