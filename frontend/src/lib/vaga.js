/**
 * Vocabulário da vaga — espelha core.models.TipoVaga. Cada desafio do feed é
 * um processo seletivo: a vaga (o que a empresa oferece e espera) e o desafio
 * (o que testa o conhecimento do aluno).
 */
export const MODALIDADES = {
  remoto: 'Remoto',
  presencial: 'Presencial',
  hibrido: 'Híbrido',
};

/**
 * Título a exibir para a vaga. Desafios antigos (de antes da separação) não
 * têm vaga: o título do desafio ocupa o lugar.
 */
export function tituloDaVaga(desafio) {
  return desafio.vaga_titulo || desafio.titulo;
}
