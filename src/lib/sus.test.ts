import { describe, expect, it } from 'vitest';
import { isCompleteSus, scoreSus, susCategory } from './sus';

describe('System Usability Scale', () => {
  it('menghitung skor sesuai aturan baku', () => {
    // jawaban R1 pada Tabel IV.5 draf Revisi 2
    const r = scoreSus([5, 1, 5, 1, 4, 1, 4, 1, 4, 2]);
    expect(r.converted).toEqual([4, 4, 4, 4, 3, 4, 3, 4, 3, 3]);
    expect(r.oddTotal).toBe(17);
    expect(r.evenTotal).toBe(19);
    expect(r.total).toBe(36);
    expect(r.score).toBe(90);
  });

  it('rata-rata data draf Revisi 2 = 84,0 (Good / Grade B)', () => {
    const answers = [
      [5, 1, 5, 1, 4, 1, 4, 1, 4, 2],
      [4, 2, 4, 1, 5, 2, 5, 2, 5, 2],
      [5, 1, 5, 1, 5, 1, 4, 1, 4, 1],
      [4, 2, 4, 2, 4, 2, 4, 2, 4, 2],
      [4, 2, 4, 2, 4, 2, 4, 2, 4, 2],
    ];
    const scores = answers.map((a) => scoreSus(a).score);
    expect(scores).toEqual([90, 85, 95, 75, 75]);
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    expect(mean).toBe(84);
    expect(susCategory(mean)).toBe('Good / Grade B');
  });

  it('kategori Tabel III.3 & validasi jawaban', () => {
    expect(susCategory(85)).toBe('Excellent / Grade A');
    expect(susCategory(68.5)).toBe('Acceptable threshold');
    expect(susCategory(49)).toBe('Not acceptable');
    expect(isCompleteSus([5, 1, 5, 1, 4, 1, 4, 1, 4])).toBe(false);
    expect(isCompleteSus([5, 1, 5, 1, 4, 1, 4, 1, 4, 6])).toBe(false);
    expect(isCompleteSus([5, 1, 5, 1, 4, 1, 4, 1, 4, 2])).toBe(true);
  });
});
