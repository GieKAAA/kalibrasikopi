import { membership } from '../../fuzzy/membership';
import type { FuzzyVariable } from '../../fuzzy/types';
import { fmtNum } from '../../lib/format';
import { termColor } from './colors';

interface Props {
  variable: FuzzyVariable;
  /** Nilai input crisp — digambar sebagai garis vertikal. */
  value?: number | null;
  /** Kurva agregat output (hasil komposisi MAX). */
  curve?: { z: number; mu: number }[];
  centroid?: number | null;
  height?: number;
  compact?: boolean;
}


/** Grafik fungsi keanggotaan (SVG, responsif lewat viewBox). */
export function MembershipChart({ variable, value, curve, centroid, height = 190, compact }: Props) {
  const W = compact ? 360 : 640;
  const padL = 34;
  const padR = 16;
  const padT = compact ? 10 : 26;
  const padB = 30;
  const H = height;
  const x = (v: number) => padL + ((v - variable.min) / (variable.max - variable.min)) * (W - padL - padR);
  const y = (mu: number) => padT + (1 - mu) * (H - padT - padB);

  const ticks = Array.from(
    new Set([variable.min, variable.max, ...variable.terms.flatMap((t) => t.points)].map((v) => Math.round(v * 100) / 100)),
  ).sort((a, b) => a - b);

  const path = (pts: [number, number, number, number]) => {
    const [a, b, c, d] = pts;
    const seq: [number, number][] = [];
    seq.push([a, a === b ? 1 : 0]);
    seq.push([b, 1], [c, 1]);
    seq.push([d, c === d ? 1 : 0]);
    return seq.map(([vx, mu], i) => `${i ? 'L' : 'M'}${x(vx).toFixed(1)},${y(mu).toFixed(1)}`).join(' ');
  };

  const areaPath = curve
    ? `M${x(curve[0].z)},${y(0)} ` + curve.map((p) => `L${x(p.z).toFixed(1)},${y(p.mu).toFixed(1)}`).join(' ') + ` L${x(curve[curve.length - 1].z)},${y(0)} Z`
    : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Fungsi keanggotaan ${variable.label}`}>
      {[0, 0.5, 1].map((mu) => (
        <g key={mu}>
          <line x1={padL} x2={W - padR} y1={y(mu)} y2={y(mu)} stroke="var(--line)" strokeDasharray={mu === 0 ? undefined : '3 5'} />
          <text x={padL - 8} y={y(mu) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">
            {mu}
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <text key={t} x={x(t)} y={H - 10} textAnchor="middle" fontSize="12" fill="var(--muted)" className="tabular">
          {fmtNum(t, 2)}
        </text>
      ))}

      {areaPath && <path d={areaPath} fill="var(--brand)" fillOpacity={0.28} stroke="var(--brand)" strokeWidth={2} />}

      {variable.terms.map((t, i) => (
        <path
          key={t.key}
          d={path(t.points)}
          fill="none"
          stroke={termColor(variable.key, i)}
          strokeWidth={curve ? 1.5 : 2.5}
          strokeOpacity={curve ? 0.7 : 1}
          strokeDasharray={curve ? '5 4' : undefined}
          strokeLinejoin="round"
        />
      ))}

      {!compact &&
        variable.terms.map((t, i) => {
          const cxv = (t.points[1] + t.points[2]) / 2;
          return (
            <text key={t.key} x={x(cxv)} y={padT - 9} textAnchor="middle" fontSize="12.5" fontWeight={600} fill={termColor(variable.key, i)}>
              {t.label}
            </text>
          );
        })}

      {value !== undefined && value !== null && (
        <g>
          <line x1={x(value)} x2={x(value)} y1={padT - 4} y2={y(0)} stroke="var(--ink)" strokeWidth={2} />
          {variable.terms.map((t, i) => {
            const mu = membership(value, t.points);
            if (mu <= 0) return null;
            return (
              <g key={t.key}>
                <circle cx={x(value)} cy={y(mu)} r={5} fill={termColor(variable.key, i)} stroke="var(--surface)" strokeWidth={2} />
                <text x={x(value) + 8} y={y(mu) + (mu > 0.9 ? 14 : -6)} fontSize="12" fontWeight={700} fill={termColor(variable.key, i)}>
                  μ={fmtNum(mu, 2)}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {centroid !== undefined && centroid !== null && (() => {
        const cxp = x(centroid);
        const right = cxp < W * 0.6;
        const label = `z* = ${fmtNum(centroid, 2)}`;
        const bw = label.length * 7.4 + 14;
        const bx = right ? cxp + 8 : cxp - 8 - bw;
        const by = padT + 10;
        return (
          <g>
            <line x1={cxp} x2={cxp} y1={padT} y2={y(0)} stroke="var(--ink)" strokeWidth={2} strokeDasharray="6 4" />
            <rect x={bx} y={by} width={bw} height={22} rx={11} fill="var(--ink)" />
            <text x={bx + bw / 2} y={by + 15.5} textAnchor="middle" fontSize="13" fontWeight={700} fill="var(--surface)">
              {label}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}
