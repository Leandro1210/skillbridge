import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EmpresaLogo from './EmpresaLogo';

describe('EmpresaLogo', () => {
  it('mostra a imagem da logo quando há link', () => {
    const { container } = render(<EmpresaLogo empresa={{ nome: 'TechBR', logo_url: 'https://techbr.com/logo.png' }} />);

    expect(container.querySelector('img')).toHaveAttribute('src', 'https://techbr.com/logo.png');
  });

  it('sem logo, mostra a inicial do nome', () => {
    const { container } = render(<EmpresaLogo empresa={{ nome: 'techbr', logo_url: '' }} />);

    expect(container).toHaveTextContent('T');
    expect(container.querySelector('img')).toBeNull();
  });

  it('se a imagem não carregar, volta para a inicial', () => {
    const { container } = render(<EmpresaLogo empresa={{ nome: 'DataCorp', logo_url: 'https://quebrado/logo.png' }} />);

    fireEvent.error(container.querySelector('img'));

    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('D');
  });

  it('sem empresa, mostra um ícone genérico e é decorativa', () => {
    const { container } = render(<EmpresaLogo empresa={null} />);

    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.icon')).not.toBeNull();
  });
});
