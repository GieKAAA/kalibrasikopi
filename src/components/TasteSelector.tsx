import { TASTE_PRESETS, tasteLabel } from '../fuzzy/advice';
import { fmtNum } from '../lib/format';
import { cx } from './ui';

function tasteColor(v: number): string {
  if (v < -0.4) return 'var(--sour)';
  if (v > 0.4) return 'var(--bitter)';
  return 'var(--balanced)';
}

/** Pemilih profil rasa: preset linguistik (asam–seimbang–pahit) + slider halus −5…+5. */
export function TasteSelector({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <span className="text-sm font-semibold text-muted">Profil rasa (cicip shot)</span>
        <span className="text-sm font-semibold" style={{ color: value === null ? undefined : tasteColor(value) }}>
          {value === null ? 'Belum dipilih' : `${tasteLabel(value)} · ${value > 0 ? '+' : ''}${fmtNum(value)}`}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
        {TASTE_PRESETS.map((p) => {
          const active = value !== null && Math.abs(value - p.value) < 0.01;
          const color = tasteColor(p.value);
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              aria-pressed={active}
              className={cx(
                'flex min-h-16 flex-col items-center justify-center rounded-xl border-2 px-0.5 text-center text-[12px] leading-tight font-semibold transition active:scale-95 sm:text-[13px]',
                active ? 'text-white shadow-md' : 'border-transparent bg-surface-2 text-ink hover:border-line',
              )}
              style={active ? { background: color, borderColor: color } : undefined}
            >
              <span
                className="mb-1 block size-2.5 rounded-full"
                style={{ background: active ? 'white' : color, opacity: 0.35 + Math.min(Math.abs(p.value), 4) / 6 }}
              />
              {p.label}
            </button>
          );
        })}
      </div>
      <input
        type="range"
        min={-5}
        max={5}
        step={0.5}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Skala rasa, minus 5 sangat asam sampai plus 5 sangat pahit"
        className={cx('taste-range mt-2 w-full', value === null && 'opacity-50')}
      />
      <div className="flex justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span>Asam −5</span>
        <span>Seimbang 0</span>
        <span>Pahit +5</span>
      </div>
    </div>
  );
}
