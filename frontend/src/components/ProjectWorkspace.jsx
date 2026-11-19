import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import api from '../api';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Icon from './ui/Icon';
import Spinner from './ui/Spinner';
import { Input } from './ui/Input';

const FORMATOS = { repositorio: 'Link do repositório', link: 'Link', arquivo: 'Link do arquivo' };

const STATUS_ENTREGA = {
  pendente: { rotulo: 'Em avaliação', tom: 'warning' },
  aprovado: { rotulo: 'Aprovada', tom: 'success' },
  reprovado: { rotulo: 'Ajustes pedidos', tom: 'error' },
};

/**
 * Situação de uma etapa a partir da entrega mais recente:
 * 'enviar' (nenhuma entrega), 'avaliacao' (pendente), 'ajustes' (reprovada,
 * pode reenviar) ou 'aprovada'.
 */
function situacaoDaEtapa(ultima) {
  if (!ultima) return 'enviar';
  if (ultima.status === 'pendente') return 'avaliacao';
  if (ultima.status === 'reprovado') return 'ajustes';
  return 'aprovada';
}

const MENSAGENS = {
  enviar: {
    icone: 'upload_file', tom: 'neutro', titulo: 'Envie sua solução',
    texto: 'Resolva o desafio, publique a solução e envie o link abaixo. A empresa avalia e você recebe o retorno aqui.',
  },
  avaliacao: {
    icone: 'schedule', tom: 'aviso', titulo: 'Solução enviada: aguardando a avaliação da empresa',
    texto: 'Você será avisado aqui quando a empresa avaliar. Enquanto isso, que tal atualizar seu perfil?',
  },
  ajustes: {
    icone: 'feedback', tom: 'erro', titulo: 'A empresa pediu ajustes',
    texto: 'Leia o retorno abaixo, ajuste sua solução e envie uma nova versão.',
  },
  aprovada: {
    icone: 'check_circle', tom: 'sucesso', titulo: 'Solução aprovada!',
    texto: 'Parabéns: a aprovação já conta no selo de aprovações do seu perfil.',
  },
};

const TONS_BANNER = {
  neutro: 'border-outline-variant bg-surface-container-low text-on-surface',
  aviso: 'border-warning/30 bg-warning-container/40 text-on-warning-container',
  erro: 'border-error/30 bg-error-container/30 text-on-error-container',
  sucesso: 'border-success/30 bg-success-container/40 text-on-success-container',
};

/**
 * Área de participação do aluno num desafio (dentro da página do desafio):
 * acompanhamento em 3 passos, o que entregar, o envio e o histórico de envios.
 * As abas de etapa só aparecem quando o desafio tem mais de uma etapa.
 */
