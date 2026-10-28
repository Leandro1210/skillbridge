import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

function ComponenteQuebrado() {
  throw new Error('falha de render');
}

describe('ErrorBoundary', () => {
  it('sem erro, renderiza os filhos normalmente', () => {
    render(<ErrorBoundary><p>Tudo certo</p></ErrorBoundary>);

    expect(screen.getByText('Tudo certo')).toBeInTheDocument();
  });

  it('erro em um filho mostra a tela de recuperação em vez de tela branca', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // o React loga o erro capturado

    render(<ErrorBoundary><ComponenteQuebrado /></ErrorBoundary>);

    expect(screen.getByText('Algo deu errado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recarregar página' })).toBeInTheDocument();
  });
});
