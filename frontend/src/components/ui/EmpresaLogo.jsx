import { useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';

const TAMANHOS = {
  md: 'h-11 w-11 text-title-medium',
  lg: 'h-12 w-12 text-title-large',
  xl: 'h-20 w-20 text-headline-medium',
};

/**
 * Logo da empresa: a imagem do perfil, ou a inicial do nome quando não há
 * logo (ou o link quebrou). Decorativa — o nome da empresa sempre aparece ao
 * lado em texto, então a imagem não precisa de texto alternativo.
 */
export default function EmpresaLogo({ empresa, tamanho = 'md', className }) {
  const [falhou, setFalhou] = useState(false);
  const classes = clsx('flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)]', TAMANHOS[tamanho], className);

  if (empresa?.logo_url && !falhou) {
    return (
      <span className={clsx(classes, 'bg-surface-container-lowest')} aria-hidden="true">
        <img src={empresa.logo_url} alt="" className="h-full w-full object-contain" onError={() => setFalhou(true)} />
      </span>
    );
  }

  return (
    <span className={clsx(classes, 'bg-primary-container text-on-primary-container')} aria-hidden="true">
      {empresa?.nome?.charAt(0)?.toUpperCase() ?? <Icon name="apartment" size="1.2rem" />}
    </span>
  );
}
