import { clamp, fuzzify, membership } from './membership';
import type { CrispInputs, FiredRule, InferenceResult, InputKey, KnowledgeBase } from './types';

export const INPUT_KEYS: InputKey[] = ['dose', 'yield', 'time', 'taste'];

const SAMPLES = 601;

/**
 * Inferensi Fuzzy Mamdani:
 * 1. Fuzzifikasi — nilai crisp → derajat keanggotaan tiap himpunan.
 * 2. Evaluasi aturan — α-predikat = MIN derajat anteseden (operator AND).
 * 3. Implikasi MIN + komposisi MAX — himpunan output dipotong setinggi α lalu digabung.
 * 4. Defuzzifikasi Centroid (COA) — z* = Σ z·μ(z) / Σ μ(z).
 */
export function infer(kb: KnowledgeBase, raw: CrispInputs): InferenceResult {
  const inputs = {} as CrispInputs;
  const clamped = {} as Record<InputKey, boolean>;
  const fuzzified = {} as Record<InputKey, Record<string, number>>;

  for (const key of INPUT_KEYS) {
    const v = kb.inputs[key];
    const x = clamp(raw[key], v.min, v.max);
    inputs[key] = x;
    clamped[key] = x !== raw[key];
    fuzzified[key] = fuzzify(v, x);
  }

  const fired: FiredRule[] = [];
  for (const rule of kb.rules) {
    const degrees = {} as Record<InputKey, number>;
    for (const key of INPUT_KEYS) degrees[key] = fuzzified[key][rule.if[key]] ?? 0;
    const alpha = Math.min(...INPUT_KEYS.map((k) => degrees[k]));
    if (alpha > 0) fired.push({ rule, degrees, alpha });
  }
  fired.sort((x, y) => y.alpha - x.alpha);

  const clips: Record<string, number> = {};
  for (const term of kb.output.terms) clips[term.key] = 0;
  for (const f of fired) clips[f.rule.then] = Math.max(clips[f.rule.then] ?? 0, f.alpha);

  const { min, max, terms } = kb.output;
  const curve: { z: number; mu: number }[] = [];
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const z = min + ((max - min) * i) / (SAMPLES - 1);
    let mu = 0;
    for (const term of terms) {
      const clip = clips[term.key];
      if (clip > 0) mu = Math.max(mu, Math.min(clip, membership(z, term.points)));
    }
    curve.push({ z, mu });
    numerator += z * mu;
    denominator += mu;
  }

  const crisp = denominator > 0 ? numerator / denominator : null;
  const outputDegrees: Record<string, number> = {};
  let dominantTerm = null;
  if (crisp !== null) {
    let best = -1;
    for (const term of terms) {
      const mu = membership(crisp, term.points);
      outputDegrees[term.key] = mu;
      if (mu > best) {
        best = mu;
        dominantTerm = term;
      }
    }
  }

  return {
    inputs,
    clamped,
    fuzzified,
    fired,
    clips,
    curve,
    crisp,
    outputDegrees,
    dominantTerm,
    numerator,
    denominator,
  };
}
