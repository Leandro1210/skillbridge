import clsx from 'clsx';
import { Link } from 'react-router-dom';

/**
 * Botões do manual de marca: pílula, Inter semibold.
 * - filled   (Primário)   Azul Bridge sólido — a ação principal da tela
 * - outlined (Secundário) contorno azul, texto azul
 * - success  (Sucesso)    Verde Conexão com texto Azul-noturno
 * - tonal    ênfase média, fundo azul claro
 * - onDark   contorno branco, sobre fundos escuros
 * - text / danger          ações discretas
 */
const VARIANTS = {
  filled:
    'bg-primary text-on-primary shadow-[var(--shadow-elevation-1)] hover:-translate-y-px hover:bg-[#004fd8] hover:shadow-[var(--shadow-brand)]',
  outlined:
    'border-[1.5px] border-primary text-primary bg-surface-container-lowest hover:-translate-y-px hover:bg-primary-container',
  success:
    'bg-brand-green text-brand-navy shadow-[var(--shadow-elevation-1)] hover:-translate-y-px hover:bg-[#00ad8d] hover:shadow-[0_8px_22px_rgba(2,188,154,0.32)]',
  tonal: 'bg-primary-container text-on-primary-container hover:bg-[#d4e2ff]',
  // contorno claro, para usar sobre superfícies Azul-noturno ou Azul Bridge
  onDark: 'border-[1.5px] border-white/45 text-white bg-white/5 hover:-translate-y-px hover:bg-white/15',
  text: 'text-primary bg-transparent hover:bg-primary/8',
  danger: 'text-error bg-transparent hover:bg-error/8',
};

const SIZES = {
  sm: 'px-4 py-1.5 text-label-medium',
  md: 'px-6 py-2.5 text-label-large',
  lg: 'px-7 py-3.5 text-body-large font-semibold',
};

function classesDoBotao(variant, size, className) {
  return clsx(
    'inline-flex items-center justify-center gap-2 rounded-[var(--radius-full)] font-semibold',
    'transition-all duration-300 ease-[var(--ease-brand)] active:translate-y-0 active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none',
    VARIANTS[variant] ?? VARIANTS.filled,
    SIZES[size] ?? SIZES.md,
    className,
  );
}

export default function Button({
  variant = 'filled',
  size = 'md',
  className,
  children,
  ...rest
}) {
  return (
    <button className={classesDoBotao(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

/**
 * Link de navegação com a aparência de botão. Para ir a outra página use
 * este, não um <Button onClick={navigate}>: link abre em nova aba, aparece
 * como link para leitores de tela e funciona sem JavaScript de clique.
 */
export function LinkButton({ variant = 'filled', size = 'md', className, children, ...rest }) {
  return (
    <Link className={classesDoBotao(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
