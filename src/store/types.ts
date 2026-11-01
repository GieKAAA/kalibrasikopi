import type { Direction, TimeCategory } from '../fuzzy/advice';

export type Role = 'head' | 'barista';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export const RECIPE_CATEGORIES = ['Espresso', 'Kopi Susu', 'Signature', 'Non-Kopi'] as const;
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export interface Ingredient {
  id: string;
  name: string;
  amount: number | null;
  unit: string;
  note: string;
}

export interface RecipeStep {
  id: string;
  text: string;
  /** Durasi opsional (detik) untuk timer pada Mode Seduh. */
  durationSec: number | null;
}

export interface EspressoSpec {
  dose: number;
  yield: number;
  timeMin: number;
  timeMax: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory;
  description: string;
  vessel: string;
  temperature: 'Panas' | 'Dingin';
  ingredients: Ingredient[];
  steps: RecipeStep[];
  notes: string;
  espresso: EspressoSpec | null;
  updatedAt: string;
  updatedBy: string;
}

export interface Shot {
  id: string;
  createdAt: string;
  dose: number;
  yield: number;
  time: number;
  taste: number;
  grindSetting: number | null;
  crisp: number | null;
  direction: Direction | null;
  amount: number;
  termLabel: string;
  newSetting: number | null;
  /** Aturan dengan α tertinggi, untuk jejak audit. */
  topRules: { id: string; alpha: number }[];
  /** Kategori waktu ekstraksi: Under (cepat), Ideal (normal), Over (lambat). */
  timeCategory?: TimeCategory;
  /** Status kalibrasi shot menurut CALIBRATED_CRITERIA. */
  calibrated?: boolean;
  /** Keputusan Head Barista untuk shot yang sama — dasar perhitungan agreement rate. */
  expertDecision?: Direction | null;
  /** Besar putaran menurut Head Barista (satuan dial grinder). */
  expertAmount?: number | null;
}

export interface CalibrationSession {
  id: string;
  beanName: string;
  grinderName: string;
  baristaId: string;
  baristaName: string;
  startedAt: string;
  finishedAt: string | null;
  shots: Shot[];
}

export interface CalibrationDraft {
  dose: number;
  yield: number;
  time: number;
  taste: number | null;
  grindSetting: number | null;
}

export type ThemePref = 'system' | 'light' | 'dark';

/** Satu jawaban kuesioner System Usability Scale (10 butir, skala Likert 1–5). */
export interface SusResponse {
  id: string;
  respondent: string;
  answers: number[];
  createdAt: string;
  createdBy: string;
}