export default function ProjectWorkspace({ projectId }) {
  const [etapas, setEtapas] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [etapaAtivaId, setEtapaAtivaId] = useState(null);

  const [repoUrl, setRepoUrl] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'sucesso' | 'erro', texto }

  const carregar = useCallback(async ({ escolherEtapa = false } = {}) => {
    try {
      const [projRes, entRes] = await Promise.all([api.get(`/projetos/${projectId}/`), api.get('/entregas/')]);
      const lista = projRes.data.etapas ?? [];
      const minhas = entRes.data.results ?? entRes.data;
      setEtapas(lista);
      setEntregas(minhas);
      setErro('');
      if (escolherEtapa) {
        // abre na primeira etapa que ainda pede ação do aluno
        const pendenteDeAcao = lista.find((etapa) => {
          const situacao = situacaoDaEtapa(ultimaEntrega(minhas, etapa.id));
          return situacao === 'enviar' || situacao === 'ajustes';
        });
        setEtapaAtivaId((pendenteDeAcao ?? lista.at(-1))?.id ?? null);
      }
    } catch (err) {
      console.error(err);
      setErro('Não foi possível carregar sua participação.');
    } finally {
      setCarregando(false);
    }
  }, [projectId]);

  useEffect(() => {
    void carregar({ escolherEtapa: true });
  }, [carregar]);

  const enviar = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setEnviando(true);
    setAviso(null);
    try {
      await api.post('/entregas/', { etapa_id: etapaAtivaId, repo_url: repoUrl.trim() });
      setRepoUrl('');
      setAviso({ tipo: 'sucesso', texto: 'Solução enviada! A empresa vai avaliar e o retorno aparece aqui.' });
      await carregar();
    } catch (err) {
      setAviso({ tipo: 'erro', texto: err.response?.data?.detail ?? 'Não foi possível enviar a solução.' });
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (erro) {
    return (
      <Card variant="outlined" padding="lg" className="border-error/40 bg-error-container/20">
        <p className="font-medium text-error">{erro}</p>
      </Card>
    );
  }

  const etapa = etapas.find((item) => item.id === etapaAtivaId);
  if (!etapa) return null;

  const daEtapa = entregas
    .filter((item) => item.etapa === etapa.id)
    .sort((a, b) => new Date(b.entregue_em) - new Date(a.entregue_em));
  const situacao = situacaoDaEtapa(daEtapa[0]);
  const mensagem = MENSAGENS[situacao];
  const podeEnviar = situacao === 'enviar' || situacao === 'ajustes';

  return (
    <Card as="section" padding="lg" aria-labelledby="titulo-participacao" className="space-y-6">
      <h2 id="titulo-participacao" className="text-title-large text-on-surface">Sua participação</h2>

      {etapas.length > 1 && (
        <AbasDeEtapas etapas={etapas} entregas={entregas} ativa={etapa.id} onEscolher={(id) => { setEtapaAtivaId(id); setAviso(null); }} />
      )}

      <Acompanhamento situacao={situacao} />

      {/* <output> já tem o papel "status": leitores de tela anunciam a mudança */}
      <output className={clsx('flex gap-3 rounded-[var(--radius-md)] border p-4', TONS_BANNER[mensagem.tom])}>
        <Icon name={mensagem.icone} size="1.4rem" className="mt-0.5 shrink-0" />
        <span className="block">
          <span className="block text-title-small">{mensagem.titulo}</span>
          <span className="mt-0.5 block text-body-medium opacity-90">{mensagem.texto}</span>
          {situacao === 'avaliacao' && (
            <span className="mt-1 block text-body-small opacity-80">Enviada em {new Date(daEtapa[0].entregue_em).toLocaleString('pt-BR')}</span>
          )}
          {(situacao === 'ajustes' || situacao === 'aprovada') && daEtapa[0].feedback_validacao && (
            <span className="mt-3 block border-l-2 border-current pl-3 text-body-medium">
              <span className="block text-label-medium opacity-80">Retorno da empresa</span>
              {daEtapa[0].feedback_validacao}
            </span>
          )}
        </span>
      </output>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h3 className="text-title-medium text-on-surface">
            {etapas.length > 1 ? `Etapa ${etapa.ordem}: ${etapa.descricao}` : 'O que entregar'}
          </h3>
          {etapas.length === 1 && etapa.descricao && <p className="mt-1 text-body-medium text-on-surface-variant">{etapa.descricao}</p>}
          <div className="mt-4 rounded-[var(--radius-md)] border border-outline-variant bg-surface-container-low p-4">
            <p className="mb-2 flex items-center gap-1.5 text-label-large text-primary">
              <Icon name="verified" size="1.05rem" /> Critérios de avaliação
            </p>
            <p className="whitespace-pre-wrap text-body-medium leading-relaxed text-on-surface-variant">{etapa.criterios_tecnicos}</p>
          </div>
          <p className="mt-3 text-body-small text-on-surface-variant">
            Formato da entrega: <span className="font-medium text-on-surface">{FORMATOS[etapa.formato_entrega] ?? etapa.formato_entrega}</span>
          </p>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {podeEnviar && (
            <form onSubmit={enviar} className="space-y-3">
              <h3 className="text-title-medium text-on-surface">{situacao === 'ajustes' ? 'Enviar nova versão' : 'Enviar solução'}</h3>
              <Input
                type="url"
                label={FORMATOS[etapa.formato_entrega] ?? 'Link da solução'}
                placeholder="https://github.com/usuario/repositorio"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                required
                disabled={enviando}
              />
              <Button type="submit" disabled={enviando || !repoUrl.trim()} className="w-full">
                {enviando ? <><Spinner size="sm" className="text-on-primary" /> Enviando...</> : <>Enviar solução <Icon name="arrow_forward" size="1rem" /></>}
              </Button>
            </form>
          )}

          {aviso && (
            <p role="alert" className={clsx('text-body-medium font-medium', aviso.tipo === 'erro' ? 'text-error' : 'text-primary')}>
              {aviso.texto}
            </p>
          )}

          <HistoricoDeEnvios entregas={daEtapa} />
        </div>
      </div>
    </Card>
  );
}

