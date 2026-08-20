/**
 * Fonte única de verdade para os tokens JWT. Antes os tokens eram
 * duplicados em sessionStorage E localStorage, lidos só de um dos dois
 * dependendo do arquivo, o que causava logouts forçados quando os dois
 * ficavam dessincronizados. Tudo passa por aqui agora.
 *
 * Evento "skillbridge:auth-logout" é disparado quando a sessão precisa
 * ser encerrada por fora de um componente React (ex: refresh token
 * expirado dentro do interceptor do axios) — App.jsx escuta esse evento
 * em vez de fazer um redirect de página inteira para uma rota que não existe.
 */

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isLoggedIn() {
  return !!getAccessToken();
}

export function notifyLoggedOut() {
  window.dispatchEvent(new Event('skillbridge:auth-logout'));
}
