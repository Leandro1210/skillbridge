import { useState, useEffect } from 'react';
import api from '../api';
import { DIFF_LABELS, DIFFICULTY_TONE } from '../lib/difficulty';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Icon from './ui/Icon';
import Skeleton from './ui/Skeleton';

/** Painel principal do aluno: perfil, progresso de XP e desafios em andamento. */
export default function Dashboard({ onContinueProject }) {
  const [user, setUser] = useState(null);
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [xpAnimated, setXpAnimated] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, inscRes] = await Promise.all([
          api.get('/auth/me/'),
          api.get('/inscricoes/'),
        ]);
        setUser(userRes.data);
        setInscricoes(inscRes.data.results ?? inscRes.data);
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Anima a barra de XP apos carregar
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      setXpAnimated(user.xp_total % 1000);
    }, 300);
    return () => clearTimeout(timer);
  }, [user]);

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="flex items-center gap-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-20 rounded-[var(--radius-lg)]" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-[var(--radius-lg)]" />
            <Skeleton className="h-40 rounded-[var(--radius-lg)]" />
          </div>
        </div>
      </section>
    );
  }

  if (!user) return null;

  const xpInLevel = user.xp_total % 1000;
  const xpNeeded = 1000;
  const xpPercent = (xpAnimated / xpNeeded) * 100;
  const nextLevel = user.nivel + 1;
  const concluidos = inscricoes.filter((i) => i.status === 'concluido').length;
  const emAndamento = inscricoes.length - concluidos;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

      {/* Cabeçalho de perfil */}
      <Card padding="lg" className="animate-[var(--animate-fade-in)]">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-container text-3xl font-medium text-on-primary-container sm:h-24 sm:w-24">
              {user.avatar ? (
                <img src={user.avatar} alt={user.nome} className="h-full w-full rounded-full object-cover" />
              ) : (
                user.nome?.charAt(0)?.toUpperCase() || '?'
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-label-medium font-bold text-on-primary shadow-[var(--shadow-elevation-1)]">
              {user.nivel}
            </div>
          </div>

          <div className="text-center sm:text-left">
            <h1 className="text-headline-medium text-on-surface">{user.nome}</h1>
            <p className="mt-1 text-body-medium text-on-surface-variant">
              {user.perfil?.titulo || 'Estudante SkillBridge'}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge tone="accent">Nível {user.nivel}</Badge>
              <Badge tone="neutral" className="font-mono">{user.xp_total} XP</Badge>
              {/* O verde agora significa sucesso de verdade, então o tom
                  precisa acompanhar o número — 0% num selo verde mentiria. */}
              <Badge tone={user.taxa_sucesso >= 70 ? 'success' : user.taxa_sucesso >= 40 ? 'warning' : 'neutral'}>
                {user.taxa_sucesso}% sucesso
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Progresso de XP + resumo, lado a lado em telas largas */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          padding="md"
          className="animate-[var(--animate-rise)] lg:col-span-2"
          style={{ animationDelay: '80ms', animationFillMode: 'both' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-title-small text-on-surface">Progresso para Nível {nextLevel}</span>
            <span className="text-body-small font-mono text-on-surface-variant">{xpInLevel} / {xpNeeded} XP</span>
          </div>

          <div className="relative h-3 overflow-hidden rounded-full bg-surface-container-highest">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${xpPercent}%`,
                // As duas cores da logo, na ordem em que aparecem na marca:
                // a progressão é o único momento decorativo do sistema.
                background: 'linear-gradient(90deg, var(--sb-logo-blue), var(--sb-logo-green))',
                transition: 'width 1.2s cubic-bezier(0.2, 0, 0, 1)',
              }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full opacity-40"
              style={{
                width: `${xpPercent}%`,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s ease-in-out infinite',
                transition: 'width 1.2s cubic-bezier(0.2, 0, 0, 1)',
              }}
            />
          </div>

          <p className="mt-2 text-body-small text-on-surface-variant">
            Faltam <span className="font-medium text-primary">{xpNeeded - xpInLevel} XP</span> para alcançar o nível {nextLevel}
          </p>
        </Card>

        <Card
          padding="md"
          className="animate-[var(--animate-rise)]"
          style={{ animationDelay: '110ms', animationFillMode: 'both' }}
        >
          <p className="mb-3 text-title-small text-on-surface">Resumo</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-headline-small font-mono text-primary">{emAndamento}</p>
              <p className="text-body-small text-on-surface-variant/70">Em andamento</p>
            </div>
            <div>
              <p className="text-headline-small font-mono text-on-surface">{concluidos}</p>
              <p className="text-body-small text-on-surface-variant/70">Concluídos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Onboarding */}
      <Card
        variant="filled"
        padding="lg"
        className="mt-8 animate-[var(--animate-rise)]"
        style={{ animationDelay: '140ms', animationFillMode: 'both' }}
      >
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
            <Icon name="rocket_launch" size="1.5rem" />
          </div>
          <div>
            <h2 className="mb-1.5 text-title-large text-on-surface">Bem-vindo ao SkillBridge</h2>
            <p className="max-w-3xl text-body-medium leading-relaxed text-on-surface-variant">
              Comece pelo seu perfil. Preencha a instituição onde você estuda, as
              tecnologias que já domina e o link do seu portfólio, onde ficam reunidos
              seus trabalhos acadêmicos e projetos pessoais. Logo abaixo estão os desafios
              publicados pelas empresas. Cada um mostra o nível mínimo necessário e os
              critérios técnicos que serão avaliados. Toda etapa aprovada rende XP e
              aproxima você do próximo nível, que libera desafios mais difíceis.
            </p>
          </div>
        </div>
      </Card>

      {/* Desafios em andamento */}
      <div className="mt-10 animate-[var(--animate-rise)]" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
        <h2 className="mb-5 flex items-center gap-2 text-title-large text-on-surface">
          <Icon name="checklist" className="text-primary" />
          Seus Desafios Ativos
        </h2>

        {inscricoes.length === 0 ? (
          <Card variant="outlined" padding="lg" className="text-center">
            <Icon name="explore" size="2.5rem" className="mx-auto mb-3 text-on-surface-variant/50" />
            <p className="font-medium text-on-surface-variant">Você ainda não iniciou nenhum desafio de empresa.</p>
            <p className="mt-2 text-body-small text-on-surface-variant/70">
              Explore o catálogo abaixo e clique em "Aceitar Desafio" para começar a enviar seu código.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {inscricoes.map((insc) => {
              const label = DIFF_LABELS[insc.projeto_dificuldade] ?? 'Médio';
              const tone = DIFFICULTY_TONE[insc.projeto_dificuldade] ?? 'warning';
              const date = new Date(insc.iniciado_em).toLocaleDateString('pt-BR');

              return (
                <Card key={insc.id} hoverable padding="md" className="flex flex-col">
                  <div className="mb-3 flex items-start justify-between">
                    <Badge tone={tone} dot>{label}</Badge>
                    <Badge tone={insc.status === 'concluido' ? 'success' : 'accent'}>
                      {insc.status === 'concluido' ? 'Concluído' : 'Em andamento'}
                    </Badge>
                  </div>

                  <h3 className="text-title-medium text-on-surface">{insc.projeto_titulo}</h3>
                  <p className="mt-1.5 flex-1 text-body-medium text-on-surface-variant line-clamp-2">
                    {insc.projeto_descricao}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-3">
                    <span className="text-body-small text-on-surface-variant/70">Iniciado em {date}</span>
                    <Button variant="tonal" size="sm" onClick={() => onContinueProject?.(insc.projeto)}>
                      Continuar
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
