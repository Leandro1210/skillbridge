import { useState, useEffect } from 'react';
import api from '../api';
import { DIFF_LABELS, DIFFICULTY_TONE } from '../lib/difficulty';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Icon from './ui/Icon';
import Modal from './ui/Modal';
import Spinner from './ui/Spinner';
import PageHeader from './ui/PageHeader';

export default function ProjectCatalog({ onProjectStarted }) {
  const [projects, setProjects] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedProject, setSelectedProject] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projRes, userRes] = await Promise.all([
          api.get('/projetos/'),
          api.get('/auth/me/'),
        ]);
        setProjects(projRes.data.results ?? projRes.data);
        setUser(userRes.data);
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar o catálogo.');
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  const handleStartProject = async () => {
    setStarting(true);
    setStartError('');
    try {
      await api.post(`/projetos/${selectedProject.id}/iniciar/`);
      setSelectedProject(null);
      if (onProjectStarted) setTimeout(onProjectStarted, 300);
    } catch (err) {
      setStartError(err.response?.data?.detail || 'Erro ao iniciar o projeto.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-error">{error}</p>;
  }

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PageHeader title="Explorar Projetos" description="Desafios técnicos reais propostos por empresas parceiras." />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((proj) => {
            const isLocked = user.nivel < proj.nivel_minimo;
            const label = DIFF_LABELS[proj.dificuldade] ?? 'Médio';
            const tone = DIFFICULTY_TONE[proj.dificuldade] ?? 'warning';

            return (
              <Card
                key={proj.id}
                variant={isLocked ? 'outlined' : 'elevated'}
                hoverable={!isLocked}
                onClick={() => !isLocked && setSelectedProject(proj)}
                className={isLocked ? 'relative flex flex-col opacity-60' : 'group relative flex flex-col'}
              >
                {isLocked && (
                  <div className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant">
                    <Icon name="lock" size="1rem" />
                  </div>
                )}

                <div className="mb-4">
                  <Badge tone={tone} dot>{label}</Badge>
                </div>

                <h3 className="text-title-medium leading-snug text-on-surface">{proj.titulo}</h3>

                <div className="mt-5 flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    {proj.ferramentas?.split(',').slice(0, 3).map((tool) => (
                      <span key={tool.trim()} className="rounded-[var(--radius-xs)] bg-surface-container-highest px-2 py-1 text-body-small text-on-surface-variant">
                        {tool.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-outline-variant pt-4">
                  <span className={`text-body-small font-medium ${isLocked ? 'text-error' : 'text-on-surface-variant/70'}`}>
                    Nível {proj.nivel_minimo}+
                  </span>
                  {!isLocked && (
                    <span className="flex items-center gap-1 text-label-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Ver detalhes <Icon name="arrow_forward" size="0.9rem" />
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <Modal open={!!selectedProject} onClose={() => setSelectedProject(null)}>
        {selectedProject && (
          <>
            <span className="mb-3 inline-block">
              <Badge tone="accent">Nível recomendado: {selectedProject.nivel_minimo}+</Badge>
            </span>
            <h3 className="text-headline-small text-on-surface">{selectedProject.titulo}</h3>

            <div className="mt-6 border-l-2 border-primary pl-4">
              <p className="text-body-large leading-relaxed text-on-surface-variant">{selectedProject.descricao}</p>
            </div>

            <div className="mb-2 mt-6">
              <h4 className="mb-3 flex items-center gap-1.5 text-title-small text-on-surface">
                <Icon name="build" size="1rem" /> Ferramentas utilizadas
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedProject.ferramentas?.split(',').map((tool) => (
                  <span key={tool.trim()} className="rounded-[var(--radius-sm)] border border-outline-variant bg-surface-container-highest px-3 py-1.5 text-body-small text-on-surface">
                    {tool.trim()}
                  </span>
                ))}
              </div>
            </div>

            {startError && (
              <div className="mt-6 rounded-[var(--radius-sm)] border border-error/30 bg-error-container/30 px-4 py-3 text-body-small text-error">
                {startError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-outline-variant pt-6 sm:flex-row">
              <Button variant="outlined" onClick={() => setSelectedProject(null)}>Cancelar</Button>
              <Button variant="filled" onClick={handleStartProject} disabled={starting} className="flex-1">
                {starting ? <Spinner size="sm" /> : <>Aceitar Desafio <Icon name="rocket_launch" size="1rem" /></>}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
