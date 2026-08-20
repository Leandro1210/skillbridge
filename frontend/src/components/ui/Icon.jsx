import { ICONS } from '../../lib/icons';

/**
 * Ícone Material Symbols (SVG individual, ver src/lib/icons.js).
 * Herda a cor do texto via `currentColor` (regra `.icon svg` em index.css).
 */
export default function Icon({ name, className, size, ...rest }) {
  const svg = ICONS[name];
  if (!svg) {
    if (import.meta.env.DEV) {
      console.warn(`Icon: "${name}" não está registrado em src/lib/icons.js`);
    }
    return null;
  }
  return (
    <span
      className={`icon ${className ?? ''}`}
      style={size ? { width: size, height: size } : undefined}
      dangerouslySetInnerHTML={{ __html: svg }}
      {...rest}
    />
  );
}
