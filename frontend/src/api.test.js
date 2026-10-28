/**
 * Testa os interceptors reais do cliente Axios (api.js). Nenhuma requisição
 * sai para a rede: o "adapter" do Axios é trocado por uma função que responde
 * como o backend responderia, e o refresh (feito com o axios global) é espionado.
 */
import axios, { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import { getAccessToken, getRefreshToken, setTokens } from './auth';

function sucesso(config, data = { ok: true }) {
  return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config });
}

function falha(config, status) {
  const response = { data: {}, status, statusText: '', headers: {}, config };
  return Promise.reject(new AxiosError(`HTTP ${status}`, 'ERR_BAD_REQUEST', config, null, response));
}

/** Responde 401 até o access token ser o novo; depois responde 200. */
function adapterComTokenExpirado(tokenValido) {
  return vi.fn((config) => (
    config.headers.Authorization === `Bearer ${tokenValido}` ? sucesso(config) : falha(config, 401)
  ));
}

let adapterOriginal;
beforeEach(() => {
  adapterOriginal = api.defaults.adapter;
});
afterEach(() => {
  api.defaults.adapter = adapterOriginal;
  vi.restoreAllMocks();
});

describe('api: envio do token', () => {
  it('envia o access token salvo no header Authorization', async () => {
    setTokens({ access: 'token-atual', refresh: 'r' });
    api.defaults.adapter = vi.fn((config) => sucesso(config));

    await api.get('/auth/me/');

    const config = api.defaults.adapter.mock.calls[0][0];
    expect(config.headers.Authorization).toBe('Bearer token-atual');
  });

  it('sem token, não envia Authorization', async () => {
    api.defaults.adapter = vi.fn((config) => sucesso(config));

    await api.get('/projetos/');

    const config = api.defaults.adapter.mock.calls[0][0];
    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('api: renovação do token após 401', () => {
  it('renova, salva os DOIS tokens novos e repete a requisição', async () => {
    setTokens({ access: 'expirado', refresh: 'refresh-antigo' });
    api.defaults.adapter = adapterComTokenExpirado('novo-access');
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access: 'novo-access', refresh: 'novo-refresh' },
    });

    const resp = await api.get('/auth/me/');

    expect(resp.status).toBe(200);
    expect(refresh).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/token/refresh/'),
      { refresh: 'refresh-antigo' },
    );
    // o backend gira o refresh token: guardar só o access forçaria logout no próximo refresh
    expect(getAccessToken()).toBe('novo-access');
    expect(getRefreshToken()).toBe('novo-refresh');
  });

  it('várias requisições com 401 ao mesmo tempo fazem UM único refresh', async () => {
    setTokens({ access: 'expirado', refresh: 'refresh-antigo' });
    api.defaults.adapter = adapterComTokenExpirado('novo-access');
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access: 'novo-access', refresh: 'novo-refresh' },
    });

    const respostas = await Promise.all([api.get('/a/'), api.get('/b/'), api.get('/c/')]);

    expect(respostas.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('se o refresh falhar, limpa a sessão e avisa o App', async () => {
    setTokens({ access: 'expirado', refresh: 'refresh-revogado' });
    api.defaults.adapter = vi.fn((config) => falha(config, 401));
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh inválido'));
    const ouvinte = vi.fn();
    window.addEventListener('skillbridge:auth-logout', ouvinte);

    await expect(api.get('/auth/me/')).rejects.toMatchObject({ response: { status: 401 } });

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(ouvinte).toHaveBeenCalledTimes(1);
    window.removeEventListener('skillbridge:auth-logout', ouvinte);
  });

  it('sem refresh token, nem tenta renovar: encerra a sessão', async () => {
    setTokens({ access: 'expirado' });
    api.defaults.adapter = vi.fn((config) => falha(config, 401));
    const refresh = vi.spyOn(axios, 'post');
    const ouvinte = vi.fn();
    window.addEventListener('skillbridge:auth-logout', ouvinte);

    await expect(api.get('/auth/me/')).rejects.toBeInstanceOf(AxiosError);

    expect(refresh).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    expect(ouvinte).toHaveBeenCalledTimes(1);
    window.removeEventListener('skillbridge:auth-logout', ouvinte);
  });

  it('não entra em loop se a requisição repetida também der 401', async () => {
    setTokens({ access: 'expirado', refresh: 'refresh-antigo' });
    api.defaults.adapter = vi.fn((config) => falha(config, 401)); // nunca aceita
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access: 'outro', refresh: 'outro-refresh' },
    });

    await expect(api.get('/auth/me/')).rejects.toBeInstanceOf(AxiosError);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(api.defaults.adapter).toHaveBeenCalledTimes(2); // original + 1 repetição
  });

  it('erros que não são 401 passam direto, sem refresh', async () => {
    setTokens({ access: 'valido', refresh: 'r' });
    api.defaults.adapter = vi.fn((config) => falha(config, 403));
    const refresh = vi.spyOn(axios, 'post');

    await expect(api.post('/entregas/', {})).rejects.toMatchObject({ response: { status: 403 } });

    expect(refresh).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe('valido');
  });
});
