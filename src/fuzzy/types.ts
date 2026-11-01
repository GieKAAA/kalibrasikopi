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
  /** Segmen linear daerah hasil agregasi, dasar perhitungan luas & momen centroid. */
  segments: CentroidSegment[];
  /** Hasil defuzzifikasi centroid; null bila tidak ada aturan yang aktif. */
  crisp: number | null;
  /** Derajat keanggotaan nilai crisp pada tiap himpunan output. */
  outputDegrees: Record<string, number>;
  /** Himpunan output dengan derajat tertinggi pada nilai crisp. */
  dominantTerm: FuzzyTerm | null;
  /** Σ momen = ∫ z·μ(z) dz. */
  numerator: number;
  /** Σ luas = ∫ μ(z) dz. */
  denominator: number;
}

/** Bagian kurva yang membentuk tiap segmen: dipotong α (datar), sisi naik, atau sisi turun himpunan. */
export type SegmentPiece = 'clip' | 'rise' | 'fall';

export interface CentroidSegment {
  z0: number;
  z1: number;
  /** μ di ujung kiri dan kanan segmen (μ linear di antaranya). */
  m0: number;
  m1: number;
  /** Luas = ∫ μ(z) dz pada segmen. */
  area: number;
  /** Momen = ∫ z·μ(z) dz pada segmen. */
  moment: number;
  termKey: string;
  piece: SegmentPiece;
  /** Tinggi potongan himpunan (α hasil komposisi MAX). */
  clip: number;
}