function ultimaEntrega(entregas, etapaId) {
  return entregas
    .filter((item) => item.etapa === etapaId)
    .sort((a, b) => new Date(b.entregue_em) - new Date(a.entregue_em))[0];
}

/**
 * Os três passos da participação, sempre na horizontal: o aluno vê onde está
 * e o que falta. O 3º passo muda de nome conforme a avaliação.
 */
function Acompanhamento({ situacao }) {
  const terceiro = {
    enviar: { rotulo: 'Avaliação da empresa', estado: 'futuro' },
    avaliacao: { rotulo: 'Em avaliação', estado: 'atual' },
    ajustes: { rotulo: 'Ajustes pedidos', estado: 'alerta' },
    aprovada: { rotulo: 'Aprovada', estado: 'feito' },
  }[situacao];
  const passos = [
    { rotulo: 'Participando', estado: 'feito' },
    { rotulo: 'Solução enviada', estado: situacao === 'enviar' ? 'atual' : 'feito' },
    terceiro,
  ];

  return (
    <ol className="flex items-start" aria-label="Acompanhamento da participação">
      {passos.map((passo, i) => (
        <li key={passo.rotulo} className="flex flex-1 flex-col items-center text-center" aria-current={passo.estado === 'atual' ? 'step' : undefined}>
          <div className="flex w-full items-center">
            <span className={clsx('h-0.5 flex-1', i === 0 ? 'invisible' : corDaLinha(passos[i - 1]))} />
            <span
              className={clsx(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-label-large font-bold',
                passo.estado === 'feito' && 'bg-primary text-on-primary',
                passo.estado === 'atual' && 'border-2 border-primary bg-primary-container text-on-primary-container',
                passo.estado === 'alerta' && 'bg-error text-on-error',
                passo.estado === 'futuro' && 'border-2 border-outline-variant bg-surface-container-lowest text-on-surface-variant',
              )}
            >
              {passo.estado === 'feito' && <Icon name="check" size="1.1rem" />}
              {passo.estado === 'alerta' && <Icon name="warning" size="1.05rem" />}
              {(passo.estado === 'atual' || passo.estado === 'futuro') && i + 1}
            </span>
            <span className={clsx('h-0.5 flex-1', i === passos.length - 1 ? 'invisible' : corDaLinha(passo))} />
          </div>
          <span className={clsx('mt-2 px-1 text-body-small', passo.estado === 'futuro' ? 'text-on-surface-variant' : 'font-medium text-on-surface')}>
            {passo.rotulo}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A linha entre dois passos fica azul quando o passo da esquerda já foi feito. */
function corDaLinha(passoDaEsquerda) {
  return passoDaEsquerda.estado === 'feito' ? 'bg-primary' : 'bg-outline-variant';
}

function AbasDeEtapas({ etapas, entregas, ativa, onEscolher }) {
  return (
    <fieldset className="flex flex-wrap gap-2" aria-label="Etapas do desafio">
      {etapas.map((etapa) => {
        const situacao = situacaoDaEtapa(ultimaEntrega(entregas, etapa.id));
        const selecionada = etapa.id === ativa;
        return (
          <button
            key={etapa.id}
            type="button"
            aria-pressed={selecionada}
            onClick={() => onEscolher(etapa.id)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-label-large transition-colors',
              selecionada ? 'border-primary bg-primary-container text-on-primary-container' : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/5',
            )}
          >
            Etapa {etapa.ordem}
            {situacao === 'aprovada' && <Icon name="check_circle" size="1rem" className="text-success" />}
            {situacao === 'avaliacao' && <Icon name="schedule" size="1rem" />}
            {situacao === 'ajustes' && <Icon name="warning" size="1rem" className="text-error" />}
          </button>
        );
      })}
    </fieldset>
  );
}

function HistoricoDeEnvios({ entregas }) {
  if (entregas.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-title-small text-on-surface">Seus envios</h3>
      <ol className="space-y-2">
        {entregas.map((entrega) => {
          const status = STATUS_ENTREGA[entrega.status] ?? STATUS_ENTREGA.pendente;
          return (
            <li key={entrega.id} className="rounded-[var(--radius-sm)] border border-outline-variant p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-body-small text-on-surface-variant">{new Date(entrega.entregue_em).toLocaleDateString('pt-BR')}</span>
                <Badge tone={status.tom} dot>{status.rotulo}</Badge>
              </div>
              {entrega.repo_url && (
                <a href={entrega.repo_url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-body-small font-medium text-primary break-all hover:underline">
                  {entrega.repo_url}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
