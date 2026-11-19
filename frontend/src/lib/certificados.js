/**
 * Os certificados são texto livre, escrito pelo aluno. Para exibir, cada
 * linha vira um certificado, e dentro da linha reconhecemos o que der:
 *
 *   "AWS Cloud Practitioner, Amazon Web Services, 2026, 40h"
 *     → { titulo: 'AWS Cloud Practitioner', detalhes: 'Amazon Web Services', ano: '2026', horas: '40' }
 *
 * - separadores aceitos entre as partes: vírgula, ponto e vírgula, barra vertical
 *   ou " - " (com espaços);
 * - marcadores no início da linha ("-", "•", "*", "1.") são ignorados;
 * - o ano (1950 a 2099) e a carga horária ("40h", "40 h", "40 horas")
 *   viram chips e saem do texto;
 * - a primeira parte que sobra é o título; o resto, os detalhes.
 * Nada é obrigatório: uma linha só com o nome do curso também funciona.
 */

const MARCADOR = /^\s*(?:[-•*·]|\d+[.)])(?:\s+|$)/;
const SEPARADOR = /\s*[,;|]\s*|\s+-\s+/;
const ANO = /^(19[5-9]\d|20\d\d)$/;
const HORAS = /^(\d{1,4})\s*(?:h|hs|hrs?|horas?)$/i;

export function lerCertificado(linha) {
  const partes = linha.replace(MARCADOR, '').split(SEPARADOR).map((p) => p.trim()).filter(Boolean);
  let ano = '';
  let horas = '';
  const textos = [];
  partes.forEach((parte) => {
    const emHoras = parte.match(HORAS);
    if (!ano && ANO.test(parte)) ano = parte;
    else if (!horas && emHoras) horas = emHoras[1];
    else textos.push(parte);
  });
  const [titulo = linha.trim(), ...resto] = textos;
  return { titulo, detalhes: resto.join(' · '), ano, horas };
}

/** Texto livre → lista de certificados, uma por linha não vazia. */
export function listaDeCertificados(texto) {
  return (texto ?? '')
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.replace(MARCADOR, '').trim())
    .map(lerCertificado);
}
