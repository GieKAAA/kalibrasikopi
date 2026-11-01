import { describe, expect, it } from 'vitest';
import type { CalibrationSession, Shot } from '../store/types';
import { agreement, sessionDialedIn } from './stats';

const shot = (p: Partial<Shot>): Shot => ({
  id: Math.random().toString(),
  createdAt: '',
  dose: 18,
  yield: 36,
  time: 28,
  taste: 0,
  grindSetting: null,
  crisp: 0,
  direction: 'tetap',
  amount: 0,
  termLabel: 'Tetap',
  newSetting: null,
  topRules: [],
  ...p,
});
const session = (shots: Shot[]): CalibrationSession => ({ id: 'x', beanName: 'a', grinderName: 'g', baristaId: 'b', baristaName: 'B', startedAt: '', finishedAt: null, shots });

describe('statistik kalibrasi', () => {
  it('agreement rate hanya menghitung shot yang dinilai pakar', () => {
    const s = session([
      shot({ direction: 'halus', expertDecision: 'halus' }),
      shot({ direction: 'halus', expertDecision: 'tetap' }),
      shot({ direction: 'kasar', expertDecision: 'kasar' }),
      shot({ direction: 'kasar' }),
    ]);
    expect(agreement([s])).toEqual({ judged: 3, agreed: 2, rate: (2 / 3) * 100 });
    expect(agreement([]).rate).toBeNull();
  });
  it('besar putaran pakar ikut dibandingkan', () => {
    const s = session([
      shot({ direction: 'halus', amount: 1, expertDecision: 'halus', expertAmount: 1 }),
      shot({ direction: 'halus', amount: 1, expertDecision: 'halus', expertAmount: 2 }),
      shot({ direction: 'tetap', amount: 0, expertDecision: 'tetap', expertAmount: 0 }),
    ]);
    expect(agreement([s])).toEqual({ judged: 3, agreed: 2, rate: (2 / 3) * 100 });
  });
  it('status tersimpan pada shot diutamakan', () => {
    expect(sessionDialedIn(session([shot({ direction: 'tetap', taste: 0, calibrated: false })]))).toBe(false);
  });
  it('sesi terkalibrasi bila shot terakhir tetap & seimbang', () => {
    expect(sessionDialedIn(session([shot({ direction: 'halus', taste: -2 }), shot({})]))).toBe(true);
    expect(sessionDialedIn(session([shot({ direction: 'tetap', taste: -2 })]))).toBe(false);
    expect(sessionDialedIn(session([]))).toBe(false);
  });
});
