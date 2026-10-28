import { describe, expect, it, vi } from 'vitest';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isLoggedIn,
  notifyLoggedOut,
  setTokens,
} from './auth';

describe('auth (armazenamento dos tokens)', () => {
  it('grava e lê os dois tokens', () => {
    setTokens({ access: 'acesso', refresh: 'renovacao' });

    expect(getAccessToken()).toBe('acesso');
    expect(getRefreshToken()).toBe('renovacao');
    expect(isLoggedIn()).toBe(true);
  });

  it('não apaga o refresh quando só o access é renovado', () => {
    setTokens({ access: 'acesso-1', refresh: 'renovacao' });
    setTokens({ access: 'acesso-2' });

    expect(getAccessToken()).toBe('acesso-2');
    expect(getRefreshToken()).toBe('renovacao');
  });

  it('clearTokens apaga os dois tokens', () => {
    setTokens({ access: 'acesso', refresh: 'renovacao' });
    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });

  it('sem token, o usuário não está logado', () => {
    expect(isLoggedIn()).toBe(false);
  });

  it('notifyLoggedOut dispara o evento que o App escuta', () => {
    const ouvinte = vi.fn();
    window.addEventListener('skillbridge:auth-logout', ouvinte);

    notifyLoggedOut();

    expect(ouvinte).toHaveBeenCalledTimes(1);
    window.removeEventListener('skillbridge:auth-logout', ouvinte);
  });
});
