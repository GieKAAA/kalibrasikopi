import type { CalibrationSession, Shot } from '../store/types';

/**
 * Status kalibrasi shot. Shot baru menyimpan statusnya saat dianalisis (lihat CALIBRATED_CRITERIA);
 * shot lama memakai pendekatan rekomendasi Tetap dan rasa seimbang.
 */
export const isDialedIn = (s: Shot) => s.calibrated ?? (s.direction === 'tetap' && Math.abs(s.taste) < 0.5);

export function sessionDialedIn(session: CalibrationSession): boolean {
  const last = session.shots.at(-1);
  return !!last && isDialedIn(last);
}

/**
 * Keputusan pakar dianggap sesuai bila arahnya sama dengan rekomendasi sistem dan besar putarannya
 * sama (bila pakar mencatat besar putaran). Untuk arah Tetap besar putaran selalu 0.
 */
export function expertAgrees(s: Shot): boolean | null {
  if (!s.expertDecision) return null;
  if (s.expertDecision !== s.direction) return false;
  if (s.expertAmount === null || s.expertAmount === undefined) return true;
  const sys = s.direction === 'tetap' ? 0 : s.amount;
  return Math.abs(s.expertAmount - sys) < 1e-6;
}

/** Agreement rate = jumlah shot sesuai / jumlah shot yang dinilai pakar × 100%. */
export function agreement(sessions: CalibrationSession[]) {
  const judged = sessions.flatMap((s) => s.shots).filter((s) => s.expertDecision);
  const agreed = judged.filter((s) => expertAgrees(s)).length;
  return { judged: judged.length, agreed, rate: judged.length ? (agreed / judged.length) * 100 : null };
}
