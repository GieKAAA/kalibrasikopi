import { describe, expect, it } from 'vitest';
import { toCsv } from './files';

describe('ekspor CSV', () => {
  it('pemisah titik koma dan koma desimal', () => {
    const csv = toCsv([
      ['shot', 'z', 'catatan'],
      [1, -1.4824, 'asam; cepat'],
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('shot;z;catatan\n1;-1,4824;"asam; cepat"');
  });
});
