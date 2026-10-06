import { useState, useEffect } from 'react';
import api from '../api';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Icon from './ui/Icon';
import Skeleton from './ui/Skeleton';

/**
 * StudentProfileView — Visualizar perfil do estudante autenticado.
 */
export default function StudentProfileView() {
  const [student, setStudent] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadStudentProfile();
  }, []);

  const loadStudentProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/auth/me/');
      setStudent(data);
      if (data.perfil) setProfile(data.perfil);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar perfil do estudante');
    } finally {
      setLoading(false);
    }
  };

  const getTecnologiasList = () => {
    if (!profile?.tecnologias) return [];
    const techs = profile.tecnologias.split(',').map((t) => t.trim()).filter(Boolean);
    return [...new Set(techs)];
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-20 rounded-[var(--radius-lg)]" />
        </div>
      </section>
    );
  }

  if (error || !student) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Card variant="outlined" padding="lg" className="border-error/40 bg-error-container/20">
          <p className="font-medium text-error">{error || 'Perfil não encontrado'}</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 animate-[var(--animate-fade-in)]">
      <Card padding="lg" className="mb-6">
        <div className="flex flex-col items-start gap-6 sm:flex-row">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary-container text-headline-medium text-on-primary-container">
            {student.nome?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-headline-medium text-on-surface">{student.nome}</h1>
            {profile?.titulo && <p className="mt-1 text-title-medium text-primary">{profile.titulo}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-body-medium text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="mail" size="1rem" /> {student.email}
              </span>
              <Badge tone="accent">Nível {student.nivel}</Badge>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-outline-variant pt-6 sm:grid-cols-3">
          <div>
            <p className="text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">XP Total</p>
            <p className="mt-1 text-headline-small font-mono text-primary">{student.xp_total}</p>
          </div>
          <div>
            <p className="text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">Taxa Sucesso</p>
            <p className="mt-1 text-headline-small font-mono text-primary">{student.taxa_sucesso}%</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">Status</p>
            <Badge tone="success" dot className="mt-1">Ativo</Badge>
          </div>
        </div>
      </Card>

      {profile?.bio && (
        <Card padding="lg" className="mb-6">
          <h2 className="mb-3 text-title-large text-on-surface">Sobre</h2>
          <p className="leading-relaxed text-on-surface-variant">{profile.bio}</p>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {profile?.instituicao_ensino && (
          <Card padding="lg">
            <p className="mb-2 flex items-center gap-1.5 text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">
              <Icon name="school" size="0.95rem" /> Instituição de Ensino
            </p>
            <p className="text-title-medium text-on-surface">{profile.instituicao_ensino}</p>
          </Card>
        )}

        {getTecnologiasList().length > 0 && (
          <Card padding="lg">
            <p className="mb-3 flex items-center gap-1.5 text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">
              <Icon name="code_blocks" size="0.95rem" /> Tecnologias
            </p>
            <div className="flex flex-wrap gap-2">
              {getTecnologiasList().map((tech) => (
                <Badge key={tech} tone="neutral">{tech}</Badge>
              ))}
            </div>
          </Card>
        )}
      </div>

      {profile?.portfolio_url && (
        <Card padding="lg" className="mb-6">
          <p className="mb-2 flex items-center gap-1.5 text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">
            <Icon name="link" size="0.95rem" /> Portfólio
          </p>
          <a
            href={profile.portfolio_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 break-all text-body-medium font-medium text-primary hover:underline"
          >
            {profile.portfolio_url} <Icon name="open_in_new" size="0.9rem" />
          </a>
        </Card>
      )}

      {profile?.descricao_adicional && (
        <Card padding="lg">
          <h2 className="mb-3 text-title-large text-on-surface">Informações Adicionais</h2>
          <p className="whitespace-pre-wrap leading-relaxed text-on-surface-variant">{profile.descricao_adicional}</p>
        </Card>
      )}
    </section>
  );
}
