import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Modal from './Modal';

describe('Modal', () => {
  it('fechado, não renderiza nada', () => {
    render(<Modal open={false} onClose={vi.fn()} title="Título">Conteúdo</Modal>);

    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument();
  });

  it('aberto, mostra título e conteúdo num <dialog> aberto', () => {
    render(<Modal open onClose={vi.fn()} title="Avaliar">Conteúdo</Modal>);

    const dialog = screen.getByRole('dialog', { name: 'Avaliar' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('heading', { name: 'Avaliar' })).toBeInTheDocument();
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('o botão "Fechar" chama onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Avaliar">Conteúdo</Modal>);

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Esc (evento "cancel" do <dialog>) chama onClose e quem fecha é o React', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Avaliar">Conteúdo</Modal>);
    const dialog = screen.getByRole('dialog');

    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(cancel.defaultPrevented).toBe(true); // o navegador não fecha sozinho
  });

  it('clique no fundo fecha; clique no conteúdo não', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Avaliar">Conteúdo</Modal>);

    fireEvent.click(screen.getByText('Conteúdo'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('dialog')); // o alvo é o próprio <dialog>, a área do ::backdrop
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('trava a rolagem da página enquanto aberto e libera ao fechar', () => {
    const { rerender } = render(<Modal open onClose={vi.fn()}>Conteúdo</Modal>);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<Modal open={false} onClose={vi.fn()}>Conteúdo</Modal>);
    expect(document.body.style.overflow).toBe('');
  });

  it('usa sempre o onClose mais recente sem reabrir o modal', () => {
    const primeiro = vi.fn();
    const segundo = vi.fn();
    const { rerender } = render(<Modal open onClose={primeiro}>Conteúdo</Modal>);
    rerender(<Modal open onClose={segundo}>Conteúdo</Modal>);

    fireEvent.click(screen.getByRole('dialog'));

    expect(primeiro).not.toHaveBeenCalled();
    expect(segundo).toHaveBeenCalledTimes(1);
  });
});
