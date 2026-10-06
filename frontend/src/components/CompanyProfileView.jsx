import { useState, useEffect } from 'react';
import api from '../api';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Icon from './ui/Icon';
import Skeleton from './ui/Skeleton';

/**
 * CompanyProfileView — Visualizar perfil da empresa autenticada.
 *
 * Props:
 *   onNavigate (function) — opcional, usado pelo CTA "Ver Desafios".
 */
export default function CompanyProfileView({ onNavigate }) {
  const [company, setCompany] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadCompanyProfile();
  }, []);

  const loadCompanyProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/perfil/empresa/');
      setProfile(data);
      const dashboardRes = await api.get('/empresa/dashboard/');
      setCompany(dashboardRes.data.empresa);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar perfil da empresa');
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

  if (error || !company) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Card variant="outlined" padding="lg" className="border-error/40 bg-error-container/20">
          <p className="font-medium text-error">{error || 'Empresa não encontrada'}</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 animate-[var(--animate-fade-in)]">
      <Card padding="lg" className="mb-6">
        <div className="flex flex-col items-start gap-6 sm:flex-row">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary-container text-headline-medium text-on-primary-container">
            {company.nome?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-headline-medium text-on-surface">{company.nome}</h1>
            {profile?.area_atuacao && <p className="mt-1 text-title-medium text-primary">{profile.area_atuacao}</p>}
            {company.setor && (
              <p className="mt-2 text-body-medium text-on-surface-variant">
                Setor: <span className="font-medium text-on-surface">{company.setor}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-outline-variant pt-6 sm:grid-cols-4">
          <div>
            <p className="text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">Desafios Ativos</p>
            <p className="mt-1 text-headline-small font-mono text-primary">—</p>
          </div>
          <div>
            <p className="text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">Total Submissões</p>
            <p className="mt-1 text-headline-small font-mono text-secondary">—</p>
          </div>
          <div>
            <p className="text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">Candidatos</p>
            <p className="mt-1 text-headline-small font-mono text-primary">—</p>
          </div>
          <div>
            <p className="text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">Status</p>
            <Badge tone="success" dot className="mt-1">Ativa</Badge>
          </div>
        </div>
      </Card>

      {company.descricao && (
        <Card padding="lg" className="mb-6">
          <h2 className="mb-3 text-title-large text-on-surface">Sobre</h2>
          <p className="leading-relaxed text-on-surface-variant">{company.descricao}</p>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {profile?.website && (
          <Card padding="lg">
            <p className="mb-2 text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">Website</p>
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 break-all text-body-medium font-medium text-primary hover:underline"
            >
              {profile.website} <Icon name="open_in_new" size="0.9rem" />
            </a>
          </Card>
        )}

        {company.setor && (
          <Card padding="lg">
            <p className="mb-2 text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">Setor</p>
            <p className="text-title-medium text-on-surface">{company.setor}</p>
          </Card>
        )}
      </div>

      {getTecnologiasList().length > 0 && (
        <Card padding="lg" className="mb-6">
          <p className="mb-3 text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">Stack Tecnológico</p>
          <div className="flex flex-wrap gap-2">
            {getTecnologiasList().map((tech) => (
              <Badge key={tech} tone="neutral">
                {tech}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {profile?.descricao_adicional && (
        <Card padding="lg" className="mb-6">
          <h2 className="mb-3 text-title-large text-on-surface">Informações Adicionais</h2>
          <p className="whitespace-pre-wrap leading-relaxed text-on-surface-variant">{profile.descricao_adicional}</p>
        </Card>
      )}

      <Card variant="filled" padding="lg">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <h3 className="text-title-large text-on-surface">Interessado em trabalhar conosco?</h3>
            <p className="mt-1 text-body-medium text-on-surface-variant">
              Veja os desafios disponíveis e comece sua jornada conosco.
            </p>
          </div>
          <Button variant="filled" onClick={() => onNavigate?.('company-desafios')} className="whitespace-nowrap">
            Ver Desafios <Icon name="arrow_forward" size="1rem" />
          </Button>
        </div>
      </Card>
    </section>
  );
}
