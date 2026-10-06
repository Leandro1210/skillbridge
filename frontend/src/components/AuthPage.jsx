import { useState } from 'react';
import api from '../api';
import { setTokens, clearTokens } from '../auth';
import Card from './ui/Card';
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
    // Véu suave com o azul da marca aplicado na própria superfície: dá
    // profundidade ao branco sem virar decoração colorida.
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        backgroundColor: 'var(--color-surface)',
        backgroundImage:
          'radial-gradient(ellipse 80% 60% at 50% -10%, var(--color-primary-container), transparent 65%)',
      }}
    >
      <Card padding="lg" className="w-full max-w-md animate-[var(--animate-fade-in)]">
        <div className="mb-7 flex flex-col items-center text-center">
          <Logo variant="lockup" height="2.5rem" className="mb-4" />
          <p className="text-body-medium text-on-surface-variant">
            {isRegister ? 'Crie sua conta para começar' : 'Entre na sua conta'}
          </p>
        </div>

        <div className="mb-6 flex rounded-full bg-surface-container-highest p-1">
          <button
            type="button"
            onClick={() => setIsCompany(false)}
            className={`w-1/2 rounded-full py-2 text-label-large transition-all ${
              !isCompany ? 'bg-primary text-on-primary shadow-[var(--shadow-elevation-1)]' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Sou Estudante
          </button>
          <button
            type="button"
            onClick={() => setIsCompany(true)}
            className={`w-1/2 rounded-full py-2 text-label-large transition-all ${
              isCompany ? 'bg-primary text-on-primary shadow-[var(--shadow-elevation-1)]' : 'text-on-surface-variant hover:text-on-surface'
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

          <Button type="submit" variant="filled" disabled={loading} className="w-full">
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
      </Card>
    </div>
  );
}
