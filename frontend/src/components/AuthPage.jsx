import { useState } from 'react';
import api from '../api';
import { setTokens } from '../auth';
import Card from './ui/Card';
import Button from './ui/Button';
import Icon from './ui/Icon';
import { Input } from './ui/Input';

/**
 * AuthPage — Tela de Login e Registro.
 *
 * Props:
 *   onLogin (function) — callback chamado após login bem-sucedido.
 */
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
      onLogin();
    } catch (err) {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card padding="lg" className="w-full max-w-md animate-[var(--animate-fade-in)]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary">
            <Icon name="hub" size="1.75rem" />
          </div>
          <h1 className="text-headline-small text-on-surface">
            Skill<span className="text-primary">Bridge</span>
          </h1>
          <p className="mt-1 text-body-medium text-on-surface-variant">
            {isRegister ? 'Crie sua conta para começar' : 'Entre na sua conta'}
          </p>
        </div>

        <div className="mb-6 flex rounded-full bg-surface-container-highest p-1">
          <button
            type="button"
            onClick={() => setIsCompany(false)}
            className={`w-1/2 rounded-full py-2 text-label-large transition-all ${
              !isCompany ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Sou Estudante
          </button>
          <button
            type="button"
            onClick={() => setIsCompany(true)}
            className={`w-1/2 rounded-full py-2 text-label-large transition-all ${
              isCompany ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:text-on-surface'
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
            {loading ? 'Carregando...' : isRegister ? 'Criar conta' : 'Entrar'}
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
