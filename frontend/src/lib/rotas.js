/**
 * Converte o `:id` de uma rota num número inteiro positivo, ou `null` se não
 * for um. O id vem da URL, que qualquer um pode montar: sem essa checagem, um
 * link como `/alunos/..%2Fempresa%2Fsubmissoes` faria a página chamar outro
 * endpoint da API com o token de quem abriu o link.
 */
export function idDaRota(valor) {
  if (typeof valor === 'number') return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) return null;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}
