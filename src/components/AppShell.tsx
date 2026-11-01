import { BookOpen, Gauge, History, House, Settings, SlidersHorizontal } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { initials } from '../lib/format';
import { useCurrentUser, useIsHead } from '../store/useApp';
import { LogoMark } from './Logo';
import { cx } from './ui';

const BASE_NAV = [
  { to: '/', label: 'Beranda', icon: House },
  { to: '/kalibrasi', label: 'Kalibrasi', icon: Gauge },
  { to: '/resep', label: 'Resep', icon: BookOpen },
  { to: '/riwayat', label: 'Riwayat', icon: History },
];
const HEAD_NAV = { to: '/head-barista', label: 'Head Barista', icon: SlidersHorizontal };
const SETTINGS_NAV = { to: '/pengaturan', label: 'Pengaturan', icon: Settings };

/** Halaman milik menu Head Barista (dipakai untuk menandai menu aktif). */
const HEAD_PATHS = ['/head-barista', '/pakar', '/sus'];

export function AppShell({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const isHead = useIsHead();
  const { pathname } = useLocation();
  useEffect(() => {
    document.getElementById('main-scroll')?.scrollTo({ top: 0 });
  }, [pathname]);
  const nav = isHead ? [...BASE_NAV, HEAD_NAV] : BASE_NAV;
  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : to === HEAD_NAV.to ? HEAD_PATHS.some((p) => pathname.startsWith(p)) : pathname.startsWith(to);
  const phoneNav = [...nav.slice(0, 4), isHead ? { ...HEAD_NAV, label: 'Head' } : { ...SETTINGS_NAV, label: 'Akun' }];

  return (
    <div className="flex h-full">
      {/* Rail navigasi — tablet & desktop */}
      <nav aria-label="Navigasi utama" className="hidden w-[92px] shrink-0 flex-col items-center border-r border-line bg-surface py-4 md:flex">
        <LogoMark className="mb-5 size-10" />
        <div className="flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <RailLink key={to} to={to} label={label} active={isActive(to)}>
              <Icon className="size-[22px]" strokeWidth={1.75} />
            </RailLink>
          ))}
        </div>
        <RailLink to={SETTINGS_NAV.to} label={SETTINGS_NAV.label} active={isActive(SETTINGS_NAV.to)}>
          <Settings className="size-[22px]" strokeWidth={1.75} />
        </RailLink>
        <NavLink
          to="/pengaturan"
          title={user ? `${user.name} (${user.role === 'head' ? 'Head Barista' : 'Barista'})` : undefined}
          className="mt-2 flex size-10 items-center justify-center rounded-full border border-line text-sm font-semibold text-ink"
        >
          {user ? initials(user.name) : '?'}
        </NavLink>
      </nav>

      <main id="main-scroll" className="min-w-0 flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="mx-auto w-full max-w-[1360px] px-4 py-5 sm:px-6 md:px-8 md:py-7">{children}</div>
      </main>

      {/* Bottom navigation — ponsel */}
      <nav aria-label="Navigasi utama" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden">
        <div className="grid grid-cols-5">
          {phoneNav.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={cx('relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium', active ? 'text-ink' : 'text-muted')}
              >
                {active && <span aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b bg-ink" />}
                <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function RailLink({ to, label, active, children }: { to: string; label: string; active: boolean; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'relative flex w-[76px] flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-center text-[11.5px] leading-tight font-medium transition',
        active ? 'bg-surface-2 text-ink' : 'text-muted hover:bg-surface-2/60 hover:text-ink',
      )}
    >
      {active && <span aria-hidden className="absolute top-1/2 -left-2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-ink" />}
      {children}
      {label}
    </NavLink>
  );
}
