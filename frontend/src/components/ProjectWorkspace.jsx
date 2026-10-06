import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import Card from './ui/Card';
import Button from './ui/Button';
import Icon from './ui/Icon';
import Spinner from './ui/Spinner';
import { Input } from './ui/Input';

/**
 * ProjectWorkspace — Tela de execução do projeto.
 * Exibe as etapas em um stepper na lateral e a etapa ativa no corpo.
 */
export default function ProjectWorkspace({ projectId, onBack }) {
  const [projeto, setProjeto] = useState(null);
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeEtapaId, setActiveEtapaId] = useState(null);

  const [repoUrl, setRepoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [projRes, entRes] = await Promise.all([
        api.get(`/projetos/${projectId}/`),
        api.get('/entregas/'),
      ]);

      const p = projRes.data;
      const e = entRes.data.results ?? entRes.data;

      setProjeto(p);
      setEntregas(e);

      let firstActiveId = null;
      for (const etapa of p.etapas) {
        const sub = e.find((s) => s.etapa === etapa.id);
        if (!sub || sub.status === 'reprovado') {
          firstActiveId = etapa.id;
          break;
        }
      }
      if (!firstActiveId && p.etapas.length > 0) {
        firstActiveId = p.etapas[p.etapas.length - 1].id;
      }
      setActiveEtapaId(firstActiveId);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar o projeto.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      void fetchData();
    }
  }, [projectId, fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      await api.post('/entregas/', { etapa_id: activeEtapaId, repo_url: repoUrl.trim() });
      setSubmitSuccess(true);
      setRepoUrl('');
      await fetchData();
    } catch (err) {
      setSubmitError(err.response?.data?.detail ?? 'Ocorreu um erro ao enviar a entrega.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Spinner size="lg" />
        <p className="text-body-medium text-on-surface-variant">Carregando workspace...</p>
      </div>
    );
  }

  if (error || !projeto) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-error">
        <p>{error}</p>
        <Button variant="text" onClick={onBack} className="mt-4">Voltar</Button>
      </div>
    );
  }

  const activeEtapaSelected = projeto.etapas.find((e) => e.id === activeEtapaId);
  const activeSubmission = entregas.find((s) => s.etapa === activeEtapaId) || null;
  const isAprovado = activeSubmission?.status === 'aprovado';
  const isPendente = activeSubmission?.status === 'pendente';
  const isReprovado = activeSubmission?.status === 'reprovado';

  return (
    <div className="mx-auto max-w-7xl animate-[var(--animate-fade-in)]">
      <div className="mb-8 border-b border-outline-variant pb-5">
        <button
          onClick={onBack}
          className="mb-2 inline-flex items-center gap-1 text-body-medium font-medium text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <Icon name="arrow_back" size="1rem" /> Voltar ao Dashboard
        </button>
        <h2 className="text-headline-medium text-on-surface">{projeto.titulo}</h2>
      </div>

      <Card variant="filled" padding="lg" className="mb-8 animate-[var(--animate-rise)]">
        <h3 className="mb-3 text-title-large text-on-surface">Visão Geral do Desafio</h3>
        <p className="mb-5 max-w-4xl whitespace-pre-wrap text-body-medium leading-relaxed text-on-surface-variant">
          {projeto.descricao}
        </p>
        {projeto.ferramentas && (
          <div>
            <h4 className="mb-2 text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">
              Ferramentas / tecnologias recomendadas
            </h4>
            <div className="flex flex-wrap gap-2">
              {[...new Set(projeto.ferramentas.split(',').map((f) => f.trim()).filter(Boolean))].map((f) => (
                <span key={f} className="rounded-[var(--radius-xs)] bg-surface-container-highest px-2.5 py-1 text-body-small text-on-surface">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Stepper */}
        <Card padding="lg" className="w-full shrink-0 lg:w-1/3 xl:w-1/4">
          <h3 className="mb-6 text-title-large text-on-surface">Progressão</h3>

          <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-outline-variant md:before:mx-auto md:before:translate-x-0">
            {projeto.etapas.map((etapa, idx) => {
              const sub = entregas.find((s) => s.etapa === etapa.id);
              const isEtapaAprovado = sub?.status === 'aprovado';
              const isEtapaPendente = sub?.status === 'pendente';
              const isCurrent = activeEtapaId === etapa.id;

              let bulletClass = 'bg-surface-container-highest text-on-surface-variant';
              if (isCurrent) bulletClass = 'bg-primary text-on-primary ring-4 ring-primary/20';
              else if (isEtapaAprovado) bulletClass = 'bg-primary text-on-primary';
              else if (isEtapaPendente) bulletClass = 'bg-tertiary text-on-tertiary';

              let bulletContent = idx + 1;
              let statusLabel = 'Bloqueada';
              if (isEtapaAprovado) {
                bulletContent = <Icon name="check" size="1.1rem" />;
                statusLabel = 'Concluída';
              } else if (isEtapaPendente) {
                bulletContent = <Spinner size="sm" className="text-on-tertiary" />;
                statusLabel = 'Em validação...';
              }

              return (
                <button
                  type="button"
                  key={etapa.id}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`relative flex cursor-pointer items-center gap-4 transition-all ${isCurrent ? 'scale-105 opacity-100' : 'opacity-70 hover:opacity-100'}`}
                  onClick={() => setActiveEtapaId(etapa.id)}
                >
                  <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-label-large font-bold transition-all ${bulletClass}`}>
                    {bulletContent}
                  </div>
                  <div>
                    <p className={`font-medium ${isCurrent ? 'text-primary' : 'text-on-surface'}`}>Etapa {etapa.ordem}</p>
                    <p className="max-w-[150px] truncate text-body-small text-on-surface-variant/70">
                      {statusLabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Etapa ativa */}
        <div className="flex-1 space-y-6">
          {activeEtapaSelected && (
            <Card padding="sm" className="animate-[var(--animate-rise)] overflow-hidden !p-0">
              {isAprovado && (
                <div className="flex items-center gap-2 border-b border-primary/20 bg-primary-container/25 px-6 py-3 text-primary">
                  <Icon name="check_circle" size="1.1rem" />
                  <span className="text-body-medium font-medium">Etapa concluída e aprovada!</span>
                </div>
              )}
              {isPendente && (
                <div className="flex items-center gap-2 border-b border-tertiary/20 bg-tertiary-container/25 px-6 py-3 text-tertiary">
                  <Spinner size="sm" />
                  <span className="text-body-medium font-medium">Validação em andamento (pendente)...</span>
                </div>
              )}
              {isReprovado && (
                <div className="border-b border-error/20 bg-error-container/20 px-6 py-4 text-error">
                  <div className="mb-1 flex items-center gap-2 font-bold">
                    <Icon name="warning" size="1.1rem" /> Entrega Reprovada
                  </div>
                  <p className="text-body-medium">Feedback: {activeSubmission.feedback_validacao}</p>
                </div>
              )}

              <div className="p-6 sm:p-8">
                <h3 className="mb-4 text-title-large text-on-surface">
                  Objetivo: <span className="font-normal text-on-surface-variant">{activeEtapaSelected.descricao}</span>
                </h3>

                <div className="mb-8 rounded-[var(--radius-md)] border border-outline-variant bg-surface-container-low p-5">
                  <h4 className="mb-3 flex items-center gap-2 font-medium text-primary">
                    <Icon name="verified" size="1.1rem" /> Critérios de Aceite Técnicos
                  </h4>
                  <p className="whitespace-pre-wrap border-l-2 border-primary/30 pl-3 text-body-medium leading-relaxed text-on-surface-variant">
                    {activeEtapaSelected.criterios_tecnicos}
                  </p>
                </div>

                {!isAprovado && !isPendente && (
                  <form onSubmit={handleSubmit} className="border-t border-outline-variant pt-6">
                    <h4 className="mb-4 text-title-medium text-on-surface">Enviar Entrega</h4>

                    {submitSuccess && (
                      <div className="mb-4 rounded-[var(--radius-sm)] border border-primary/30 bg-primary-container/25 px-4 py-3 text-body-medium font-medium text-primary">
                        Sucesso! Sua entrega foi enviada e está na fila de validação.
                      </div>
                    )}
                    {submitError && (
                      <div className="mb-4 rounded-[var(--radius-sm)] border border-error/30 bg-error-container/20 px-4 py-3 text-body-medium text-error">
                        {submitError}
                      </div>
                    )}

                    <Input
                      type="url"
                      label={<>Formato exigido: <span className="font-bold uppercase text-primary">{activeEtapaSelected.formato_entrega}</span></>}
                      placeholder="https://github.com/usuario/repositorio"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      required
                      disabled={submitting}
                      className="mb-4"
                    />

                    <Button type="submit" variant="filled" disabled={submitting || !repoUrl.trim()} className="w-full sm:w-auto">
                      {submitting ? (
                        <>
                          <Spinner size="sm" className="text-on-primary" /> Validando...
                        </>
                      ) : (
                        'Enviar para Validação'
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
