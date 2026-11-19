import { useState, useEffect } from 'react';
import api from '../api';
import { DIFF_LABELS, DIFFICULTY_TONE } from '../lib/difficulty';
import { textoPrazo } from '../lib/datas';
import { MODALIDADES, tituloDaVaga } from '../lib/vaga';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Icon from './ui/Icon';
import Skeleton from './ui/Skeleton';
import PageHeader from './ui/PageHeader';
import { Input, Textarea, Select } from './ui/Input';

const EMPTY_FORM = {
  vaga_titulo: '',
  vaga_modalidade: '',
  vaga_descricao: '',
  vaga_tecnologias: '',
  titulo: '',
  descricao: '',
  ferramentas: '',
  dificuldade: 'intermediario',
  prazo: '',
  periodo_recomendado: '',
};

const STATUS = {
  rascunho: { rotulo: 'Rascunho', tom: 'neutral' },
  publicado: { rotulo: 'Publicado', tom: 'success' },
  encerrado: { rotulo: 'Encerrado', tom: 'error' },
};

/** Campos que a API aceita; vazio vira null (prazo e período são opcionais). */
function paraPayload(form) {
  return {
    vaga_titulo: form.vaga_titulo,
    vaga_modalidade: form.vaga_modalidade,
    vaga_descricao: form.vaga_descricao,
    vaga_tecnologias: form.vaga_tecnologias,
    titulo: form.titulo,
    descricao: form.descricao,
    ferramentas: form.ferramentas,
    dificuldade: form.dificuldade,
    prazo: form.prazo || null,
    periodo_recomendado: form.periodo_recomendado === '' ? null : Number(form.periodo_recomendado),
  };
}

