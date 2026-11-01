import { describe, expect, it } from 'vitest';
import { createDefaultKnowledgeBase } from './defaultKb';
import { infer } from './engine';
import { membership } from './membership';

const kb = createDefaultKnowledgeBase();

/** Integrasi numerik halus (aturan trapesium, 60.001 titik) sebagai pembanding. */
function numericCentroid(clips: Record<string, number>) {
  const n = 60000;
  const { min, max, terms } = kb.output;
  const h = (max - min) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i <= n; i++) {
    const z = min + i * h;
    let mu = 0;
    for (const t of terms) if (clips[t.key] > 0) mu = Math.max(mu, Math.min(clips[t.key], membership(z, t.points)));
    const w = i === 0 || i === n ? 0.5 : 1;
    num += w * z * mu;
    den += w * mu;
  }
  return num / den;
}

describe('centroid eksak (luas & momen)', () => {
  it('contoh manual 18 g / 36 g / 20 s / −2,5', () => {
    const r = infer(kb, { dose: 18, yield: 36, time: 20, taste: -2.5 });
    expect(r.segments).toHaveLength(2);
    const [flat, fall] = r.segments;
    expect(flat.piece).toBe('clip');
    expect(flat.z0).toBeCloseTo(-3);
    expect(flat.z1).toBeCloseTo(-1 - 5 / 6, 6); // −1 − α, α = 5/6
    expect(fall.piece).toBe('fall');
    expect(fall.z1).toBeCloseTo(-1);
    expect(r.denominator).toBeCloseTo(flat.area + fall.area, 10);
    expect(r.crisp!).toBeCloseTo(-2.19, 2);
  });

  it('sama dengan integrasi numerik untuk 300 input acak', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 300; i++) {
      const input = { dose: 14 + rnd() * 10, yield: 20 + rnd() * 40, time: 10 + rnd() * 40, taste: -5 + rnd() * 10 };
      const r = infer(kb, input);
      expect(r.crisp).not.toBeNull();
      expect(r.crisp!).toBeCloseTo(numericCentroid(r.clips), 3);
      // segmen kontinu dan berurutan
      for (let j = 1; j < r.segments.length; j++) expect(r.segments[j].z0).toBeGreaterThanOrEqual(r.segments[j - 1].z1 - 1e-9);
    }
  });
});
