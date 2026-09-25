import { sha256, toHex } from './sha256';

const ITERATIONS = 2000;
const enc = new TextEncoder();

export function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

/** Hash kata sandi berulang (salted, iterated SHA-256) untuk akun lokal di perangkat. */
export function hashPassword(password: string, salt: string): string {
  let digest = sha256(enc.encode(`${salt}:${password}`));
  for (let i = 1; i < ITERATIONS; i++) {
    const buf = new Uint8Array(digest.length + salt.length);
    buf.set(digest);
    buf.set(enc.encode(salt), digest.length);
    digest = sha256(buf);
  }
  return toHex(digest);
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  return hashPassword(password, salt) === hash;
}

export const uid = () => randomHex(8);

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
