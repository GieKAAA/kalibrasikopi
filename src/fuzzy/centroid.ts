import { membership } from './membership';
import type { CentroidSegment, FuzzyVariable, SegmentPiece } from './types';

interface Line {
  termKey: string;
  piece: SegmentPiece;
  clip: number;
  /** μ(z) = p + q·z */
  p: number;
  q: number;
}

const EPS = 1e-9;

/** Fungsi himpunan yang sudah dipotong α: min(α, μ_term(z)), linear pada interval di antara titik patahnya. */
function lineOn(termKey: string, points: [number, number, number, number], clip: number, z0: number, z1: number): Line | null {
  const mid = (z0 + z1) / 2;
  const mu = membership(mid, points);
  if (mu <= 0) return null;
  if (mu >= clip - EPS) return { termKey, piece: 'clip', clip, p: clip, q: 0 };
  const [a, b, c, d] = points;
  if (mid < b) return { termKey, piece: 'rise', clip, p: -a / (b - a), q: 1 / (b - a) };
  if (mid > c) return { termKey, piece: 'fall', clip, p: d / (d - c), q: -1 / (d - c) };
  return { termKey, piece: 'clip', clip, p: clip, q: 0 };
}

const at = (l: Line, z: number) => l.p + l.q * z;

/**
 * Komposisi MAX dari himpunan output yang terpotong α, dipecah menjadi segmen linear.
 * Tiap segmen menyumbang luas A = ½(μ₀ + μ₁)(z₁ − z₀) dan momen
 * M = (z₁ − z₀)/6 · [z₀(2μ₀ + μ₁) + z₁(μ₀ + 2μ₁)], sehingga centroid z* = ΣM / ΣA eksak.
 */
export function aggregateSegments(output: FuzzyVariable, clips: Record<string, number>): CentroidSegment[] {
  const active = output.terms.filter((t) => (clips[t.key] ?? 0) > 0);
  if (!active.length) return [];

  // Titik patah tiap fungsi terpotong: titik a, b, c, d dan perpotongan dengan garis α.
  const cuts = new Set<number>([output.min, output.max]);
  for (const t of active) {
    const [a, b, c, d] = t.points;
    const k = clips[t.key];
    for (const x of t.points) cuts.add(x);
    if (b > a) cuts.add(a + k * (b - a));
    if (d > c) cuts.add(d - k * (d - c));
  }
  const base = [...cuts].filter((x) => x >= output.min && x <= output.max).sort((x, y) => x - y);

  const raw: CentroidSegment[] = [];
  for (let i = 0; i < base.length - 1; i++) {
    const z0 = base[i];
    const z1 = base[i + 1];
    if (z1 - z0 < EPS) continue;
    const lines = active.map((t) => lineOn(t.key, t.points, clips[t.key], z0, z1)).filter((l): l is Line => l !== null);
    if (!lines.length) continue;
    // Perpotongan antarfungsi di dalam interval memecah segmen lagi agar MAX tetap linear.
    const inner = new Set<number>([z0, z1]);
    for (let x = 0; x < lines.length; x++)
      for (let y = x + 1; y < lines.length; y++) {
        const dq = lines[x].q - lines[y].q;
        if (Math.abs(dq) < EPS) continue;
        const zc = (lines[y].p - lines[x].p) / dq;
        if (zc > z0 + EPS && zc < z1 - EPS) inner.add(zc);
      }
    const pts = [...inner].sort((x, y) => x - y);
    for (let j = 0; j < pts.length - 1; j++) {
      const s0 = pts[j];
      const s1 = pts[j + 1];
      const mid = (s0 + s1) / 2;
      let best = lines[0];
      for (const l of lines) if (at(l, mid) > at(best, mid) + EPS) best = l;
      const m0 = Math.max(0, at(best, s0));
      const m1 = Math.max(0, at(best, s1));
      raw.push(segment(s0, s1, m0, m1, best));
    }
  }

  // Gabungkan segmen berurutan yang berasal dari potongan fungsi yang sama.
  const merged: CentroidSegment[] = [];
  for (const s of raw) {
    const prev = merged.at(-1);
    if (prev && prev.termKey === s.termKey && prev.piece === s.piece && Math.abs(prev.z1 - s.z0) < EPS) {
      merged[merged.length - 1] = segment(prev.z0, s.z1, prev.m0, s.m1, { termKey: s.termKey, piece: s.piece, clip: s.clip });
    } else merged.push(s);
  }
  return merged.filter((s) => s.area > EPS);
}

function segment(z0: number, z1: number, m0: number, m1: number, src: { termKey: string; piece: SegmentPiece; clip: number }): CentroidSegment {
  const w = z1 - z0;
  return {
    z0,
    z1,
    m0,
    m1,
    area: ((m0 + m1) / 2) * w,
    moment: (w / 6) * (z0 * (2 * m0 + m1) + z1 * (m0 + 2 * m1)),
    termKey: src.termKey,
    piece: src.piece,
    clip: src.clip,
  };
}
