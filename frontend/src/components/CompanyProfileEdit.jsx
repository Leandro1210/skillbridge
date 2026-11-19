import { useState, useEffect } from 'react';
import api from '../api';
import Card from './ui/Card';
import Button, { LinkButton } from './ui/Button';
import Icon from './ui/Icon';
import Skeleton from './ui/Skeleton';
import PageHeader from './ui/PageHeader';
import { Input, Textarea } from './ui/Input';

const PERFIL_VAZIO = {
  empresa_id: null, nome: '', setor: '', descricao: '', area_atuacao: '', cidade: '',
  website: '', email_contato: '', telefone: '', linkedin_url: '', instagram_url: '', github_url: '',
  logo_url: '', tecnologias: '', descricao_adicional: '',
};

/** Primeira mensagem de erro do DRF ({campo: [msg]}), ou a genérica. */
function mensagemDeErro(err) {
  const dados = err.response?.data;
  if (dados && typeof dados === 'object') {
    const [campo, mensagens] = Object.entries(dados)[0] ?? [];
    if (campo) return `${campo}: ${Array.isArray(mensagens) ? mensagens[0] : mensagens}`;
  }
  return 'Erro ao salvar perfil da empresa';
}

/**
 * Edição do perfil da empresa: dados, contatos e redes. É o que os alunos
 * veem no perfil público (/empresas/:id) e ao lado de cada desafio no feed.
 */
export default function CompanyProfileEdit() {
  const [perfil, setPerfil] = useState(PERFIL_VAZIO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/perfil/empresa/')
      .then(({ data }) => {
        setPerfil({ ...PERFIL_VAZIO, ...data });
        setError('');
      })
      .catch(() => setError('Erro ao carregar perfil da empresa'))
      .finally(() => setLoading(false));
  }, []);

  const alterar = (e) => {
    const { name, value } = e.target;
    setPerfil((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { empresa_id: _ignorado, ...dados } = perfil; // somente leitura
      await api.patch('/perfil/empresa/', dados);
      setSuccess('Perfil da empresa atualizado com sucesso!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(mensagemDeErro(err));
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
        description="É o que os alunos veem ao lado dos seus desafios e no perfil público da empresa."
        actions={
          perfil.empresa_id && (
            <LinkButton to={`/empresas/${perfil.empresa_id}`} variant="outlined">
              <Icon name="visibility" size="1rem" /> Ver perfil público
            </LinkButton>
          )
        }
      />

      {error && (
        <div role="alert" className="mb-6 rounded-[var(--radius-sm)] border border-error/40 bg-error-container/25 p-4 text-error">
          <p className="font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div role="status" className="mb-6 rounded-[var(--radius-sm)] border border-primary/40 bg-primary-container/25 p-4 text-primary">
          <p className="font-medium">{success}</p>
        </div>
      )}

      <Card padding="lg" className="animate-[var(--animate-rise)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <h2 className="text-title-large text-on-surface">Sobre a empresa</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input label="Nome da empresa" name="nome" value={perfil.nome} onChange={alterar} required />
            <Input label="Setor" name="setor" value={perfil.setor} onChange={alterar} required placeholder="Ex: Tecnologia" />
            <Input label="Área de Atuação" name="area_atuacao" value={perfil.area_atuacao} onChange={alterar} placeholder="Ex: SaaS, Fintech, E-commerce, Educação" />
            <Input label="Cidade" name="cidade" value={perfil.cidade} onChange={alterar} placeholder='Ex: Anápolis, GO — ou "Remoto"' />
          </div>
          <Textarea label="Apresentação" name="descricao" value={perfil.descricao} onChange={alterar} rows={3} placeholder="O que a empresa faz, em poucas linhas." />
          <Textarea
            label="Cultura e ambiente"
            name="descricao_adicional"
            value={perfil.descricao_adicional}
            onChange={alterar}
            placeholder="Como é trabalhar na empresa, mentoria, modelo de trabalho..."
            rows={3}
          />
          <Textarea
            label="Stack Tecnológico"
            name="tecnologias"
            value={perfil.tecnologias}
            onChange={alterar}
            placeholder="Ex: React, Node.js, PostgreSQL, Docker, AWS (separadas por vírgula)"
            rows={2}
          />

          <h2 className="pt-2 text-title-large text-on-surface">Contato</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input label="E-mail de contato" type="email" name="email_contato" value={perfil.email_contato} onChange={alterar} placeholder="vagas@suaempresa.com" />
            <Input label="Telefone" type="tel" name="telefone" value={perfil.telefone} onChange={alterar} />
            <Input label="Website da Empresa" type="url" name="website" value={perfil.website} onChange={alterar} placeholder="https://www.seusite.com.br" />
            <Input label="Logo (link da imagem)" type="url" name="logo_url" value={perfil.logo_url} onChange={alterar} placeholder="https://.../logo.png" />
          </div>

          <h2 className="pt-2 text-title-large text-on-surface">Redes sociais</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Input label="LinkedIn" type="url" name="linkedin_url" value={perfil.linkedin_url} onChange={alterar} placeholder="https://linkedin.com/company/..." />
            <Input label="Instagram" type="url" name="instagram_url" value={perfil.instagram_url} onChange={alterar} placeholder="https://instagram.com/..." />
            <Input label="GitHub" type="url" name="github_url" value={perfil.github_url} onChange={alterar} placeholder="https://github.com/..." />
          </div>

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
