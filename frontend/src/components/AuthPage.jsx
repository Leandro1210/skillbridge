import { useState } from 'react';
import api from '../api';
import { setTokens, clearTokens } from '../auth';
import Grafismo from './ui/Grafismo';
import Spinner from './ui/Spinner';
import Button from './ui/Button';
import Logo from './ui/Logo';
import { Input } from './ui/Input';

/**
 * AuthPage — Tela de Login e Registro.
 *
 * Props:
 *   onLogin (function) — callback chamado após login bem-sucedido.
 */
/**
 * Mensagem única para qualquer falha ao entrar. Diferenciar "senha
 * errada" de "tipo de conta errado" contaria a quem tentasse adivinhar
 * que aquele par e-mail/senha existe — e ainda revelaria o tipo da
 * conta. As duas situações precisam ser indistinguíveis de fora.
 */
const ERRO_LOGIN = 'E-mail ou senha incorretos.';

export default function AuthPage({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');
  const [isCompany, setIsCompany] = useState(false);
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaSetor, setEmpresaSetor] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Marca se a sessão chegou a ser gravada: se algo falhar depois
    // disso, ela precisa ser desfeita para não sobrar sessão pela metade.
    let sessaoGravada = false;

    try {
      if (isRegister) {
        await api.post('/auth/register/', {
          username,
          nome,
          email,
          password,
          password_confirm: passwordConfirm,
          is_company: isCompany,
          empresa_nome: empresaNome,
          empresa_setor: empresaSetor,
        });
      }

      const { data } = await api.post('/auth/token/', { email, password });
      setTokens({ access: data.access, refresh: data.refresh });
      sessaoGravada = true;

      // O seletor Estudante/Empresa é uma decisão explícita do usuário,
      // não enfeite: confere o tipo da conta antes de liberar a entrada.
      // Sem esta checagem, uma conta de empresa entrando por "Sou
      // Estudante" caía direto no painel da empresa, ignorando a escolha.
      const { data: conta } = await api.get('/auth/me/');
      const contaEhEmpresa = conta.empresa !== null && conta.empresa !== undefined;

      if (contaEhEmpresa !== isCompany) {
        clearTokens();
        setError(ERRO_LOGIN);
        return;
      }

      onLogin();
    } catch (err) {
      if (sessaoGravada) clearTokens();

      // No login, qualquer falha vira a mesma mensagem (ver ERRO_LOGIN).
      // No cadastro o detalhe é útil e não vaza nada: quem está criando
      // a conta precisa saber qual campo recusou.
      if (!isRegister) {
        setError(ERRO_LOGIN);
        return;
      }

      const detail = err.response?.data;
      if (typeof detail === 'object' && detail !== null) {
        const firstKey = Object.keys(detail)[0];
        const msg = Array.isArray(detail[firstKey]) ? detail[firstKey][0] : detail[firstKey];
        setError(String(msg));
      } else {
        setError('Erro ao processar. Verifique seus dados.');
      }
    } finally {
      setLoading(false);
    }
  };

  let submitLabel = isRegister ? 'Criar conta' : 'Entrar';
  if (loading) submitLabel = 'Carregando...';

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Painel da marca: Azul Bridge, título em Montserrat e as faixas */}
      <section
        aria-label="SkillBridge"
        className="relative isolate flex min-h-[15rem] flex-col justify-end overflow-hidden bg-brand-blue px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-14 lg:py-12"
      >
        <Grafismo variante="ponte" tom="azul" className="absolute right-4 top-4 -z-10 h-24 sm:right-8 sm:top-6 sm:h-36 lg:right-12 lg:top-12 lg:h-auto lg:w-[min(70%,26rem)]" />
        <div className="mt-10 max-w-md animate-[var(--animate-rise)] lg:mt-0">
          <p className="font-display text-[2rem] font-extrabold leading-[1.08] tracking-[-0.02em] sm:text-[2.6rem] lg:text-[3.2rem]">
            Mostre o que você já construiu.
          </p>
          <p className="mt-4 max-w-sm text-body-large text-white/85">
            Projetos, artigos e desafios. Um perfil que fala por você.
          </p>
        </div>
      </section>

      {/* Formulário */}
      <div className="flex items-start justify-center px-4 py-10 sm:px-8 lg:items-center">
      <div className="w-full max-w-md animate-[var(--animate-rise)] [animation-delay:120ms]">
        {/* logo nas cores principais, sobre o branco: no azul ela perdia contraste */}
        <Logo variant="lockup" height="2.5rem" className="mb-10" />
        <div className="mb-7">
          <h1 className="text-headline-medium text-on-surface">
            {isRegister ? 'Crie sua conta' : 'Boas-vindas de volta'}
          </h1>
          <p className="mt-1 text-body-medium text-on-surface-variant">
            {isRegister ? 'Crie sua conta para começar' : 'Entre na sua conta'}
          </p>
        </div>

        <div className="mb-6 flex rounded-full bg-surface-container-high p-1">
          <button
            type="button"
            onClick={() => setIsCompany(false)}
            className={`w-1/2 rounded-full py-2.5 text-label-large transition-all duration-300 ${
              !isCompany ? 'bg-surface-container-lowest text-primary shadow-[var(--shadow-elevation-1)]' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Sou Estudante
          </button>
          <button
            type="button"
            onClick={() => setIsCompany(true)}
            className={`w-1/2 rounded-full py-2.5 text-label-large transition-all duration-300 ${
              isCompany ? 'bg-surface-container-lowest text-primary shadow-[var(--shadow-elevation-1)]' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Sou Empresa
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-[var(--radius-sm)] border border-error/30 bg-error-container/25 px-4 py-3 text-body-medium text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              {isCompany && (
                <>
                  <Input
                    id="empresa-nome"
                    label="Nome da Empresa"
                    value={empresaNome}
                    onChange={(e) => setEmpresaNome(e.target.value)}
                    required={isCompany}
                    placeholder="Nome da sua empresa"
                  />
                  <Input
                    id="empresa-setor"
                    label="Setor de Atuação"
                    value={empresaSetor}
                    onChange={(e) => setEmpresaSetor(e.target.value)}
                    required={isCompany}
                    placeholder="Ex: Tecnologia, Finanças, etc."
                  />
                </>
              )}
              <Input
                id="nome"
                label={`Nome completo ${isCompany ? '(Recrutador)' : ''}`}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Seu nome"
              />
              <Input
                id="username"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="seu_username"
              />
            </>
          )}

          <Input
            id="email"
            type="email"
            label="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="seu@email.com"
          />

          <Input
            id="password"
            type="password"
            label="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
          />

          {isRegister && (
            <Input
              id="password-confirm"
              type="password"
              label="Confirmar senha"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={8}
              placeholder="Repita a senha"
            />
          )}

          <Button type="submit" variant="filled" size="lg" disabled={loading} className="w-full">
            {loading && <Spinner size="sm" className="[&_circle:first-child]:stroke-white/30" />}
            {submitLabel}
          </Button>
        </form>

        <p className="mt-6 text-center text-body-medium text-on-surface-variant">
          {isRegister ? 'Já tem uma conta?' : 'Não tem conta?'}{' '}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="font-medium text-primary transition-colors hover:opacity-80"
          >
            {isRegister ? 'Fazer login' : 'Criar conta'}
          </button>
        </p>
      </div>
      </div>
    </div>
  );
}
