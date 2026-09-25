import { describe, expect, it } from 'vitest';
import { baristaNotes, DEFAULT_GRINDER, recommend } from './advice';
import { buildDefaultRules, createDefaultKnowledgeBase, expertConsequent } from './defaultKb';
import { infer } from './engine';
import { membership, validateVariable } from './membership';
import type { CrispInputs } from './types';

const kb = createDefaultKnowledgeBase();
const run = (dose: number, yieldG: number, time: number, taste: number, setting: number | null = 10) => {
  const inputs: CrispInputs = { dose, yield: yieldG, time, taste };
  const result = infer(kb, inputs);
  const rec = recommend(result, DEFAULT_GRINDER, setting);
  return { result, rec, notes: baristaNotes(kb, inputs, result, rec) };
};

describe('fungsi keanggotaan', () => {
  it('segitiga', () => {
    expect(membership(0, [-1, 0, 0, 1])).toBe(1);
    expect(membership(0.5, [-1, 0, 0, 1])).toBe(0.5);
    expect(membership(-1, [-1, 0, 0, 1])).toBe(0);
    expect(membership(2, [-1, 0, 0, 1])).toBe(0);
  });
  it('trapesium dan bahu', () => {
    expect(membership(14, [14, 14, 16.5, 17.5])).toBe(1);
    expect(membership(17, [14, 14, 16.5, 17.5])).toBeCloseTo(0.5);
    expect(membership(24, [18.5, 19.5, 24, 24])).toBe(1);
    expect(membership(19, [18.5, 19.5, 24, 24])).toBeCloseTo(0.5);
  });
  it('semua variabel bawaan valid dan menutup seluruh semesta', () => {
    for (const v of [...Object.values(kb.inputs), kb.output]) expect(validateVariable(v)).toEqual([]);
  });
  it('mendeteksi urutan titik yang salah dan celah semesta', () => {
    const bad = structuredClone(kb.inputs.dose);
    bad.terms[1].points = [18, 17, 19, 20];
    expect(validateVariable(bad).length).toBeGreaterThan(0);
    const gap = structuredClone(kb.inputs.time);
    gap.terms[1].points = [26, 27, 28, 29];
    expect(validateVariable(gap).join(' ')).toMatch(/celah/);
  });
});

describe('basis aturan', () => {
  it('81 aturan unik mencakup seluruh kombinasi', () => {
    const rules = buildDefaultRules();
    expect(rules).toHaveLength(81);
    const keys = new Set(rules.map((r) => `${r.if.dose}|${r.if.yield}|${r.if.time}|${r.if.taste}`));
    expect(keys.size).toBe(81);
  });
  it('mengikuti logika Head Barista', () => {
    expect(expertConsequent('normal', 'normal', 'cepat', 'asam')).toBe('jauh_halus');
    expect(expertConsequent('normal', 'normal', 'normal', 'asam')).toBe('halus');
    expect(expertConsequent('normal', 'normal', 'normal', 'seimbang')).toBe('tetap');
    expect(expertConsequent('normal', 'normal', 'normal', 'pahit')).toBe('kasar');
    expect(expertConsequent('normal', 'normal', 'lambat', 'pahit')).toBe('jauh_kasar');
    // konflik rasa vs aliran = channeling → gilingan dipertahankan
    expect(expertConsequent('normal', 'normal', 'lambat', 'asam')).toBe('tetap');
    expect(expertConsequent('normal', 'normal', 'cepat', 'pahit')).toBe('tetap');
    // dose tinggi menjelaskan aliran lambat → koreksi dikurangi satu tingkat
    expect(expertConsequent('tinggi', 'normal', 'lambat', 'seimbang')).toBe('tetap');
    expect(expertConsequent('tinggi', 'normal', 'lambat', 'pahit')).toBe('kasar');
    expect(expertConsequent('rendah', 'normal', 'cepat', 'asam')).toBe('halus');
  });
});

