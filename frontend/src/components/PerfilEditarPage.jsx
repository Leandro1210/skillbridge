import { useEffect, useState } from 'react';
import api from '../api';
import { TIPOS_PUBLICACAO } from '../lib/perfil';
import Card from './ui/Card';
import Button, { LinkButton } from './ui/Button';
import Icon from './ui/Icon';
import Skeleton from './ui/Skeleton';
import PageHeader from './ui/PageHeader';
import { Input, Select, Textarea } from './ui/Input';

const PERFIL_VAZIO = {
  titulo: '', curso: '', instituicao_ensino: '', periodo_atual: '', estudando_atualmente: '',
  bio: '', tecnologias: '', portfolio_url: '', github_url: '', linkedin_url: '',
  descricao_adicional: '', mostrar_atividade: false,
};

/** Primeira mensagem de erro do DRF ({campo: [msg]}), ou a genérica. */
function mensagemDeErro(err, generica) {
  const dados = err.response?.data;
  if (dados && typeof dados === 'object') {
    const primeira = Object.values(dados)[0];
    return Array.isArray(primeira) ? primeira[0] : String(primeira);
  }
  return generica;
}

/** Retorno de XP ao adicionar um item (o limite do mês pode ter sido atingido). */
function textoXp(xpGanho) {
  return xpGanho > 0 ? `+${xpGanho} XP de atividade.` : 'Adicionado. O limite de XP deste mês para esse tipo já foi atingido.';
}

/**
 * Edição do perfil acadêmico (/perfil/editar): dados do semestre e links,
 * a opção de mostrar a atividade para empresas, e a gestão de projetos e
 * publicações. Cada parte salva sozinha.
 */
