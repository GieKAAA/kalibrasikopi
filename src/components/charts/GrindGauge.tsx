import { fmtNum } from '../../lib/format';

/** Dial setengah lingkaran: kiri = lebih halus, tengah = tetap, kanan = lebih kasar. */
export function GrindGauge({ value, min = -3, max = 3 }: { value: number; min?: number; max?: number }) {
  const cx = 150;
  const cy = 140;
  const r = 110;
  const clamped = Math.max(min, Math.min(max, value));
  const angle = ((clamped - min) / (max - min)) * 180 - 90; // −90° (kiri) … +90° (kanan)

  const arc = (from: number, to: number) => {
    const a0 = Math.PI * (1 - from);
    const a1 = Math.PI * (1 - to);
    const p0 = [cx + r * Math.cos(a0), cy - r * Math.sin(a0)];
    const p1 = [cx + r * Math.cos(a1), cy - r * Math.sin(a1)];
    return `M${p0[0]},${p0[1]} A${r},${r} 0 0 1 ${p1[0]},${p1[1]}`;
  };

  const segments = [
    { from: 0, to: 0.2, color: 'var(--fine)' },
    { from: 0.2, to: 0.4, color: 'color-mix(in srgb, var(--fine) 55%, var(--hold))' },
    { from: 0.4, to: 0.6, color: 'var(--hold)' },
    { from: 0.6, to: 0.8, color: 'color-mix(in srgb, var(--coarse) 55%, var(--hold))' },
    { from: 0.8, to: 1, color: 'var(--coarse)' },
  ];

  return (
    <svg viewBox="0 0 300 170" className="block h-auto w-full max-w-[320px]" role="img" aria-label={`Arah penyesuaian grinder ${fmtNum(value, 2)} step`}>
      {segments.map((s) => (
        <path key={s.from} d={arc(s.from + 0.006, s.to - 0.006)} stroke={s.color} strokeWidth={22} fill="none" strokeLinecap="butt" />
      ))}
      {Array.from({ length: 13 }, (_, i) => {
        const a = Math.PI * (1 - i / 12);
        const r1 = r - 18;
        const r2 = r - (i % 2 === 0 ? 30 : 24);
        return (
          <line
            key={i}
            x1={cx + r1 * Math.cos(a)}
            y1={cy - r1 * Math.sin(a)}
            x2={cx + r2 * Math.cos(a)}
            y2={cy - r2 * Math.sin(a)}
            stroke="var(--muted)"
            strokeWidth={i % 2 === 0 ? 2 : 1}
          />
        );
      })}
      <text x={cx - r} y={cy + 24} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--fine)">
        HALUS
      </text>
      <text x={cx} y={20} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--hold)">
        TETAP
      </text>
      <text x={cx + r} y={cy + 24} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--coarse)">
        KASAR
      </text>
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'transform 700ms cubic-bezier(.2,.9,.25,1.2)' }}>
        <path d={`M${cx - 7},${cy} L${cx},${cy - r + 34} L${cx + 7},${cy} Z`} fill="var(--ink)" />
      </g>
      <circle cx={cx} cy={cy} r={13} fill="var(--ink)" />
      <circle cx={cx} cy={cy} r={5} fill="var(--surface)" />
    </svg>
  );
}
