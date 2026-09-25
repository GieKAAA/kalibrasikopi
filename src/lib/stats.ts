import type { CalibrationSession, Shot } from '../store/types';

/** Shot dianggap terkalibrasi bila rekomendasi "tetap" dan rasa seimbang. */
export const isDialedIn = (s: Shot) => s.direction === 'tetap' && Math.abs(s.taste) < 0.5;

export function sessionDialedIn(session: CalibrationSession): boolean {
  const last = session.shots.at(-1);
  return !!last && isDialedIn(last);
}

/** Agreement rate: persentase shot yang rekomendasinya sama dengan keputusan Head Barista. */
export function agreement(sessions: CalibrationSession[]) {
  const judged = sessions.flatMap((s) => s.shots).filter((s) => s.expertDecision);
  const agreed = judged.filter((s) => s.expertDecision === s.direction).length;
  return { judged: judged.length, agreed, rate: judged.length ? (agreed / judged.length) * 100 : null };
}
