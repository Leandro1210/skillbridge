import { listaDeCertificados } from '../lib/certificados';
import Icon from './ui/Icon';

/**
 * Certificados do aluno em cartões: um por linha do texto livre, com o
 * título em destaque, a instituição e os chips de ano e carga horária.
 * Usado no perfil e na pré-visualização da edição.
 */
export default function ListaCertificados({ texto, rotulo = 'Certificados' }) {
  const certificados = listaDeCertificados(texto);
  if (certificados.length === 0) return null;

  return (
    <ul className="em-sequencia grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label={rotulo}>
      {certificados.map((c, i) => (
        <li
          key={`${c.titulo}-${i}`}
          className="flex gap-3.5 rounded-[var(--radius-md)] border border-outline-variant/80 bg-surface-container-lowest p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-elevation-1)]"
        >
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success-container text-success">
            <Icon name="workspace_premium" size="1.35rem" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-title-small text-on-surface wrap-anywhere">{c.titulo}</p>
            {c.detalhes && <p className="mt-0.5 text-body-small text-on-surface-variant wrap-anywhere">{c.detalhes}</p>}
            {(c.ano || c.horas) && (
              <p className="mt-2 flex flex-wrap gap-1.5">
                {c.ano && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2.5 py-0.5 text-label-small text-on-primary-container">
                    <Icon name="calendar_today" size="0.8rem" /> {c.ano}
                  </span>
                )}
                {c.horas && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-0.5 text-label-small text-on-surface-variant">
                    <Icon name="schedule" size="0.8rem" /> {c.horas} horas
                  </span>
                )}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
