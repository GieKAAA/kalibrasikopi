import { LEVEL } from './defaultKb';
import { round } from './membership';
import type { CrispInputs, InferenceResult, InputKey, KnowledgeBase } from './types';

export interface GrinderConfig {
  name: string;
  /** Satuan pada dial grinder, mis. "angka", "klik", "derajat". */
  unitLabel: string;
  /** Berapa satuan grinder untuk 1 step keluaran fuzzy. */
  unitsPerStep: number;
  /** Pembulatan rekomendasi ke kelipatan ini (resolusi dial). */
  resolution: number;
  /** True bila angka lebih kecil = gilingan lebih halus. */
  finerIsLower: boolean;
}

export const DEFAULT_GRINDER: GrinderConfig = {
  name: 'Grinder Espresso',
  unitLabel: 'angka',
  unitsPerStep: 1,
  resolution: 0.5,
  finerIsLower: true,
};

/** |z*| di bawah ambang ini dianggap "pertahankan setting". */
export const HOLD_THRESHOLD = 0.25;

export type Direction = 'halus' | 'tetap' | 'kasar';

export interface Recommendation {
  direction: Direction;
  crisp: number;
  /** Besar perubahan dalam satuan grinder, sudah dibulatkan. */
  amount: number;
  termKey: string;
  termLabel: string;
  termDegree: number;
  headline: string;
  newSetting: number | null;
}

function roundTo(x: number, step: number): number {
  if (step <= 0) return round(x, 2);
  return round(Math.round(x / step) * step, 4);
}

export function recommend(
  result: InferenceResult,
  grinder: GrinderConfig,
  currentSetting: number | null,
): Recommendation | null {
  if (result.crisp === null || !result.dominantTerm) return null;
  const z = result.crisp;
  let direction: Direction = 'tetap';
  let amount = 0;
  if (Math.abs(z) >= HOLD_THRESHOLD) {
    direction = z < 0 ? 'halus' : 'kasar';
    amount = Math.max(roundTo(Math.abs(z) * grinder.unitsPerStep, grinder.resolution), grinder.resolution);
  }
  const lowerIsDirection = direction === 'halus' ? grinder.finerIsLower : !grinder.finerIsLower;
  const sign = direction === 'tetap' ? 0 : lowerIsDirection ? -1 : 1;
  const newSetting = currentSetting === null ? null : round(currentSetting + sign * amount, 4);
  const headline =
    direction === 'tetap'
      ? 'Pertahankan setting grinder'
      : `Putar grinder ke arah ${direction === 'halus' ? 'HALUS' : 'KASAR'}`;
  return {
    direction,
    crisp: z,
    amount,
    termKey: result.dominantTerm.key,
    termLabel: result.dominantTerm.label,
    termDegree: result.outputDegrees[result.dominantTerm.key] ?? 0,
    headline,
    newSetting,
  };
}

export function tasteLabel(v: number): string {
  if (v <= -3.5) return 'Sangat Asam';
  if (v <= -2) return 'Asam';
  if (v <= -0.5) return 'Sedikit Asam';
  if (v < 0.5) return 'Seimbang';
  if (v < 2) return 'Sedikit Pahit';
  if (v < 3.5) return 'Pahit';
  return 'Sangat Pahit';
}

export const TASTE_PRESETS: { value: number; label: string }[] = [
  { value: -4, label: 'Sangat Asam' },
  { value: -2.5, label: 'Asam' },
  { value: -1, label: 'Sedikit Asam' },
  { value: 0, label: 'Seimbang' },
  { value: 1, label: 'Sedikit Pahit' },
  { value: 2.5, label: 'Pahit' },
  { value: 4, label: 'Sangat Pahit' },
];

export function shotMetrics(dose: number, yieldG: number, time: number) {
  return {
    ratio: dose > 0 ? yieldG / dose : 0,
    flowRate: time > 0 ? yieldG / time : 0,
  };
}

/** Pusat plateau himpunan "normal" — dipakai sebagai target standar. */
export function normalTarget(kb: KnowledgeBase, key: Exclude<InputKey, 'taste'>): { low: number; high: number; mid: number } {
  const term = kb.inputs[key].terms.find((t) => t.key === 'normal') ?? kb.inputs[key].terms[1];
  const [, b, c] = term.points;
  return { low: b, high: c, mid: round((b + c) / 2, 2) };
}

/** Indeks aliran kontinu (rata-rata level berbobot derajat keanggotaan). */
export function continuousFlowIndex(result: InferenceResult): number {
  const expected = (key: Exclude<InputKey, 'taste'>) => {
    let num = 0;
    let den = 0;
    for (const [term, mu] of Object.entries(result.fuzzified[key])) {
      const lvl = LEVEL[key][term];
      if (lvl === undefined) continue;
      num += mu * lvl;
      den += mu;
    }
    return den > 0 ? num / den : 0;
  };
  return expected('time') - expected('yield') - expected('dose');
}

export type NoteTone = 'success' | 'warn' | 'info';

export interface BaristaNote {
  tone: NoteTone;
  title: string;
  body: string;
}

const fmt = (x: number, d = 1) => round(x, d).toLocaleString('id-ID');

/**
 * Catatan Head Barista — aturan diagnostik tegas (crisp) yang melengkapi keluaran fuzzy.
 * Tidak mengubah nilai rekomendasi grind; hanya memberi konteks tindakan di meja bar.
 */
