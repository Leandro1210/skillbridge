/**
 * Cliente Axios central — toda chamada à API passa por aqui, com o
 * token JWT (ver auth.js) injetado automaticamente em cada requisição.
 */

import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens, notifyLoggedOut } from './auth';

// Detecta a URL da API automaticamente
let API_BASE_URL = import.meta.env.VITE_API_URL;
let API_SERVER_BASE = '';

if (!API_BASE_URL) {
  // Em produção, usa a mesma origem + /api
  if (import.meta.env.PROD) {
    API_BASE_URL = '/api';
    API_SERVER_BASE = window.location.origin;
  } else {
    // Em desenvolvimento, usa localhost
    API_BASE_URL = 'http://localhost:8000/api';
    API_SERVER_BASE = 'http://localhost:8000';
  }
} else {
  // Se VITE_API_URL está definido, calcula o servidor base
  API_SERVER_BASE = API_BASE_URL.replace('/api', '');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: injeta o token JWT em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Evita disparar N refreshes em paralelo quando várias chamadas tomam
// 401 ao mesmo tempo — todas aguardam a mesma promise de refresh.
let refreshPromise = null;

// Interceptor: trata respostas 401 (token expirado)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          if (!refreshPromise) {
            const refreshURL = `${API_SERVER_BASE}/api/auth/token/refresh/`;
            refreshPromise = axios
              .post(refreshURL, { refresh: refreshToken })
              .finally(() => {
                refreshPromise = null;
              });
          }
          const { data } = await refreshPromise;
          // O backend gira o refresh token a cada uso (ROTATE_REFRESH_TOKENS),
          // então o novo refresh token TEM que ser salvo também — senão o
          // próximo refresh usaria um token já invalidado e forçaria logout.
          setTokens({ access: data.access, refresh: data.refresh });
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch {
          clearTokens();
          notifyLoggedOut();
        }
      } else {
        clearTokens();
        notifyLoggedOut();
      }
    }

    throw error;
  },
);

export default api;

