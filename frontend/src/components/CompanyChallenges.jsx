import { useState, useEffect } from 'react';
import api from '../api';
import { DIFF_LABELS, DIFFICULTY_TONE } from '../lib/difficulty';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Icon from './ui/Icon';
import Skeleton from './ui/Skeleton';
import PageHeader from './ui/PageHeader';
import Fab from './ui/Fab';
import { Input, Textarea, Select } from './ui/Input';

const EMPTY_FORM = {
  titulo: '',
  descricao: '',
  ferramentas: '',
  dificuldade: 'medio',
  nivel_minimo: 1,
};

/**
 * CompanyChallenges — Gerenciar Desafios da Empresa
 */
export default function CompanyChallenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/empresa/projetos/');
      setChallenges(data.results ?? data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar desafios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch(`/empresa/projetos/${editingId}/`, formData);
      } else {
        await api.post('/empresa/projetos/', formData);
      }
      resetForm();
      loadChallenges();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail ?? 'Erro ao salvar desafio');
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setShowForm(false);
    setEditingId(null);
  };

  const handlePublish = async (id) => {
    try {
      await api.post(`/empresa/projetos/${id}/publicar/`);
      loadChallenges();
    } catch (err) {
      console.error(err);
      setError('Erro ao publicar desafio');
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await api.post(`/empresa/projetos/${id}/desativar/`);
      loadChallenges();
    } catch (err) {
      console.error(err);
      setError('Erro ao desativar desafio');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este desafio?')) {
      try {
        await api.delete(`/empresa/projetos/${id}/`);
        loadChallenges();
      } catch (err) {
        console.error(err);
        setError('Erro ao deletar desafio');
      }
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <Skeleton className="h-12 w-48" />
          <div className="grid gap-6 sm:grid-cols-2">
            <Skeleton className="h-48 rounded-[var(--radius-lg)]" />
            <Skeleton className="h-48 rounded-[var(--radius-lg)]" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 animate-[var(--animate-fade-in)]">
      <PageHeader
        title="Meus Desafios"
        description="Crie e gerencie os desafios técnicos para avaliação de candidatos."
      />

      {!showForm && (
        <Fab
          icon="add"
          label="Novo Desafio"
          className="bottom-24 right-6 lg:bottom-6"
          onClick={() => setShowForm(true)}
        />
      )}

      {error && (
        <Card variant="outlined" padding="sm" className="mb-6 border-error/40 bg-error-container/20">
          <p className="font-medium text-error">{error}</p>
        </Card>
      )}

      {showForm && (
        <Card padding="lg" className="mb-10 animate-[var(--animate-rise)]">
          <h2 className="mb-6 border-b border-outline-variant pb-4 text-title-large text-on-surface">
            {editingId ? 'Editar Desafio' : 'Criar Novo Desafio'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Título do Desafio"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: API de E-commerce com Node.js"
              required
            />
            <Textarea
              label="Descrição Detalhada"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva o que o candidato deve construir, os requisitos técnicos e critérios de avaliação..."
              rows={5}
              required
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="Ferramentas (separadas por vírgula)"
                value={formData.ferramentas}
                onChange={(e) => setFormData({ ...formData, ferramentas: e.target.value })}
                placeholder="React, Node.js, MongoDB"
              />
              <Select
                label="Dificuldade"
                value={formData.dificuldade}
                onChange={(e) => setFormData({ ...formData, dificuldade: e.target.value })}
              >
                <option value="facil">Fácil</option>
                <option value="medio">Médio</option>
                <option value="dificil">Difícil</option>
              </Select>
              <Input
                type="number"
                min="1"
                label="Nível Mínimo Exigido (Estudante)"
                value={formData.nivel_minimo}
                onChange={(e) => setFormData({ ...formData, nivel_minimo: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-outline-variant pt-4 sm:flex-row">
              <Button type="button" variant="outlined" onClick={resetForm}>Cancelar</Button>
              <Button type="submit" variant="filled">
                {editingId ? 'Salvar Alterações' : 'Criar Desafio'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {challenges.map((challenge) => {
          const label = DIFF_LABELS[challenge.dificuldade] ?? challenge.dificuldade;
          const tone = DIFFICULTY_TONE[challenge.dificuldade] ?? 'warning';
          return (
            <Card key={challenge.id} padding="lg" hoverable className="flex flex-col">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="mb-2 line-clamp-1 text-title-large text-on-surface" title={challenge.titulo}>
                    {challenge.titulo}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">Nível mín: {challenge.nivel_minimo}</Badge>
                    <Badge tone={tone} dot>{label}</Badge>
                  </div>
                </div>
                <Badge tone={challenge.ativo ? 'success' : 'neutral'} dot className="shrink-0">
                  {challenge.ativo ? 'Ativo' : 'Rascunho'}
                </Badge>
              </div>

              <p className="mb-4 flex-1 line-clamp-3 text-body-medium text-on-surface-variant">
                {challenge.descricao}
              </p>

              {challenge.ferramentas && (
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {challenge.ferramentas.split(',').map((ferramenta, i) => (
                    <span key={i} className="rounded-[var(--radius-xs)] bg-surface-container-highest px-2.5 py-0.5 text-body-small text-on-surface-variant">
                      {ferramenta.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* flex-wrap em vez de grid-cols-3 fixo: em telas estreitas
                  "Desativar" não cabe em um terço da largura e empurrava o
                  card — e com ele a página inteira — para fora da viewport. */}
              <div className="mt-auto flex flex-wrap gap-2 border-t border-outline-variant pt-4">
                {challenge.ativo ? (
                  <Button variant="outlined" size="sm" onClick={() => handleDeactivate(challenge.id)}>Desativar</Button>
                ) : (
                  <Button variant="tonal" size="sm" onClick={() => handlePublish(challenge.id)}>Publicar</Button>
                )}
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => {
                    setFormData(challenge);
                    setEditingId(challenge.id);
                    setShowForm(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Editar
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(challenge.id)}>Excluir</Button>
              </div>
            </Card>
          );
        })}
      </div>

      {challenges.length === 0 && !showForm && !loading && (
        <Card variant="outlined" padding="lg" className="mt-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <Icon name="checklist" size="1.75rem" />
          </div>
          <h3 className="mb-2 text-title-large text-on-surface">Nenhum desafio criado</h3>
          <p className="mb-6 max-w-md text-body-medium text-on-surface-variant">
            Crie desafios técnicos para começar a receber submissões e identificar os melhores talentos para sua empresa.
          </p>
          <Button variant="filled" onClick={() => setShowForm(true)}>Criar Primeiro Desafio</Button>
        </Card>
      )}
    </section>
  );
}
