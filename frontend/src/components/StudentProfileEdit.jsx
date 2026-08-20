import { useState, useEffect } from 'react';
import api from '../api';
import Card from './ui/Card';
import Button from './ui/Button';
import Icon from './ui/Icon';
import Skeleton from './ui/Skeleton';
import PageHeader from './ui/PageHeader';
import { Input, Textarea } from './ui/Input';

/**
 * StudentProfileEdit — Editar perfil do estudante
 */
export default function StudentProfileEdit({ onBack }) {
  const [profile, setProfile] = useState({
    bio: '',
    titulo: '',
    portfolio_url: '',
    instituicao_ensino: '',
    tecnologias: '',
    descricao_adicional: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/perfil/usuario/');
      setProfile(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.patch('/perfil/usuario/', profile);
      setSuccess('Perfil atualizado com sucesso!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-96 rounded-[var(--radius-lg)]" />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 animate-[var(--animate-fade-in)]">
      <PageHeader
        title="Meu Perfil"
        description="Complete seu perfil para que as empresas possam conhecê-lo melhor."
        actions={
          onBack && (
            <Button variant="text" onClick={onBack}>
              <Icon name="arrow_back" size="1rem" /> Voltar
            </Button>
          )
        }
      />

      {error && (
        <div className="mb-6 rounded-[var(--radius-sm)] border border-error/40 bg-error-container/25 p-4 text-error">
          <p className="font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-6 rounded-[var(--radius-sm)] border border-primary/40 bg-primary-container/25 p-4 text-primary">
          <p className="font-medium">{success}</p>
        </div>
      )}

      <Card padding="lg" className="animate-[var(--animate-rise)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Título Profissional"
            name="titulo"
            value={profile.titulo}
            onChange={handleChange}
            placeholder="Ex: Desenvolvedor Full Stack, Designer UX/UI"
          />
          <Textarea
            label="Sobre Você"
            name="bio"
            value={profile.bio}
            onChange={handleChange}
            placeholder="Conte um pouco sobre você, seus interesses e objetivos profissionais..."
            rows={4}
          />
          <Input
            label="Instituição de Ensino"
            name="instituicao_ensino"
            value={profile.instituicao_ensino}
            onChange={handleChange}
            placeholder="Ex: Universidade Federal de São Paulo"
          />
          <Textarea
            label="Tecnologias & Linguagens"
            name="tecnologias"
            value={profile.tecnologias}
            onChange={handleChange}
            placeholder="Ex: JavaScript, React, Python, Django, SQL (separadas por vírgula)"
            rows={3}
          />
          <Input
            type="url"
            label="Link do Portfólio"
            name="portfolio_url"
            value={profile.portfolio_url}
            onChange={handleChange}
            placeholder="https://seu-portfolio.com"
          />
          <Textarea
            label="Informações Adicionais"
            name="descricao_adicional"
            value={profile.descricao_adicional}
            onChange={handleChange}
            placeholder="Informações extras que você gostaria que as empresas soubessem sobre você..."
            rows={4}
          />

          <div className="flex gap-3 border-t border-outline-variant pt-6">
            <Button type="submit" variant="filled" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Perfil'}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