function paraFormulario(desafio) {
  return {
    vaga_titulo: desafio.vaga_titulo ?? '',
    vaga_modalidade: desafio.vaga_modalidade ?? '',
    vaga_descricao: desafio.vaga_descricao ?? '',
    vaga_tecnologias: desafio.vaga_tecnologias ?? '',
    titulo: desafio.titulo,
    descricao: desafio.descricao,
    ferramentas: desafio.ferramentas ?? '',
    dificuldade: desafio.dificuldade,
    prazo: desafio.prazo ?? '',
    periodo_recomendado: desafio.periodo_recomendado ?? '',
  };
}

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
    void loadChallenges();
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
        await api.patch(`/empresa/projetos/${editingId}/`, paraPayload(formData));
      } else {
        await api.post('/empresa/projetos/', paraPayload(formData));
      }
      resetForm();
      void loadChallenges();
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
      void loadChallenges();
    } catch (err) {
      console.error(err);
      setError('Erro ao publicar desafio');
    }
  };

  const handleClose = async (id) => {
    try {
      await api.post(`/empresa/projetos/${id}/encerrar/`);
      void loadChallenges();
    } catch (err) {
      console.error(err);
      setError('Erro ao encerrar desafio');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este desafio?')) {
      try {
        await api.delete(`/empresa/projetos/${id}/`);
        void loadChallenges();
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
        actions={!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Icon name="add" size="1.15rem" /> Novo Desafio
          </Button>
        )}
      />

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

          <form onSubmit={handleSubmit} className="space-y-8">
            <fieldset className="space-y-5">
              <legend className="mb-1 text-title-medium text-on-surface">Sobre a vaga</legend>
              <p className="!mt-0 text-body-small text-on-surface-variant">É o que o aluno vê primeiro, no feed de oportunidades.</p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Input
                    label="Título da vaga"
                    value={formData.vaga_titulo}
                    onChange={(e) => setFormData({ ...formData, vaga_titulo: e.target.value })}
                    placeholder="Ex: Estágio em Desenvolvimento Back-end"
                    required
                  />
                </div>
                <Select
                  label="Modalidade"
                  value={formData.vaga_modalidade}
                  onChange={(e) => setFormData({ ...formData, vaga_modalidade: e.target.value })}
                >
                  <option value="">Não informar</option>
                  {Object.entries(MODALIDADES).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
                </Select>
              </div>
              <Textarea
                label="Descrição da vaga"
                value={formData.vaga_descricao}
                onChange={(e) => setFormData({ ...formData, vaga_descricao: e.target.value })}
                placeholder="Atividades, o que a empresa oferece, carga horária, como é o dia a dia..."
                rows={4}
                required
              />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="Tecnologias esperadas (separadas por vírgula)"
                  value={formData.vaga_tecnologias}
                  onChange={(e) => setFormData({ ...formData, vaga_tecnologias: e.target.value })}
                  placeholder="O que o aluno deve saber. Ex: Python, SQL, Git"
                  required
                />
                <Input
                  type="number"
                  min="1"
                  max="12"
                  label="Período recomendado (opcional)"
                  value={formData.periodo_recomendado}
                  onChange={(e) => setFormData({ ...formData, periodo_recomendado: e.target.value })}
                  placeholder="Ex: 4"
                />
              </div>
            </fieldset>

            <hr className="border-outline-variant" />

            <fieldset className="space-y-5">
              <legend className="mb-1 text-title-medium text-on-surface">O desafio</legend>
              <p className="!mt-0 text-body-small text-on-surface-variant">
                Um problema relacionado à vaga, para testar o conhecimento do aluno. Não precisa repetir a vaga.
              </p>
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
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Input
                  label="Ferramentas (separadas por vírgula)"
                  value={formData.ferramentas}
                  onChange={(e) => setFormData({ ...formData, ferramentas: e.target.value })}
                  placeholder="React, Node.js, MongoDB"
                />
                <Select
                  label="Nível"
                  value={formData.dificuldade}
                  onChange={(e) => setFormData({ ...formData, dificuldade: e.target.value })}
                >
                  {Object.entries(DIFF_LABELS).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>{rotulo}</option>
                  ))}
                </Select>
                <Input
                  type="date"
                  label="Prazo para participar (opcional)"
                  value={formData.prazo}
                  onChange={(e) => setFormData({ ...formData, prazo: e.target.value })}
                />
              </div>
            </fieldset>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-outline-variant pt-4 sm:flex-row">
              <Button type="button" variant="outlined" onClick={resetForm}>Cancelar</Button>
              <Button type="submit" variant="filled">
                {editingId ? 'Salvar Alterações' : 'Criar Desafio'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="em-sequencia grid grid-cols-1 gap-6 md:grid-cols-2">
        {challenges.map((challenge) => {
          const label = DIFF_LABELS[challenge.dificuldade] ?? challenge.dificuldade;
          const tone = DIFFICULTY_TONE[challenge.dificuldade] ?? 'warning';
          const status = STATUS[challenge.status] ?? STATUS.rascunho;
          const prazo = textoPrazo(challenge.prazo);
          return (
            <Card key={challenge.id} padding="lg" hoverable className="flex flex-col">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-title-large text-on-surface wrap-anywhere">
                    {tituloDaVaga(challenge)}
                  </h3>
                  <p className="mb-2 mt-0.5 text-body-small text-on-surface-variant wrap-anywhere">
                    Desafio: <span className="font-medium text-on-surface">{challenge.titulo}</span>
                    {challenge.vaga_modalidade && ` · ${MODALIDADES[challenge.vaga_modalidade] ?? challenge.vaga_modalidade}`}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={tone} dot>{label}</Badge>
                    {challenge.periodo_recomendado && (
                      <Badge tone="neutral">{challenge.periodo_recomendado}º período+</Badge>
                    )}
                    {prazo && <Badge tone="neutral">{prazo}</Badge>}
                  </div>
                </div>
                <Badge tone={status.tom} dot className="shrink-0">
                  {status.rotulo}
                </Badge>
              </div>

              <p className="mb-4 flex-1 text-body-medium text-on-surface-variant wrap-anywhere">
                {challenge.vaga_descricao || challenge.descricao}
              </p>

              <p className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-body-small text-on-surface-variant">
                <span><span className="font-medium text-on-surface">{challenge.participantes ?? 0}</span> participantes</span>
                <span><span className="font-medium text-on-surface">{challenge.submissoes ?? 0}</span> submissões</span>
                <span><span className="font-medium text-on-surface">{challenge.aprovados ?? 0}</span> aprovados</span>
              </p>

              {challenge.ferramentas && (
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {[...new Set(challenge.ferramentas.split(',').map((f) => f.trim()).filter(Boolean))].map((ferramenta) => (
                    <span key={ferramenta} className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-body-small font-medium text-on-surface">
                      {ferramenta}
                    </span>
                  ))}
                </div>
              )}

              {/* flex-wrap em vez de grid-cols-3 fixo: em telas estreitas
                  "Encerrar" não cabe em um terço da largura e empurrava o
                  card — e com ele a página inteira — para fora da viewport. */}
              <div className="mt-auto flex flex-wrap gap-2 border-t border-outline-variant pt-4">
                {challenge.status === 'publicado' ? (
                  <Button variant="outlined" size="sm" onClick={() => handleClose(challenge.id)}>Encerrar</Button>
                ) : (
                  <Button variant="tonal" size="sm" onClick={() => handlePublish(challenge.id)}>
                    {challenge.status === 'encerrado' ? 'Reabrir' : 'Publicar'}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => {
                    setFormData(paraFormulario(challenge));
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
