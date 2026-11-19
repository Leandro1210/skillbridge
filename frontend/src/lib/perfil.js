/** Vocabulário do perfil acadêmico — espelha core.models.TipoPublicacao. */
export const TIPOS_PUBLICACAO = {
  artigo: 'Artigo',
  resumo: 'Resumo em evento',
  tcc: 'TCC',
  iniciacao_cientifica: 'Iniciação científica',
  outro: 'Outro',
};

/** "React, , Python, React" → ["React", "Python"] (sem vazios nem repetidos). */
export function listaDeTecnologias(texto) {
  return [...new Set((texto ?? '').split(',').map((t) => t.trim()).filter(Boolean))];
}
