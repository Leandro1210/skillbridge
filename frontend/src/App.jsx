import { useState, useEffect, useCallback } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import AuthPage from './components/AuthPage';
import FeedPage from './components/FeedPage';
import DesafioPage from './components/DesafioPage';
import CompanyDashboard from './components/CompanyDashboard';
import CompanyChallenges from './components/CompanyChallenges';
import CompanySubmissions from './components/CompanySubmissions';
import PerfilAlunoPage from './components/PerfilAlunoPage';
import PerfilEditarPage from './components/PerfilEditarPage';
import PerfilEmpresaPage from './components/PerfilEmpresaPage';
import CompanyProfileEdit from './components/CompanyProfileEdit';
import Shell from './components/Shell';
import Button from './components/ui/Button';
import Carregando from './components/ui/Carregando';
import Logo from './components/ui/Logo';
import api from './api';
import { EVENTO_ATIVIDADE } from './lib/atividade';
import { isLoggedIn as hasStoredToken, getRefreshToken, clearTokens } from './auth';

const NAV_ALUNO = [
  { to: '/', label: 'Feed', icon: 'home', end: true },
  { to: '/perfil', label: 'Meu perfil', icon: 'badge' },
];

const NAV_EMPRESA = [
  { to: '/empresa', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/empresa/desafios', label: 'Desafios', icon: 'checklist' },
  { to: '/empresa/submissoes', label: 'Submissões', icon: 'task_alt' },
  { to: '/empresa/perfil', label: 'Perfil', icon: 'badge' },
];

/**
 * Acesso diário do aluno (+5 XP, uma vez por dia — o backend garante). Se
 * rendeu XP, avisa a tela de atividade para recarregar. Falha não importa:
 * é só atividade, não pode atrapalhar a entrada no app.
 */
function registrarAcessoDoDia() {
  api.post('/atividade/acesso/')
    .then(({ data }) => {
      if (data.xp_ganho > 0) window.dispatchEvent(new Event(EVENTO_ATIVIDADE));
    })
    .catch(() => {});
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(hasStoredToken);
  const [userProfile, setUserProfile] = useState(null);
  const [profileError, setProfileError] = useState(false);
  const [profileReloadToken, setProfileReloadToken] = useState(0);

  // Carrega perfil do usuário ao logar (ou quando profileReloadToken muda,
  // usado pelo botão "Tentar novamente" na tela de erro abaixo).
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;

    void (async () => {
      try {
        const { data } = await api.get('/auth/me/');
        if (cancelled) return;
        setUserProfile(data);
        setProfileError(false);
        if (!data.empresa) registrarAcessoDoDia();
      } catch (err) {
        if (cancelled) return;
        console.error('Erro ao carregar perfil:', err);
        setProfileError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, profileReloadToken]);

  const retryLoadProfile = () => setProfileReloadToken((k) => k + 1);

  const handleLogout = useCallback(() => {
    clearTokens();
    setIsLoggedIn(false);
    setUserProfile(null);
    setProfileError(false);
  }, []);

  // O interceptor do axios dispara esse evento quando o refresh token
  // falha/expira — resetamos o estado direto, e a tela de login aparece
  // em qualquer rota em que o usuário estiver.
  useEffect(() => {
    window.addEventListener('skillbridge:auth-logout', handleLogout);
    return () => window.removeEventListener('skillbridge:auth-logout', handleLogout);
  }, [handleLogout]);

  const handleLogoutClick = () => {
    const refresh = getRefreshToken();
    if (refresh) {
      // Best-effort: invalida o refresh token no servidor. Não bloqueia
      // o logout local se a chamada falhar (ex: token já expirado).
      api.post('/auth/logout/', { refresh }).catch(() => {});
    }
    handleLogout();
  };

  // Tela de autenticacao
  if (!isLoggedIn) {
    return <AuthPage onLogin={() => setIsLoggedIn(true)} />;
  }

  // Se logado mas o perfil falhou ao carregar, oferece retry em vez de travar
  if (profileError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-surface px-4 text-center">
        <Logo variant="mark" height="2.5rem" className="mb-1" />
        <p className="text-body-large text-on-surface-variant">Não foi possível carregar seu perfil.</p>
        <div className="flex gap-3">
          <Button variant="filled" onClick={retryLoadProfile}>Tentar novamente</Button>
          <Button variant="text" onClick={handleLogout}>Sair</Button>
        </div>
      </div>
    );
  }

  // Se logado mas perfil ainda nao carregou, mostra loading
  if (!userProfile) {
    return (
      <Carregando telaCheia />
    );
  }

  const isCompanyUser = userProfile.empresa !== null && userProfile.empresa !== undefined;

  if (isCompanyUser) {
    return (
      <Shell navItems={NAV_EMPRESA} homePath="/empresa" onLogout={handleLogoutClick}>
        <Routes>
          <Route path="/empresa" element={<CompanyDashboard />} />
          <Route path="/empresa/desafios" element={<CompanyChallenges />} />
          <Route path="/empresa/submissoes" element={<CompanySubmissions />} />
          <Route path="/empresa/perfil" element={<CompanyProfileEdit />} />
          <Route path="/alunos/:id" element={<PerfilAlunoPage />} />
          <Route path="/empresas/:id" element={<PerfilEmpresaPage />} />
          <Route path="*" element={<Navigate to="/empresa" replace />} />
        </Routes>
      </Shell>
    );
  }

  return (
    <Shell navItems={NAV_ALUNO} homePath="/" onLogout={handleLogoutClick}>
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/desafios/:id" element={<DesafioPage />} />
        <Route path="/perfil" element={<PerfilAlunoPage alunoId={userProfile.id} />} />
        <Route path="/perfil/editar" element={<PerfilEditarPage />} />
        <Route path="/empresas/:id" element={<PerfilEmpresaPage linkParaDesafios />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
