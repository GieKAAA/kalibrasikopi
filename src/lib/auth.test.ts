import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { hashPassword, isValidEmail, verifyPassword } from './auth';
import { sha256, toHex } from './sha256';

describe('sha256', () => {
  it('sama dengan implementasi Node', () => {
    for (const s of ['', 'abc', 'kalibrasi kopi', 'x'.repeat(55), 'y'.repeat(64), 'z'.repeat(1000)]) {
      expect(toHex(sha256(new TextEncoder().encode(s)))).toBe(createHash('sha256').update(s).digest('hex'));
    }
  });
});

describe('autentikasi lokal', () => {
  it('verifikasi kata sandi', () => {
    const hash = hashPassword('rahasia123', 'garam');
    expect(verifyPassword('rahasia123', 'garam', hash)).toBe(true);
    expect(verifyPassword('salah', 'garam', hash)).toBe(false);
    expect(verifyPassword('rahasia123', 'lain', hash)).toBe(false);
  });
  it('validasi email', () => {
    expect(isValidEmail('head@chapterspace.id')).toBe(true);
    expect(isValidEmail('bukan-email')).toBe(false);
  });
});
