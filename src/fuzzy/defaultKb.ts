import type { FuzzyRule, FuzzyVariable, InputKey, KnowledgeBase } from './types';

/**
 * Basis pengetahuan bawaan. Nilai-nilai ini adalah titik awal hasil praktik umum
 * espresso modern (double shot 18 g → 36 g, 25–30 detik). Head Barista dapat
 * menyesuaikannya di menu Basis Pengetahuan setelah sesi validasi (member checking).
 */
export const DEFAULT_INPUTS: Record<InputKey, FuzzyVariable> = {
  dose: {
    key: 'dose',
    label: 'Dose',
    unit: 'g',
    min: 14,
    max: 24,
    terms: [
      { key: 'rendah', label: 'Rendah', short: 'R', points: [14, 14, 16.5, 17.5] },
      { key: 'normal', label: 'Normal', short: 'N', points: [16.5, 17.5, 18.5, 19.5] },
      { key: 'tinggi', label: 'Tinggi', short: 'T', points: [18.5, 19.5, 24, 24] },
    ],
  },
  yield: {
    key: 'yield',
    label: 'Yield',
    unit: 'g',
    min: 20,
    max: 60,
    terms: [
      { key: 'sedikit', label: 'Sedikit', short: 'S', points: [20, 20, 30, 34] },
      { key: 'normal', label: 'Normal', short: 'N', points: [30, 34, 38, 42] },
      { key: 'banyak', label: 'Banyak', short: 'B', points: [38, 42, 60, 60] },
    ],
  },
  time: {
    key: 'time',
    label: 'Waktu Ekstraksi',
    unit: 'detik',
    min: 10,
    max: 50,
    terms: [
      { key: 'cepat', label: 'Cepat', short: 'C', points: [10, 10, 22, 25] },
      { key: 'normal', label: 'Normal', short: 'N', points: [22, 25, 30, 33] },
      { key: 'lambat', label: 'Lambat', short: 'L', points: [30, 33, 50, 50] },
    ],
  },
  taste: {
    key: 'taste',
    label: 'Profil Rasa',
    unit: 'skala',
    min: -5,
    max: 5,
    terms: [
      { key: 'asam', label: 'Asam', short: 'A', points: [-5, -5, -3, 0] },
      { key: 'seimbang', label: 'Seimbang', short: 'S', points: [-2, 0, 0, 2] },
      { key: 'pahit', label: 'Pahit', short: 'P', points: [0, 3, 5, 5] },
    ],
  },
};

export const DEFAULT_OUTPUT: FuzzyVariable = {
  key: 'grind',
  label: 'Penyesuaian Grind Size',
  unit: 'step',
  min: -3,
  max: 3,
  terms: [
    { key: 'jauh_halus', label: 'Jauh Lebih Halus', short: 'JLH', points: [-3, -3, -2, -1] },
    { key: 'halus', label: 'Lebih Halus', short: 'LH', points: [-2, -1, -1, 0] },
    { key: 'tetap', label: 'Tetap', short: 'T', points: [-1, 0, 0, 1] },
    { key: 'kasar', label: 'Lebih Kasar', short: 'LK', points: [0, 1, 1, 2] },
    { key: 'jauh_kasar', label: 'Jauh Lebih Kasar', short: 'JLK', points: [1, 2, 3, 3] },
  ],
};

/** Level ordinal tiap himpunan input: −1 (bawah), 0 (normal), +1 (atas). */
export const LEVEL: Record<Exclude<InputKey, 'taste'>, Record<string, -1 | 0 | 1>> = {
  dose: { rendah: -1, normal: 0, tinggi: 1 },
  yield: { sedikit: -1, normal: 0, banyak: 1 },
  time: { cepat: -1, normal: 0, lambat: 1 },
};

const OUTPUT_BY_INDEX = ['jauh_halus', 'halus', 'tetap', 'kasar', 'jauh_kasar'] as const;

/**
 * Matriks keputusan Head Barista: baris = rasa, kolom = indeks aliran (−2…+2).
 * Nilai = indeks himpunan output (−2 = Jauh Lebih Halus … +2 = Jauh Lebih Kasar).
 *
 * - Asam + aliran cepat  → under-extracted karena gilingan terlalu kasar → haluskan.
 * - Pahit + aliran lambat → over-extracted karena gilingan terlalu halus → kasarkan.
 * - Asam + aliran lambat / Pahit + aliran cepat → gejala channeling; gilingan
 *   bukan akar masalahnya, jadi setting dipertahankan dan puck prep diperbaiki.
 * - Rasa seimbang → rasa adalah hakim utama; hanya dikoreksi bila aliran sangat menyimpang.
 */
export const EXPERT_MATRIX: Record<string, [number, number, number, number, number]> = {
  asam: [-2, -2, -1, 0, 0],
  seimbang: [-1, 0, 0, 0, 1],
  pahit: [0, 0, 1, 2, 2],
};

/**
 * Indeks aliran (−2…+2) = level waktu − level yield.
 * Positif = aliran lebih lambat dari seharusnya (gilingan terlalu halus),
 * negatif = aliran terlalu cepat (gilingan terlalu kasar).
 *
 * Dose ikut dipertimbangkan: bila penyimpangan dose searah dengan penyimpangan aliran
 * (dose tinggi + lambat, dose rendah + cepat), sebagian penyebabnya adalah dose —
 * bukan gilingan — sehingga koreksi dikurangi satu tingkat. Barista diminta
 * membetulkan dose lebih dulu (lihat Catatan Head Barista).
 */
export function flowIndex(dose: string, yieldTerm: string, time: string): number {
  let f = LEVEL.time[time] - LEVEL.yield[yieldTerm];
  const d = LEVEL.dose[dose];
  if (d !== 0 && f !== 0 && Math.sign(d) === Math.sign(f)) f -= Math.sign(f);
  return f;
}

export function expertConsequent(dose: string, yieldTerm: string, time: string, taste: string): string {
  const idx = EXPERT_MATRIX[taste][flowIndex(dose, yieldTerm, time) + 2];
  return OUTPUT_BY_INDEX[idx + 2];
}

/** 3 × 3 × 3 × 3 = 81 aturan, urut Dose → Yield → Waktu → Rasa. */
export function buildDefaultRules(inputs: Record<InputKey, FuzzyVariable> = DEFAULT_INPUTS): FuzzyRule[] {
  const rules: FuzzyRule[] = [];
  let n = 1;
  for (const d of inputs.dose.terms)
    for (const y of inputs.yield.terms)
      for (const t of inputs.time.terms)
        for (const r of inputs.taste.terms)
          rules.push({
            id: `R${n++}`,
            if: { dose: d.key, yield: y.key, time: t.key, taste: r.key },
            then: expertConsequent(d.key, y.key, t.key, r.key),
          });
  return rules;
}

export function createDefaultKnowledgeBase(updatedBy = 'Bawaan sistem'): KnowledgeBase {
  const inputs = structuredClone(DEFAULT_INPUTS);
  return {
    inputs,
    output: structuredClone(DEFAULT_OUTPUT),
    rules: buildDefaultRules(inputs),
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}
