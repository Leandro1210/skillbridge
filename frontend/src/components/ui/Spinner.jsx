import clsx from 'clsx';

const SIZES = { sm: 16, md: 22, lg: 36 };

/**
 * Indicador de atividade pequeno (dentro de botões, listas): um anel com
 * dois arcos, Azul Bridge e Verde Conexão, girando com desaceleração suave.
 * Para a tela inteira, use o <Carregando />.
 */
export default function Spinner({ size = 'md', className }) {
  const px = SIZES[size] ?? SIZES.md;
  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      aria-hidden="true"
      className={clsx('shrink-0', className)}
      style={{ animation: 'girar 0.9s var(--ease-brand-in-out) infinite' }}
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--color-primary-container)" strokeWidth="3" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--color-brand-blue)" strokeWidth="3" strokeLinecap="round" strokeDasharray="20 57" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--color-brand-green)" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 69" strokeDashoffset="-28" />
    </svg>
  );
}
