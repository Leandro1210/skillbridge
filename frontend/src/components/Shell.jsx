import clsx from 'clsx';
import { Link, NavLink, useLocation } from 'react-router-dom';
import Icon from './ui/Icon';
import Button from './ui/Button';
import Logo from './ui/Logo';

/**
 * Chrome compartilhado do app, nas cores do manual:
 * - telas largas: trilho de navegação em Azul-noturno com o símbolo da
 *   marca no topo; o item ativo é uma pílula Azul Bridge;
 * - telas pequenas: barra inferior branca;
 * - topo (só no celular): barra branca translúcida com a logo e "Sair";
 * - o "Sair" das telas largas fica no pé do trilho;
 * - rodapé: leve, na cor da página, com a logo pequena centralizada.
 * Cada troca de página entra com uma transição suave (fade + subida).
 *
 * Props:
 *   navItems  [{ to, label, icon, end }] — destinos (rotas) da navegação
 *   homePath  rota aberta ao clicar no logo
 *   rightSlot conteúdo extra à direita da topbar
 *   onLogout  ação do botão "Sair"
 */
export default function Shell({ navItems, homePath = '/', rightSlot, onLogout, children }) {
  const hasNav = navItems && navItems.length > 0;
  const { pathname } = useLocation();

  return (
    // coluna da altura da tela: o <main> cresce e empurra o rodapé para o fim da página
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Trilho de navegação — telas largas */}
      {hasNav && (
        <nav
          aria-label="Navegação principal"
          className="fixed inset-y-0 left-0 z-50 hidden w-24 flex-col items-center overflow-hidden bg-brand-navy pb-6 lg:flex"
        >
          <Link to={homePath} aria-label="SkillBridge, página inicial" className="mb-6 flex h-[4.5rem] w-full items-center justify-center transition-transform duration-300 hover:scale-105">
            <Logo variant="mark" height="2.25rem" onDark aria-hidden="true" />
          </Link>
          <div className="flex w-full flex-col items-center gap-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="group flex w-full flex-col items-center gap-1.5 px-2 py-2.5">
                {({ isActive }) => (
                  <>
                    <span
                      className={clsx(
                        'flex h-9 w-14 items-center justify-center rounded-full transition-all duration-300 ease-[var(--ease-brand)]',
                        isActive
                          ? 'bg-brand-blue text-white shadow-[var(--shadow-brand)]'
                          : 'text-white/60 group-hover:bg-white/10 group-hover:text-white',
                      )}
                    >
                      <Icon name={item.icon} size="1.35rem" />
                    </span>
                    <span className={clsx('text-label-small transition-colors', isActive ? 'text-white' : 'text-white/60 group-hover:text-white')}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
          {/* sair: no pé do trilho, com o mesmo formato dos destinos */}
          <button type="button" onClick={onLogout} className="group mt-auto flex w-full flex-col items-center gap-1.5 px-2 py-2.5">
            <span className="flex h-9 w-14 items-center justify-center rounded-full text-white/60 transition-all duration-300 group-hover:bg-white/10 group-hover:text-white">
              <Icon name="logout" size="1.3rem" />
            </span>
            <span className="text-label-small text-white/60 transition-colors group-hover:text-white">Sair</span>
          </button>
        </nav>
      )}

      {/* Barra superior: no celular (com o trilho, nas telas largas, a logo e o sair já estão nele) */}
      <header className={clsx('sticky top-0 z-40 border-b border-outline-variant/70 bg-surface-container-lowest/80 backdrop-blur-xl', hasNav && 'lg:hidden')}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            to={homePath}
            aria-label="Ir para o início"
            className="flex items-center rounded-[var(--radius-sm)] px-2 py-1.5 transition-opacity hover:opacity-80"
          >
            <Logo variant="lockup" height="1.75rem" />
          </Link>

          <div className="flex items-center gap-2">
            {rightSlot}
            <Button variant="text" size="sm" onClick={onLogout} aria-label="Sair">
              <Icon name="logout" size="1.1rem" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Barra de navegação — telas pequenas */}
      {hasNav && (
        <nav
          aria-label="Navegação principal (celular)"
          className="fixed inset-x-0 bottom-0 z-40 flex border-t border-outline-variant/70 bg-surface-container-lowest/90 backdrop-blur-xl lg:hidden"
        >
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="flex flex-1 flex-col items-center gap-1 py-2.5">
              {({ isActive }) => (
                <>
                  <span
                    className={clsx(
                      'flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300 ease-[var(--ease-brand)]',
                      isActive ? 'bg-primary text-on-primary shadow-[var(--shadow-brand)]' : 'text-on-surface-variant',
                    )}
                  >
                    <Icon name={item.icon} size="1.3rem" />
                  </span>
                  <span className={clsx('text-label-small', isActive ? 'text-primary' : 'text-on-surface-variant')}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}

      <main className={clsx('flex-1 pt-8', hasNav ? 'pb-24 lg:pb-16 lg:pl-24' : 'pb-16')}>
        {/* a chave pela rota reinicia a animação de entrada a cada página */}
        <div key={pathname} className="animate-[var(--animate-page)]">
          {children}
        </div>
      </main>

      {/* rodapé leve: mesma cor da página, separado só por uma linha fina */}
      <footer className={clsx(hasNav && 'mb-[4.25rem] lg:mb-0 lg:pl-24')}>
        <div className="mx-auto flex max-w-6xl justify-center border-t border-outline-variant/70 px-4 py-5">
          <Logo variant="lockup" height="1.35rem" aria-label="SkillBridge" className="opacity-70 transition-opacity hover:opacity-100" />
        </div>
      </footer>
    </div>
  );
}
