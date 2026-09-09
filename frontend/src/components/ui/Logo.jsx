import clsx from 'clsx';
import markSvg from '../../assets/logo-mark.svg?raw';
import lockupSvg from '../../assets/logo-lockup.svg?raw';
import fullSvg from '../../assets/logo-full.svg?raw';

const VARIANTS = {
  /** Só o símbolo — favicon, espaços apertados, avatar da marca. */
  mark: markSvg,
  /** Símbolo + "SkillBridge" — barra superior do app. */
  lockup: lockupSvg,
  /** Símbolo + wordmark + assinatura — tela de entrada. */
  full: fullSvg,
};

/**
 * Logo do SkillBridge.
 *
 * O SVG é embutido (e não carregado como <img>) de propósito: assim as
 * variáveis CSS --sb-logo-* alcançam os paths e a marca pode ser
 * recolorizada por contexto — ver a classe .logo-on-dark em index.css,
 * necessária porque o "Skill" é azul-escuro e sumiria sobre um fundo
 * escuro.
 *
 * Props:
 *   variant  'mark' | 'lockup' | 'full'
 *   height   altura CSS (a largura acompanha a proporção)
 *   onDark   recolore para uso sobre superfície escura
 */
export default function Logo({ variant = 'lockup', height, onDark = false, className, ...rest }) {
  return (
    <span
      className={clsx('sb-logo', onDark && 'logo-on-dark', className)}
      style={height ? { height } : undefined}
      dangerouslySetInnerHTML={{ __html: VARIANTS[variant] ?? VARIANTS.lockup }}
      {...rest}
    />
  );
}