describe('skenario black-box kalibrasi', () => {
  it('shot standar seimbang → pertahankan setting', () => {
    const { result, rec, notes } = run(18, 36, 28, 0);
    expect(result.crisp).toBeCloseTo(0, 5);
    expect(rec?.direction).toBe('tetap');
    expect(rec?.newSetting).toBe(10);
    expect(notes[0].tone).toBe('success');
  });

  it('asam + cepat → jauh lebih halus', () => {
    const { result, rec } = run(18, 36, 19, -2.5);
    expect(result.crisp!).toBeLessThan(-1.5);
    expect(rec?.direction).toBe('halus');
    expect(rec?.termKey).toBe('jauh_halus');
    expect(rec!.newSetting!).toBeLessThan(10);
  });

  it('pahit + lambat → jauh lebih kasar', () => {
    const { result, rec } = run(18, 36, 38, 3);
    expect(result.crisp!).toBeGreaterThan(1.5);
    expect(rec?.direction).toBe('kasar');
    expect(rec!.newSetting!).toBeGreaterThan(10);
  });

  it('sedikit asam pada waktu normal → sedikit lebih halus', () => {
    const { result, rec } = run(18, 36, 28, -1);
    expect(result.crisp!).toBeLessThan(-0.25);
    expect(result.crisp!).toBeGreaterThan(-1);
    expect(rec?.direction).toBe('halus');
  });

  it('asam + lambat → channeling, grind dipertahankan', () => {
    const { result, rec, notes } = run(18, 36, 36, -2.5);
    expect(Math.abs(result.crisp!)).toBeLessThan(HOLD);
    expect(rec?.direction).toBe('tetap');
    expect(notes.some((n) => /channeling/.test(n.title))).toBe(true);
  });

  it('dose & yield proporsional lebih besar, rasa seimbang → tetap', () => {
    const { result } = run(20, 40, 30, 0);
    expect(Math.abs(result.crisp!)).toBeLessThan(HOLD);
  });

  it('dose berlebih + lambat → saran perbaiki dose, bukan grind', () => {
    const { rec, notes } = run(20.5, 36, 33, 0);
    expect(rec?.direction).toBe('tetap');
    expect(notes.some((n) => /Dose/.test(n.title))).toBe(true);
  });

  it('arah putaran mengikuti konfigurasi grinder', () => {
    const inputs: CrispInputs = { dose: 18, yield: 36, time: 19, taste: -2.5 };
    const result = infer(kb, inputs);
    const reversed = recommend(result, { ...DEFAULT_GRINDER, finerIsLower: false }, 10);
    expect(reversed!.newSetting!).toBeGreaterThan(10);
    const scaled = recommend(result, { ...DEFAULT_GRINDER, unitsPerStep: 2, resolution: 1 }, null);
    expect(scaled!.amount % 1).toBe(0);
    expect(scaled!.newSetting).toBeNull();
  });

  it('batas: nilai di luar semesta dibatasi dan diberi peringatan', () => {
    const { result, notes } = run(30, 80, 5, -9);
    expect(result.inputs).toEqual({ dose: 24, yield: 60, time: 10, taste: -5 });
    expect(Object.values(result.clamped).every(Boolean)).toBe(true);
    expect(result.crisp).not.toBeNull();
    expect(notes.some((n) => /di luar rentang/.test(n.title))).toBe(true);
  });

  it('keluaran monoton terhadap rasa pada aliran normal', () => {
    let prev = -Infinity;
    for (let t = -5; t <= 5; t += 0.5) {
      const z = run(18, 36, 28, t).result.crisp!;
      expect(z).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = z;
    }
  });

  it('keluaran monoton terhadap waktu untuk rasa pahit', () => {
    let prev = -Infinity;
    for (let s = 10; s <= 50; s += 1) {
      const z = run(18, 36, s, 3).result.crisp!;
      expect(z).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = z;
    }
  });

  it('tanpa aturan → tidak ada rekomendasi', () => {
    const empty = { ...kb, rules: [] };
    const result = infer(empty, { dose: 18, yield: 36, time: 28, taste: 0 });
    expect(result.crisp).toBeNull();
    expect(recommend(result, DEFAULT_GRINDER, 10)).toBeNull();
  });
});

const HOLD = 0.25;
