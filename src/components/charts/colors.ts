import type { VariableKey } from '../../fuzzy/types';

const THREE = ['var(--fine)', 'var(--hold)', 'var(--coarse)'];
const TASTE = ['var(--sour)', 'var(--balanced)', 'var(--bitter)'];
const OUTPUT = ['var(--fine)', 'color-mix(in srgb, var(--fine) 55%, var(--hold))', 'var(--hold)', 'color-mix(in srgb, var(--coarse) 55%, var(--hold))', 'var(--coarse)'];

export function termColor(variable: VariableKey, index: number): string {
  if (variable === 'grind') return OUTPUT[index] ?? 'var(--muted)';
  if (variable === 'taste') return TASTE[index] ?? 'var(--muted)';
  return THREE[index] ?? 'var(--muted)';
}

export function directionColor(direction: 'halus' | 'tetap' | 'kasar' | null | undefined): string {
  if (direction === 'halus') return 'var(--fine)';
  if (direction === 'kasar') return 'var(--coarse)';
  return 'var(--hold)';
}
