/** Titik fungsi keanggotaan trapesium [a, b, c, d]. Segitiga ditulis dengan b === c. */
export type MfPoints = [number, number, number, number];

export interface FuzzyTerm {
  key: string;
  label: string;
  /** Singkatan untuk tampilan matriks aturan. */
  short: string;
  points: MfPoints;
}

export type InputKey = 'dose' | 'yield' | 'time' | 'taste';
export type VariableKey = InputKey | 'grind';

export interface FuzzyVariable {
  key: VariableKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  terms: FuzzyTerm[];
}

export interface FuzzyRule {
  id: string;
  if: Record<InputKey, string>;
  then: string;
}

export interface KnowledgeBase {
  inputs: Record<InputKey, FuzzyVariable>;
  output: FuzzyVariable;
  rules: FuzzyRule[];
  updatedAt: string;
  updatedBy: string;
}

export type CrispInputs = Record<InputKey, number>;

export interface FiredRule {
  rule: FuzzyRule;
  /** Derajat keanggotaan tiap anteseden. */
  degrees: Record<InputKey, number>;
  /** α-predikat = min(anteseden) — operator AND Mamdani. */
  alpha: number;
}

export interface InferenceResult {
  /** Nilai input setelah dibatasi ke semesta pembicaraan. */
  inputs: CrispInputs;
  clamped: Record<InputKey, boolean>;
  fuzzified: Record<InputKey, Record<string, number>>;
  fired: FiredRule[];
  /** Tinggi potongan (clip) tiap himpunan output setelah agregasi max. */
  clips: Record<string, number>;
  /** Sampel kurva agregat untuk grafik. */
  curve: { z: number; mu: number }[];
  /** Hasil defuzzifikasi centroid; null bila tidak ada aturan yang aktif. */
  crisp: number | null;
  /** Derajat keanggotaan nilai crisp pada tiap himpunan output. */
  outputDegrees: Record<string, number>;
  /** Himpunan output dengan derajat tertinggi pada nilai crisp. */
  dominantTerm: FuzzyTerm | null;
  numerator: number;
  denominator: number;
}
