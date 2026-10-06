import { useState, useEffect, useCallback } from 'react';
import './index.css';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import ProjectCatalog from './components/ProjectCatalog';
import ProjectWorkspace from './components/ProjectWorkspace';
import CompanyDashboard from './components/CompanyDashboard';
import CompanyChallenges from './components/CompanyChallenges';
import CompanySubmissions from './components/CompanySubmissions';
import StudentProfileEdit from './components/StudentProfileEdit';
import CompanyProfileEdit from './components/CompanyProfileEdit';
import Shell from './components/Shell';
import Button from './components/ui/Button';
import Spinner from './components/ui/Spinner';
import Icon from './components/ui/Icon';
import Logo from './components/ui/Logo';
import api from './api';
import { isLoggedIn as hasStoredToken, getRefreshToken, clearTokens } from './auth';

const COMPANY_NAV = [
  { page: 'company-dashboard', label: 'Dashboard', icon: 'dashboard' },
  { page: 'company-desafios', label: 'Desafios', icon: 'checklist' },
  { page: 'company-submissoes', label: 'Submissões', icon: 'task_alt' },
  { page: 'company-perfil', label: 'Perfil', icon: 'badge' },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(hasStoredToken);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [profileError, setProfileError] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
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
        if (data.empresa) {
          setCurrentPage('company-dashboard');
        }
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
  // falha/expira — sem router nessa SPA, resetamos o estado direto em
  // vez de tentar navegar para uma rota "/login" que não existe.
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface">
        <Logo variant="lockup" height="2rem" />
        <div className="flex items-center gap-3">
          <Spinner size="md" />
          <span className="text-body-large text-on-surface-variant">Carregando…</span>
        </div>
      </div>
    );
  }

  // Verifica se é usuário de empresa
  const isCompanyUser = userProfile?.empresa !== null && userProfile?.empresa !== undefined;

  // Renderiza shell da empresa
  if (isCompanyUser && currentPage.startsWith('company')) {
    return (
      <Shell
        navItems={COMPANY_NAV.map((item) => ({ ...item, onClick: () => setCurrentPage(item.page) }))}
        activePage={currentPage}
        onLogoClick={() => setCurrentPage('company-dashboard')}
        onLogout={handleLogoutClick}
      >
        {currentPage === 'company-dashboard' && <CompanyDashboard onNavigate={setCurrentPage} />}
        {currentPage === 'company-desafios' && <CompanyChallenges />}
        {currentPage === 'company-submissoes' && <CompanySubmissions />}
        {currentPage === 'company-perfil' && (
          <CompanyProfileEdit onBack={() => setCurrentPage('company-dashboard')} />
        )}
      </Shell>
    );
  }

  // Shell do estudante
  let studentContent;

  if (currentPage === 'student-perfil') {
    studentContent = <StudentProfileEdit onBack={() => setCurrentPage('dashboard')} />;
  } else if (activeProjectId) {
    studentContent = (
      <ProjectWorkspace
        projectId={activeProjectId}
        onBack={() => {
          setActiveProjectId(null);
          setRefreshKey((prev) => prev + 1);
        }}
      />
    );
  } else {
    studentContent = (
      <>
        <Dashboard key={refreshKey} onContinueProject={(id) => setActiveProjectId(id)} />
        <div className="mx-auto my-12 h-px max-w-7xl bg-outline-variant" />
        <ProjectCatalog onProjectStarted={() => setRefreshKey((prev) => prev + 1)} />
      </>
    );
  }

  return (
    <Shell
      rightSlot={
        <>
          <span className="hidden text-label-medium uppercase tracking-wide text-on-surface-variant/70 md:block">
            Aprendizado &amp; Oportunidades
          </span>
          <Button variant="tonal" size="sm" onClick={() => setCurrentPage('student-perfil')}>
            <Icon name="badge" size="1.1rem" />
            Meu Perfil
          </Button>
        </>
      }
      onLogoClick={() => {
        setCurrentPage('dashboard');
        setActiveProjectId(null);
      }}
      onLogout={handleLogoutClick}
    >
      {studentContent}
    </Shell>
  );
}
