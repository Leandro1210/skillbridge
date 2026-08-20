import { useState, useEffect } from 'react';
import api from '../api';
import Card from './ui/Card';
import Button from './ui/Button';
import Icon from './ui/Icon';
import Skeleton from './ui/Skeleton';
import PageHeader from './ui/PageHeader';
import { Input, Textarea } from './ui/Input';

/**
 * CompanyProfileEdit — Editar perfil da empresa
 */
export default function CompanyProfileEdit({ onBack }) {
  const [profile, setProfile] = useState({
    website: '',
    tecnologias: '',
    area_atuacao: '',
    descricao_adicional: '',
  });
  const [companyInfo, setCompanyInfo] = useState({ nome: '', setor: '', descricao: '' });
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
      const [profileRes, userRes] = await Promise.all([
        api.get('/perfil/empresa/'),
        api.get('/auth/me/'),
      ]);

      setProfile(profileRes.data);
      if (userRes.data.empresa) {
        const empresaRes = await api.get('/empresa/dashboard/');
        setCompanyInfo(empresaRes.data.empresa);
      }
      setError('');
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar perfil da empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.patch('/perfil/empresa/', profile);
      setSuccess('Perfil da empresa atualizado com sucesso!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar perfil da empresa');
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
        title="Perfil da Empresa"
        description="Complete o perfil da sua empresa para que os candidatos possam conhecê-la melhor."
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

      {companyInfo && (
        <Card padding="lg" className="mb-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">Nome da Empresa</p>
              <p className="text-title-medium text-on-surface">{companyInfo.nome}</p>
            </div>
            <div>
              <p className="mb-1 text-body-small font-semibold uppercase tracking-wide text-on-surface-variant/70">Setor</p>
              <p className="text-title-medium text-on-surface">{companyInfo.setor}</p>
            </div>
          </div>
        </Card>
      )}

      <Card padding="lg" className="animate-[var(--animate-rise)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Área de Atuação"
            name="area_atuacao"
            value={profile.area_atuacao}
            onChange={handleProfileChange}
            placeholder="Ex: SaaS, Fintech, E-commerce, Educação"
          />
          <Input
            type="url"
            label="Website da Empresa"
            name="website"
            value={profile.website}
            onChange={handleProfileChange}
            placeholder="https://www.seusite.com.br"
          />
          <Textarea
            label="Stack Tecnológico"
            name="tecnologias"
            value={profile.tecnologias}
            onChange={handleProfileChange}
            placeholder="Ex: React, Node.js, PostgreSQL, Docker, AWS (separadas por vírgula)"
            rows={3}
          />
          <Textarea
            label="Sobre a Empresa"
            name="descricao_adicional"
            value={profile.descricao_adicional}
            onChange={handleProfileChange}
            placeholder="Conte mais sobre sua empresa, cultura, missão, visão e valores..."
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
