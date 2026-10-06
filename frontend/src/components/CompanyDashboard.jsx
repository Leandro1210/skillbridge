import { useState, useEffect } from 'react';
import api from '../api';
import Card from './ui/Card';
import Icon from './ui/Icon';
import Skeleton from './ui/Skeleton';
import PageHeader from './ui/PageHeader';
import { ListItem } from './ui/ListItem';

const STAT_TILES = [
  { key: 'total_desafios', label: 'Desafios', tone: 'text-primary', extra: (s) => `${s.desafios_ativos} ativos` },
  { key: 'submissoes_pendentes', label: 'Pendentes', tone: 'text-warning' },
  { key: 'submissoes_aprovadas', label: 'Aprovadas', tone: 'text-success' },
  { key: 'submissoes_reprovadas', label: 'Reprovadas', tone: 'text-error' },
  { key: 'total_submissoes', label: 'Total Submissões', tone: 'text-on-surface' },
  { key: 'estudantes_unicos', label: 'Estudantes', tone: 'text-secondary' },
];

const ACTIONS = [
  {
    page: 'company-desafios',
    icon: 'checklist',
    title: 'Gerenciar Desafios',
    description: 'Criar, editar e publicar desafios técnicos.',
  },
  {
    page: 'company-submissoes',
    icon: 'task_alt',
    title: 'Avaliar Submissões',
    description: (stats) => `${stats.submissoes_pendentes} aguardando avaliação`,
  },
  {
    page: null,
    icon: 'trending_up',
    title: 'Ver Resultados',
    description: 'Em breve',
    disabled: true,
  },
];

/**
 * CompanyDashboard — Painel da Empresa
 */
export default function CompanyDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/empresa/dashboard/');
      setStats(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-[var(--radius-lg)] lg:col-span-2" />
            <Skeleton className="h-72 rounded-[var(--radius-lg)]" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center text-error">
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 animate-[var(--animate-fade-in)]">
      <PageHeader
        title="Dashboard da Empresa"
        description="Bem-vindo de volta, acompanhe o desempenho dos seus desafios de recrutamento."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card padding="lg" className="lg:col-span-2">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-md)] bg-primary-container text-title-large text-on-primary-container">
              {stats.empresa.nome?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-title-large text-on-surface">{stats.empresa.nome}</h2>
              <p className="text-body-medium text-on-surface-variant">{stats.empresa.setor || 'Setor não informado'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {STAT_TILES.map((tile) => (
              <div key={tile.key} className="rounded-[var(--radius-md)] bg-surface-container-low p-4">
                <div className="mb-1 text-body-small font-medium text-on-surface-variant/70">{tile.label}</div>
                <div className={`text-headline-small font-mono ${tile.tone}`}>{stats[tile.key]}</div>
                {tile.extra && <div className="mt-1 text-body-small text-on-surface-variant/70">{tile.extra(stats)}</div>}
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <p className="mb-2 text-title-small text-on-surface">Ações Rápidas</p>
          <div className="-mx-2">
            {ACTIONS.map((action) => (
              <ListItem
                key={action.title}
                className={`cursor-pointer px-2 transition-colors hover:bg-on-surface/5 ${action.disabled ? 'pointer-events-none opacity-50' : ''}`}
                onClick={() => action.page && onNavigate(action.page)}
                leading={
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                    <Icon name={action.icon} size="1.2rem" />
                  </div>
                }
                title={action.title}
                subtitle={typeof action.description === 'function' ? action.description(stats) : action.description}
                trailing={!action.disabled && <Icon name="arrow_forward" size="1.1rem" className="text-on-surface-variant/60" />}
              />
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
