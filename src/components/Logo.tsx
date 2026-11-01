export function LogoMark({ className = 'size-11' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="var(--brand)" />
      <g fill="none" stroke="var(--brand-ink)" strokeWidth="4" strokeLinecap="round">
        <ellipse cx="32" cy="32" rx="14" ry="19" transform="rotate(35 32 32)" />
        <path d="M26.5 17.5c6 5 -2 11 5.5 14.5s0.5 10 5.5 14.5" />
      </g>
    </svg>
  );
}

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark />
      {!compact && (
        <div className="leading-tight">
          <div className="text-[17px] font-semibold tracking-tight">Kalibrasi Kopi</div>
          <div className="text-xs text-muted">Smart Barista Handbook</div>
        </div>
      )}
    </div>
  );
}
