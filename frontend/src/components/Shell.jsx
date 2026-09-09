import clsx from 'clsx';
import Icon from './ui/Icon';
import Button from './ui/Button';
import Logo from './ui/Logo';

/**
 * Chrome compartilhado do app. Quando `navItems` é passado (shell da
 * empresa), a navegação vira uma Navigation Rail (M3) fixa à esquerda
 * em telas largas, e uma barra de navegação inferior em telas
 * pequenas — em vez de abas em pílula dentro da topbar.
 */
export default function Shell({ navItems, rightSlot, activePage, onLogoClick, onLogout, children }) {
  const hasNav = navItems && navItems.length > 0;

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar — só a marca e as ações da conta, sem navegação de páginas */}
      <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface-container-lowest/90 backdrop-blur-md">
        <div className={clsx('mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8', hasNav && 'lg:pl-28')}>
          <button
            onClick={onLogoClick}
            aria-label="Ir para o início"
            className="flex items-center rounded-[var(--radius-sm)] px-2 py-1.5 transition-colors hover:bg-on-surface/5"
          >
            <Logo variant="lockup" height="1.75rem" />
          </button>

          <div className="flex items-center gap-2">
            {rightSlot}
            <Button variant="text" size="sm" onClick={onLogout}>
              <Icon name="logout" size="1.1rem" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Rail — destinos fixos à esquerda, telas largas */}
      {hasNav && (
        <nav className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col items-center gap-1 border-r border-outline-variant bg-surface-container-lowest pt-20 lg:flex">
          {navItems.map((item) => {
            const active = activePage === item.page;
            return (
              <button
                key={item.page}
                onClick={item.onClick}
                className="flex w-full flex-col items-center gap-1.5 px-3 py-2.5 transition-colors"
              >
                <span
                  className={clsx(
                    'flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                    active ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-on-surface/5',
                  )}
                >
                  <Icon name={item.icon} size="1.35rem" />
                </span>
                <span className={clsx('text-label-medium', active ? 'font-medium text-on-surface' : 'text-on-surface-variant')}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Navigation Bar — mesmos destinos, telas pequenas */}
      {hasNav && (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-outline-variant bg-surface-container-lowest lg:hidden">
          {navItems.map((item) => {
            const active = activePage === item.page;
            return (
              <button
                key={item.page}
                onClick={item.onClick}
                className="flex flex-1 flex-col items-center gap-1 py-2.5"
              >
                <span
                  className={clsx(
                    'flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                    active ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant',
                  )}
                >
                  <Icon name={item.icon} size="1.35rem" />
                </span>
                <span className={clsx('text-label-small', active ? 'font-medium text-on-surface' : 'text-on-surface-variant')}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      <main className={clsx('pt-8', hasNav ? 'pb-24 lg:pb-16 lg:pl-24' : 'pb-16')}>{children}</main>

      <footer className={clsx('border-t border-outline-variant py-6', hasNav && 'lg:pl-24')}>
        <div className="flex flex-col items-center gap-1.5">
          <Logo variant="mark" height="1.15rem" aria-hidden="true" />
          {/* Azul escuro da marca — o mesmo do "Skill" na logo, para o
              símbolo e o nome lerem como uma peça só. Discreto: é
              assinatura de rodapé, não um segundo cabeçalho. */}
          <p className="text-center text-label-small font-bold tracking-wide text-[var(--sb-logo-ink)]">
            SkillBridge
          </p>
        </div>
      </footer>
    </div>
  );
}
