import { HOLD_THRESHOLD } from '../../fuzzy/advice';
import { directionColor } from './colors';

/**
 * Skala linear arah koreksi grind: kiri = lebih halus, tengah = tetap, kanan = lebih kasar.
 * Penanda menunjukkan seberapa kuat koreksinya, tanpa angka teknis.
 */
export function GrindScale({ value, min = -3, max = 3 }: { value: number; min?: number; max?: number }) {
  const clamped = Math.max(min, Math.min(max, value));
  const pct = ((clamped - min) / (max - min)) * 100;
  const holdLo = ((-HOLD_THRESHOLD - min) / (max - min)) * 100;
  const holdHi = ((HOLD_THRESHOLD - min) / (max - min)) * 100;
  const dir = Math.abs(value) < HOLD_THRESHOLD ? 'tetap' : value < 0 ? 'halus' : 'kasar';
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div aria-hidden className="select-none">
      <div className="relative h-10">
        <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
        <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-sm bg-hold/25" style={{ left: `${holdLo}%`, width: `${holdHi - holdLo}%` }} />
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-1/2 w-px -translate-y-1/2 bg-muted/60"
            style={{ left: `${((t - min) / (max - min)) * 100}%`, height: t === 0 ? 18 : 10 }}
          />
        ))}
        <div
          className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface"
          style={{ left: `${pct}%`, background: directionColor(dir), boxShadow: '0 0 0 1px var(--line)' }}
        />
      </div>
      <div className="flex justify-between text-xs font-medium text-muted">
        <span>Lebih halus</span>
        <span>Tetap</span>
        <span>Lebih kasar</span>
      </div>
    </div>
  );
}