export default function PerfilEditarPage() {
  const [perfil, setPerfil] = useState(null);
  const [erroCarregar, setErroCarregar] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'sucesso' | 'erro', texto }

  useEffect(() => {
    api.get('/perfil/usuario/')
      .then(({ data }) => setPerfil({ ...PERFIL_VAZIO, ...data, periodo_atual: data.periodo_atual ?? '' }))
      .catch(() => setErroCarregar('Não foi possível carregar seu perfil.'));
  }, []);

  const alterar = (campo) => (e) => {
    const valor = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setPerfil((atual) => ({ ...atual, [campo]: valor }));
  };

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setAviso(null);
    try {
      await api.patch('/perfil/usuario/', {
        ...perfil,
        periodo_atual: perfil.periodo_atual === '' ? null : Number(perfil.periodo_atual),
      });
      setAviso({ tipo: 'sucesso', texto: 'Perfil salvo.' });
    } catch (err) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(err, 'Não foi possível salvar o perfil.') });
    } finally {
      setSalvando(false);
    }
  };

  if (erroCarregar) {
    return (
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Card variant="outlined" padding="lg"><p className="font-medium text-error">{erroCarregar}</p></Card>
      </section>
    );
  }

  if (!perfil) {
    return (
      <section className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8" aria-label="Carregando perfil">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-96 rounded-[var(--radius-lg)]" />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-8 px-4 sm:px-6 lg:px-8 animate-[var(--animate-fade-in)]">
      <PageHeader
        title="Editar perfil"
        description="As empresas consultam seu perfil ao avaliar suas entregas. Mantenha-o atualizado a cada semestre."
        actions={
          <LinkButton to="/perfil" variant="text">
            <Icon name="arrow_back" size="1rem" /> Ver meu perfil
          </LinkButton>
        }
      />

      <Card padding="lg">
        <form onSubmit={salvar} className="space-y-5">
          <h2 className="text-title-large text-on-surface">Dados acadêmicos</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input label="Curso" value={perfil.curso} onChange={alterar('curso')} placeholder="Ex: Engenharia de Software" />
            <Input label="Instituição de ensino" value={perfil.instituicao_ensino} onChange={alterar('instituicao_ensino')} />
            <Input label="Período atual" type="number" min="1" max="12" value={perfil.periodo_atual} onChange={alterar('periodo_atual')} />
            <Input label="Título profissional" value={perfil.titulo} onChange={alterar('titulo')} placeholder="Ex: Desenvolvedor back-end em formação" />
          </div>
          <Input
            label="Estudando atualmente"
            value={perfil.estudando_atualmente}
            onChange={alterar('estudando_atualmente')}
            placeholder="Disciplinas ou assuntos deste semestre"
          />
          <p className="-mt-3 text-body-small text-on-surface-variant">
            Preencher o período e o que está estudando conta como a atualização do semestre (+50 XP, uma vez por semestre).
          </p>
          <Textarea label="Sobre você" value={perfil.bio} onChange={alterar('bio')} rows={3} />
          <Textarea label="Tecnologias (separadas por vírgula)" value={perfil.tecnologias} onChange={alterar('tecnologias')} rows={2} />

          <h2 className="pt-2 text-title-large text-on-surface">Links</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Input label="GitHub" type="url" value={perfil.github_url} onChange={alterar('github_url')} placeholder="https://github.com/..." />
            <Input label="LinkedIn" type="url" value={perfil.linkedin_url} onChange={alterar('linkedin_url')} placeholder="https://linkedin.com/in/..." />
            <Input label="Portfólio" type="url" value={perfil.portfolio_url} onChange={alterar('portfolio_url')} placeholder="https://..." />
          </div>

          <label className="flex items-start gap-3 rounded-[var(--radius-md)] border border-outline-variant p-4">
            <input
              type="checkbox"
              checked={perfil.mostrar_atividade}
              onChange={alterar('mostrar_atividade')}
              className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
            />
            <span>
              <span className="block text-label-large text-on-surface">Mostrar minha atividade para as empresas</span>
              <span className="block text-body-small text-on-surface-variant">
                O XP e o gráfico de atividade do semestre aparecem no seu perfil público. Você sempre vê a sua atividade.
              </span>
            </span>
          </label>

          {aviso && (
            <p role="status" className={aviso.tipo === 'erro' ? 'font-medium text-error' : 'font-medium text-primary'}>
              {aviso.texto}
            </p>
          )}
          <Button type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar perfil'}</Button>
        </form>
      </Card>

      <ListaEditavel
        titulo="Projetos acadêmicos"
        descricao="Projetos das disciplinas, com o link do repositório. Cada projeto rende +40 XP (até 4 por mês)."
        url="/perfil/projetos/"
        vazio={{ titulo: '', disciplina: '', periodo: '', repo_url: '', tecnologias: '', descricao: '', destaque: false }}
        rotuloAdicionar="Adicionar projeto"
        resumo={(p) => [p.disciplina, p.periodo && `${p.periodo}º período`, p.destaque && 'destaque'].filter(Boolean).join(' · ')}
        campos={(dados, alterarCampo) => (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Título do projeto" value={dados.titulo} onChange={alterarCampo('titulo')} required />
              <Input label="Repositório" type="url" value={dados.repo_url} onChange={alterarCampo('repo_url')} placeholder="https://github.com/..." required />
              <Input label="Disciplina" value={dados.disciplina} onChange={alterarCampo('disciplina')} />
              <Input label="Período em que foi feito" type="number" min="1" max="12" value={dados.periodo} onChange={alterarCampo('periodo')} />
            </div>
            <Input label="Tecnologias do projeto" value={dados.tecnologias} onChange={alterarCampo('tecnologias')} placeholder="Ex: Python, Django" />
            <Textarea label="Descrição do projeto" value={dados.descricao} onChange={alterarCampo('descricao')} rows={2} />
            <label className="flex items-center gap-2 text-body-medium text-on-surface">
              <input type="checkbox" checked={dados.destaque} onChange={alterarCampo('destaque')} className="h-4 w-4 accent-[var(--color-primary)]" />
              Destacar no perfil
            </label>
          </>
        )}
      />

      <ListaEditavel
        titulo="Produção científica"
        descricao="Artigos, resumos em eventos, TCC e iniciação científica. Cada publicação rende +80 XP (até 2 por mês)."
        url="/perfil/publicacoes/"
        vazio={{ titulo: '', tipo: 'artigo', veiculo: '', ano: '', url: '', coautores: '' }}
        rotuloAdicionar="Adicionar publicação"
        resumo={(p) => [TIPOS_PUBLICACAO[p.tipo] ?? p.tipo, p.veiculo, p.ano].filter(Boolean).join(' · ')}
        campos={(dados, alterarCampo) => (
          <>
            <Input label="Título da publicação" value={dados.titulo} onChange={alterarCampo('titulo')} required />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select label="Tipo" value={dados.tipo} onChange={alterarCampo('tipo')}>
                {Object.entries(TIPOS_PUBLICACAO).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
              </Select>
              <Input label="Evento ou periódico" value={dados.veiculo} onChange={alterarCampo('veiculo')} />
              <Input label="Ano" type="number" min="1990" max="2100" value={dados.ano} onChange={alterarCampo('ano')} />
            </div>
            <Input label="Link ou DOI" type="url" value={dados.url} onChange={alterarCampo('url')} placeholder="https://doi.org/..." required />
            <Input label="Coautores" value={dados.coautores} onChange={alterarCampo('coautores')} />
          </>
        )}
      />
    </section>
  );
}

/**
 * Lista de itens do perfil (projetos ou publicações) com adicionar e remover.
 * Campos numéricos vazios vão como null para a API.
 */
function ListaEditavel({ titulo, descricao, url, vazio, rotuloAdicionar, resumo, campos }) {
  const [itens, setItens] = useState([]);
  const [novo, setNovo] = useState(null); // null = formulário fechado
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    api.get(url)
      .then(({ data }) => setItens(data.results ?? data))
      .catch(() => setAviso({ tipo: 'erro', texto: 'Não foi possível carregar a lista.' }));
  }, [url]);

  const alterarCampo = (campo) => (e) => {
    const valor = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setNovo((atual) => ({ ...atual, [campo]: valor }));
  };

  const adicionar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setAviso(null);
    const payload = Object.fromEntries(
      Object.entries(novo).map(([campo, valor]) => [campo, ['periodo', 'ano'].includes(campo) && valor === '' ? null : valor]),
    );
    try {
      const { data } = await api.post(url, payload);
      const { xp_ganho: xpGanho, ...item } = data;
      setItens((atuais) => [item, ...atuais]);
      setNovo(null);
      setAviso({ tipo: 'sucesso', texto: textoXp(xpGanho) });
    } catch (err) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(err, 'Não foi possível adicionar.') });
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (item) => {
    if (!window.confirm(`Remover "${item.titulo}" do seu perfil? O XP que ele rendeu será devolvido.`)) return;
    try {
      await api.delete(`${url}${item.id}/`);
      setItens((atuais) => atuais.filter((i) => i.id !== item.id));
      setAviso(null);
    } catch {
      setAviso({ tipo: 'erro', texto: 'Não foi possível remover.' });
    }
  };

  return (
    <Card as="section" padding="lg" aria-label={titulo}>
      <h2 className="text-title-large text-on-surface">{titulo}</h2>
      <p className="mt-1 text-body-small text-on-surface-variant">{descricao}</p>

      {itens.length > 0 && (
        <ul className="mt-4 divide-y divide-outline-variant">
          {itens.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-body-large text-on-surface">{item.titulo}</p>
                <p className="text-body-small text-on-surface-variant">{resumo(item)}</p>
              </div>
              <Button variant="danger" size="sm" onClick={() => remover(item)} aria-label={`Remover ${item.titulo}`}>
                <Icon name="delete" size="1rem" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {aviso && (
        <p role="status" className={`mt-3 font-medium ${aviso.tipo === 'erro' ? 'text-error' : 'text-primary'}`}>{aviso.texto}</p>
      )}

      {novo ? (
        <form onSubmit={adicionar} className="mt-4 space-y-4 rounded-[var(--radius-md)] border border-outline-variant p-4">
          {campos(novo, alterarCampo)}
          <div className="flex gap-3">
            <Button type="button" variant="outlined" onClick={() => setNovo(null)}>Cancelar</Button>
            <Button type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      ) : (
        <Button variant="tonal" className="mt-4" onClick={() => { setNovo({ ...vazio }); setAviso(null); }}>
          <Icon name="add" size="1.1rem" /> {rotuloAdicionar}
        </Button>
      )}
    </Card>
  );
}
