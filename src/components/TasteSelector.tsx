import { TASTE_PRESETS, tasteLabel } from '../fuzzy/advice';
import { fmtNum } from '../lib/format';
import { cx } from './ui';

function tasteColor(v: number): string {
  if (v < -0.4) return 'var(--sour)';
  if (v > 0.4) return 'var(--bitter)';
  return 'var(--balanced)';
}

/** Pemilih profil rasa: preset linguistik (asam–seimbang–pahit) + slider halus −5…+5. */
export function TasteSelector({ value, onChange, highlight }: { value: number | null; onChange: (v: number) => void; highlight?: boolean }) {
  return (
    <div className="py-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold">
          Rasa
          {highlight && value === null && <span className="ml-2 text-xs font-medium text-crema">belum diisi</span>}
        </span>
        <span className="text-sm font-semibold" style={{ color: value === null ? 'var(--muted)' : tasteColor(value) }}>
          {value === null ? 'Cicipi lalu pilih' : `${tasteLabel(value)} (${value > 0 ? '+' : ''}${fmtNum(value)})`}
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
                'flex min-h-14 items-center justify-center rounded-lg border px-1 text-center text-[13px] leading-tight font-semibold transition active:scale-[0.98]',
                active ? 'text-bg' : 'border-line bg-surface text-ink hover:bg-surface-2',
              )}
              style={active ? { background: color, borderColor: color } : { boxShadow: `inset 0 -3px 0 ${color}` }}
            >
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
        className={cx('taste-range mt-1 w-full', value === null && 'opacity-40')}
      />
      <div className="flex justify-between text-xs text-muted">
        <span>Asam −5</span>
        <span>Seimbang 0</span>
        <span>Pahit +5</span>
      </div>
    </div>
  );
}
