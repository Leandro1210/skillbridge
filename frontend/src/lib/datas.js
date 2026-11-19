/**
 * Datas em linguagem natural ("há 2 dias", "encerra amanhã") para o feed e a
 * página do desafio. `hoje` é parâmetro só para os testes poderem fixar a data.
 */

const DIA_MS = 24 * 60 * 60 * 1000;
const relativo = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

/** Meia-noite local da data — compara dias de calendário, não horas. */
function inicioDoDia(data) {
  const d = new Date(data);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** "YYYY-MM-DD" (campo DateField do Django) como data local, sem deslocar o fuso. */
function dataLocal(isoData) {
  const [ano, mes, dia] = isoData.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

function diasEntre(de, ate) {
  return Math.round((inicioDoDia(ate) - inicioDoDia(de)) / DIA_MS);
}

/** "hoje", "ontem", "há 5 dias", "há 2 meses"... */
export function publicadoHa(isoDataHora, hoje = new Date()) {
  if (!isoDataHora) return '';
  const dias = diasEntre(hoje, isoDataHora); // negativo: no passado
  if (dias > -30) return relativo.format(dias, 'day');
  return relativo.format(Math.round(dias / 30), 'month');
}

/** Texto do prazo, ou '' quando o desafio não tem prazo. */
export function textoPrazo(isoData, hoje = new Date()) {
  if (!isoData) return '';
  const dias = diasEntre(hoje, dataLocal(isoData));
  if (dias < 0) return 'Prazo encerrado';
  if (dias === 0) return 'Encerra hoje';
  if (dias === 1) return 'Encerra amanhã';
  return `Encerra em ${dias} dias`;
}

/** "31/12/2026" */
export function dataCurta(isoData) {
  if (!isoData) return '';
  return dataLocal(isoData).toLocaleDateString('pt-BR');
}
