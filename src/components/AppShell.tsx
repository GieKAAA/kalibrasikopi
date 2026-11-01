import { BookOpen, BrainCircuit, Gauge, History, House, Settings } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { initials } from '../lib/format';
import { useCurrentUser } from '../store/useApp';
import { LogoMark } from './Logo';
import { cx } from './ui';

const NAV = [
  { to: '/', label: 'Beranda', icon: House },
  { to: '/kalibrasi', label: 'Kalibrasi', icon: Gauge },
  { to: '/resep', label: 'Resep', icon: BookOpen },
  { to: '/riwayat', label: 'Riwayat', icon: History },
  { to: '/pakar', label: 'Pakar', icon: BrainCircuit },
];

export function AppShell({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const { pathname } = useLocation();
  useEffect(() => {
    document.getElementById('main-scroll')?.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="flex h-full">
      {/* Rail navigasi — tablet & desktop */}
      <nav aria-label="Navigasi utama" className="hidden w-24 shrink-0 flex-col items-center border-r border-line bg-surface py-4 md:flex">
        <LogoMark className="mb-6 size-12" />
        <div className="flex flex-1 flex-col gap-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cx(
                  'group flex w-20 flex-col items-center gap-1 rounded-2xl py-2.5 text-xs font-semibold transition',
                  isActive ? 'text-ink' : 'text-muted hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cx('flex h-9 w-14 items-center justify-center rounded-full transition', isActive ? 'bg-brand text-brand-ink' : 'group-hover:bg-surface-2')}>
                    <Icon className="size-[22px]" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
        <NavLink
          to="/pengaturan"
          className={({ isActive }) =>
            cx('mb-3 flex w-20 flex-col items-center gap-1 rounded-2xl py-2 text-xs font-semibold', isActive ? 'text-ink' : 'text-muted hover:text-ink')
          }
        >
          <Settings className="size-[22px]" />
          Pengaturan
        </NavLink>
        <NavLink
          to="/pengaturan"
          title={user ? `${user.name} (${user.role === 'head' ? 'Head Barista' : 'Barista'})` : undefined}
          className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-ink"
        >
          {user ? initials(user.name) : '?'}
        </NavLink>
      </nav>

      <main id="main-scroll" className="min-w-0 flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 md:px-8 md:py-7">{children}</div>
      </main>

      {/* Bottom navigation — ponsel */}
      <nav aria-label="Navigasi utama" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {[...NAV.filter((n) => n.to !== '/pakar'), { to: '/pengaturan', label: 'Akun', icon: Settings }].map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => cx('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold', isActive ? 'text-ink' : 'text-muted')}
            >
              {({ isActive }) => (
                <>
                  <span className={cx('flex h-7 w-12 items-center justify-center rounded-full', isActive && 'bg-brand text-brand-ink')}>
                    <Icon className="size-5" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
