import { Component } from 'react';
import Button from './ui/Button';

/**
 * Captura erros de render não tratados em qualquer lugar da árvore,
 * evitando que a SPA inteira quebre em tela branca.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Erro não tratado:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-4 text-center">
          <p className="text-title-large text-on-surface">Algo deu errado.</p>
          <Button variant="filled" onClick={() => window.location.reload()}>
            Recarregar página
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
