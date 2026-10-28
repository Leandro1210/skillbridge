/**
 * Preparação comum a todos os testes do frontend (ver test.setupFiles em vite.config.js).
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

// O jsdom não implementa showModal()/close() do <dialog>, usados pelo Modal.
// Esta versão mínima só liga/desliga o atributo "open" e emite o evento "close".
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
