import type { FuzzyVariable, MfPoints } from './types';

/**
 * Derajat keanggotaan trapesium. Bahu kiri/kanan ditulis dengan a === b atau c === d,
 * segitiga dengan b === c.
 */
export function membership(x: number, [a, b, c, d]: MfPoints): number {
  if (x < a || x > d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}

export type MembershipCase = 'outside' | 'rise' | 'plateau' | 'fall';

/** Bagian fungsi trapesium yang dipakai untuk nilai x — dasar penulisan substitusi manual. */
export function membershipCase(x: number, [a, b, c, d]: MfPoints): MembershipCase {
  if (x < a || x > d) return 'outside';
  if (x >= b && x <= c) return 'plateau';
  if (x < b) return 'rise';
  return 'fall';
}

export function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

export function fuzzify(variable: FuzzyVariable, x: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const term of variable.terms) out[term.key] = membership(x, term.points);
  return out;
}

/** Validasi parameter himpunan: a ≤ b ≤ c ≤ d, di dalam semesta, dan seluruh semesta tertutup. */
export function validateVariable(variable: FuzzyVariable): string[] {
  const errors: string[] = [];
  for (const term of variable.terms) {
    const [a, b, c, d] = term.points;
    if (term.points.some((p) => !Number.isFinite(p))) {
      errors.push(`${term.label}: semua titik harus berupa angka.`);
      continue;
    }
    if (!(a <= b && b <= c && c <= d)) errors.push(`${term.label}: urutan titik harus a ≤ b ≤ c ≤ d.`);
    if (a < variable.min || d > variable.max)
      errors.push(`${term.label}: titik harus di dalam semesta ${variable.min}–${variable.max} ${variable.unit}.`);
  }
  if (errors.length === 0) {
    const steps = 400;
    for (let i = 0; i <= steps; i++) {
      const x = variable.min + ((variable.max - variable.min) * i) / steps;
      if (variable.terms.every((t) => membership(x, t.points) === 0)) {
        errors.push(`Ada celah di sekitar ${round(x, 2)} ${variable.unit} yang tidak tercakup himpunan mana pun.`);
        break;
      }
    }
  }
  return errors;
}

export function round(x: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}
