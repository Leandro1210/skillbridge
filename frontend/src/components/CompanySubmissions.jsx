import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Icon from './ui/Icon';
import Modal from './ui/Modal';
import Skeleton from './ui/Skeleton';
import PageHeader from './ui/PageHeader';
import { List, ListItem } from './ui/ListItem';
import { Textarea } from './ui/Input';

const STATUS_META = {
  pendente: { icon: 'schedule', tone: 'warning', label: 'Pendente' },
  aprovado: { icon: 'check_circle', tone: 'success', label: 'Aprovado' },
  reprovado: { icon: 'cancel', tone: 'error', label: 'Reprovado' },
};

const FILTERS = [
  { value: 'pendente', label: 'Pendentes', icon: 'schedule' },
  { value: 'aprovado', label: 'Aprovadas', icon: 'check_circle' },
  { value: 'reprovado', label: 'Reprovadas', icon: 'cancel' },
  { value: '', label: 'Todas', icon: 'list_alt' },
];

/**
 * CompanySubmissions — Listar e Avaliar Submissões
 */
export default function CompanySubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pendente');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [evaluationStatus, setEvaluationStatus] = useState('aprovado');

  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const query = statusFilter ? `?status=${statusFilter}` : '';
      const { data } = await api.get(`/empresa/submissoes/${query}`);
      setSubmissions(data.results ?? data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar submissões');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleEvaluate = async () => {
    if (!selectedSubmission) return;
    try {
      await api.patch(`/empresa/submissoes/${selectedSubmission.id}/avaliar/`, {
        status: evaluationStatus,
        feedback_validacao: feedback,
      });
      setSelectedSubmission(null);
      setFeedback('');
      loadSubmissions();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail ?? 'Erro ao avaliar submissão');
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-96 rounded-[var(--radius-lg)]" />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 animate-[var(--animate-fade-in)]">
      <PageHeader
        title="Submissões dos Estudantes"
        description="Avalie as soluções enviadas pelos candidatos para os seus desafios técnicos."
      />

      {error && (
        <Card variant="outlined" padding="sm" className="mb-6 border-error/40 bg-error-container/20">
          <p className="font-medium text-error">{error}</p>
        </Card>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-label-large transition-colors ${
              statusFilter === f.value
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:bg-on-surface/5'
            }`}
          >
            <Icon name={f.icon} size="1rem" />
            {f.label}
          </button>
        ))}
      </div>

      {submissions.length > 0 ? (
        <List>
          {submissions.map((submission) => {
            const meta = STATUS_META[submission.status] ?? STATUS_META.pendente;
            return (
              <ListItem
                key={submission.id}
                leading={
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-highest text-title-medium text-on-surface">
                    {submission.usuario.nome?.charAt(0)?.toUpperCase()}
                  </div>
                }
                trailing={<Badge tone={meta.tone} dot>{meta.label}</Badge>}
                title={submission.usuario.nome}
              >
                <p className="text-body-small text-on-surface-variant">{submission.usuario.email}</p>
                <p className="mt-0.5 text-body-small font-medium text-primary">Etapa: {submission.etapa.descricao}</p>

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-body-small text-on-surface-variant">
                  {submission.repo_url && (
                    <a
                      href={submission.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Icon name="link" size="0.9rem" /> Ver solução
                    </a>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="calendar_today" size="0.9rem" />
                    {new Date(submission.entregue_em).toLocaleDateString('pt-BR')}
                  </span>
                  {submission.xp_ganho > 0 && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                      <Icon name="stars" size="0.9rem" /> {submission.xp_ganho} XP concedidos
                    </span>
                  )}
                </div>

                {submission.feedback_validacao && (
                  <div className="mt-3 rounded-[var(--radius-sm)] border-l-4 border-primary bg-primary-container/15 p-3">
                    <p className="mb-0.5 text-body-small font-bold uppercase tracking-wide text-primary">Feedback enviado</p>
                    <p className="text-body-small leading-relaxed text-on-surface">{submission.feedback_validacao}</p>
                  </div>
                )}

                {submission.status === 'pendente' && (
                  <div className="mt-4">
                    <Button variant="filled" size="sm" onClick={() => setSelectedSubmission(submission)}>
                      Avaliar Submissão
                    </Button>
                  </div>
                )}
              </ListItem>
            );
          })}
        </List>
      ) : (
        !loading && (
          <Card variant="outlined" padding="lg" className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant">
              <Icon name="feedback" size="1.75rem" />
            </div>
            <p className="text-title-medium text-on-surface">Nenhuma submissão encontrada</p>
            <p className="mt-1 text-body-medium text-on-surface-variant">
              Quando os estudantes enviarem soluções, elas aparecerão aqui.
            </p>
          </Card>
        )
      )}

      <Modal
        open={!!selectedSubmission}
        onClose={() => {
          setSelectedSubmission(null);
          setFeedback('');
          setEvaluationStatus('aprovado');
        }}
        title="Avaliar Submissão"
      >
        {selectedSubmission && (
          <div className="space-y-6">
            <p className="text-body-medium text-on-surface-variant">
              Candidato: <span className="font-medium text-on-surface">{selectedSubmission.usuario.nome}</span>
            </p>

            <div>
              <p className="mb-3 text-label-large text-on-surface-variant">Status da avaliação</p>
              <div className="flex gap-3">
                {[
                  { value: 'aprovado', icon: 'thumb_up', tone: 'text-success', activeBg: 'border-success bg-success-container/50' },
                  { value: 'reprovado', icon: 'thumb_down', tone: 'text-error', activeBg: 'border-error bg-error-container/50' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-md)] border p-4 transition-all ${
                      evaluationStatus === opt.value ? opt.activeBg : 'border-outline-variant hover:bg-on-surface/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.value}
                      checked={evaluationStatus === opt.value}
                      onChange={(e) => setEvaluationStatus(e.target.value)}
                      className="sr-only"
                    />
                    <Icon name={opt.icon} className={evaluationStatus === opt.value ? opt.tone : 'text-on-surface-variant'} />
                    <span className={`font-medium ${evaluationStatus === opt.value ? opt.tone : 'text-on-surface'}`}>
                      {opt.value === 'aprovado' ? 'Aprovar' : 'Reprovar'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Textarea
              label="Feedback ao candidato (opcional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Escreva seu feedback técnico. O que o estudante fez bem? Onde pode melhorar?"
              rows={4}
            />

            {evaluationStatus === 'aprovado' && (
              <div className="rounded-[var(--radius-sm)] border border-primary/30 bg-primary-container/20 p-4">
                <p className="flex items-center gap-2 text-body-medium font-medium text-primary">
                  <Icon name="stars" size="1.1rem" />
                  O estudante receberá pontos de XP pela conclusão desta etapa!
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-6 sm:flex-row">
              <Button
                variant="outlined"
                onClick={() => {
                  setSelectedSubmission(null);
                  setFeedback('');
                  setEvaluationStatus('aprovado');
                }}
              >
                Cancelar
              </Button>
              <Button variant="filled" className="flex-1" onClick={handleEvaluate}>
                Confirmar Avaliação
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
