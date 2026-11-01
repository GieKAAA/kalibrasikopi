export function fmtNum(x: number | null | undefined, digits = 1): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '–';
  return x.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function fmtFixed(x: number, digits = 1): string {
  return x.toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function parseDecimal(s: string): number {
  return Number(s.replace(',', '.').trim());
}

/** Angka untuk penulisan rumus: koma desimal (PUEBI), tanda minus "−", tanpa pemisah ribuan. */
export function fmtMath(x: number, digits = 3): string {
  if (!Number.isFinite(x)) return '–';
  const v = Math.abs(x) < 0.5 * 10 ** -digits ? 0 : x;
  const s = Math.abs(v).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: digits, useGrouping: false });
  return v < 0 ? `−${s}` : s;
}

/** Seperti fmtMath, tetapi bilangan negatif diberi kurung — untuk substitusi ke dalam rumus. */
export function fmtSub(x: number, digits = 3): string {
  const s = fmtMath(x, digits);
  return s.startsWith('−') ? `(${s})` : s;
}