export function baristaNotes(
  kb: KnowledgeBase,
  raw: CrispInputs,
  result: InferenceResult,
  rec: Recommendation | null,
): BaristaNote[] {
  const notes: BaristaNote[] = [];
  const taste = result.inputs.taste;
  const flow = continuousFlowIndex(result);
  const seimbang = result.fuzzified.taste.seimbang ?? 0;
  const dose = normalTarget(kb, 'dose');
  const yieldT = normalTarget(kb, 'yield');
  const time = normalTarget(kb, 'time');

  const clampedKeys = (Object.keys(result.clamped) as InputKey[]).filter((k) => result.clamped[k]);
  if (clampedKeys.length) {
    notes.push({
      tone: 'warn',
      title: 'Nilai di luar rentang basis pengetahuan',
      body: clampedKeys
        .map((k) => {
          const v = kb.inputs[k];
          return `${v.label} dibatasi ke ${fmt(v.min)}–${fmt(v.max)} ${v.unit}`;
        })
        .join('; ') + '. Rekomendasi tetap dihitung, tetapi periksa kembali shot ini.',
    });
  }

  if (rec?.direction === 'tetap' && seimbang >= 0.5) {
    notes.push({
      tone: 'success',
      title: 'Shot sudah on point',
      body: 'Kunci setting ini sebagai acuan hari ini. Cek ulang setiap ±2 jam, saat suhu/kelembapan ruangan berubah, dan setiap membuka kemasan biji baru.',
    });
  }

  if (taste <= -1 && flow >= 0.5) {
    notes.push({
      tone: 'warn',
      title: 'Asam tapi aliran lambat — indikasi channeling',
      body: 'Air mencari jalur termudah sehingga sebagian bubuk tidak terekstraksi. Sebelum mengubah grind: ratakan distribusi (WDT), tamping datar & konsisten, pastikan basket bersih-kering, dan langsung ekstraksi setelah portafilter terpasang.',
    });
  } else if (taste >= 1 && flow <= -0.5) {
    notes.push({
      tone: 'warn',
      title: 'Pahit tapi aliran cepat — indikasi channeling',
      body: 'Pahit-kering (astringent) pada shot cepat biasanya akibat channeling, bukan gilingan terlalu halus. Perbaiki distribusi & tamping, cek gasket dan shower screen, lalu ulangi shot dengan setting yang sama.',
    });
  }

  if ((result.fuzzified.dose.normal ?? 0) < 0.5) {
    notes.push({
      tone: 'warn',
      title: `Dose ${fmt(raw.dose)} g di luar standar`,
      body: `Kembalikan dose ke ±${fmt(dose.mid)} g lebih dulu — dose memengaruhi hambatan aliran air. Dengan dose yang benar, rekomendasi grind jauh lebih akurat.`,
    });
  }

  if ((result.fuzzified.yield.normal ?? 0) < 0.5) {
    notes.push({
      tone: 'info',
      title: `Yield ${fmt(raw.yield)} g jauh dari target ${fmt(yieldT.mid)} g`,
      body: 'Hentikan shot tepat di target yield agar rasa antar shot bisa dibandingkan. Rasio yang berubah-ubah membuat kalibrasi grind sulit dibaca.',
    });
  }

  if (raw.time < 15) {
    notes.push({
      tone: 'warn',
      title: 'Gushing — shot di bawah 15 detik',
      body: 'Aliran terlalu deras. Buang shot ini; pastikan basket tidak underdose dan tamping tidak miring sebelum menarik shot berikutnya.',
    });
  } else if (raw.time > 40) {
    notes.push({
      tone: 'warn',
      title: 'Choking — shot di atas 40 detik',
      body: 'Aliran hampir tersumbat. Buang shot ini; gilingan kemungkinan terlalu halus atau dose berlebih.',
    });
  }

  if (Math.abs(flow) < 0.5 && taste <= -1.5) {
    notes.push({
      tone: 'info',
      title: 'Aliran normal tapi masih asam',
      body: 'Bila setelah 2 kali penyesuaian masih asam, naikkan yield 2–4 g (rasio lebih panjang) atau cek suhu air 92–94 °C. Biji light roast memang butuh ekstraksi lebih tinggi.',
    });
  } else if (Math.abs(flow) < 0.5 && taste >= 1.5) {
    notes.push({
      tone: 'info',
      title: 'Aliran normal tapi pahit',
      body: 'Bila tetap pahit setelah dikasarkan, pendekkan yield 2–4 g atau turunkan suhu 1–2 °C. Biji dark roast lebih cepat terekstraksi.',
    });
  }

  if (rec?.direction === 'tetap' && seimbang >= 0.5 && Math.abs(flow) >= 0.5) {
    notes.push({
      tone: 'info',
      title: 'Rasa seimbang — jangan kejar angka',
      body: `Rasa adalah hakim utama. Waktu di luar jendela ${fmt(time.low, 0)}–${fmt(time.high, 0)} detik masih bisa diterima selama rasanya seimbang; pantau konsistensi 2–3 shot berikutnya.`,
    });
  }

  if (rec && rec.direction !== 'tetap') {
    notes.push({
      tone: 'info',
      title: 'Setelah memutar grinder',
      body: 'Purge ±2–3 g bubuk karena bubuk lama masih tertahan di chamber, lalu tarik shot baru dengan dose & target yield yang sama. Ubah satu variabel saja per shot.',
    });
  }

  const order: Record<NoteTone, number> = { success: 0, warn: 1, info: 2 };
  return notes.sort((a, b) => order[a.tone] - order[b.tone]);
}
