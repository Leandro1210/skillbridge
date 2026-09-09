import clsx from 'clsx';
import Icon from './Icon';

/**
 * Floating Action Button (M3) — a ação principal da tela, sempre
 * acessível, flutuando sobre o conteúdo. Variante "estendida" (com
 * rótulo) por padrão.
 */
export default function Fab({ onClick, icon = 'add', label, className, ...rest }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        // Sobre página branca o container tonal (azul bem claro) não
        // sinaliza "ação principal"; o primary sólido resolve.
        'fixed z-30 flex items-center gap-3 rounded-[var(--radius-lg)] bg-primary',
        'px-5 py-4 text-on-primary shadow-[var(--shadow-elevation-3)]',
        'transition-transform duration-200 hover:scale-105 active:scale-95',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size="1.5rem" />
      {label && <span className="pr-1 text-label-large font-medium">{label}</span>}
    </button>
  );
}
