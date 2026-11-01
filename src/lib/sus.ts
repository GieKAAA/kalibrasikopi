/** Pernyataan kuesioner System Usability Scale sesuai Tabel 3.2 naskah. */
export const SUS_STATEMENTS = [
  'Saya pikir saya akan sering menggunakan aplikasi Smart Assistant ini untuk membantu pekerjaan di meja bar.',
  'Saya merasa aplikasi Smart Assistant ini terlalu rumit untuk digunakan dalam alur kerja kalibrasi harian.',
  'Saya merasa aplikasi Smart Assistant ini sangat mudah untuk digunakan.',
  'Saya merasa membutuhkan bantuan dari orang lain atau teknisi agar dapat menggunakan aplikasi ini.',
  'Saya merasa berbagai fitur dalam aplikasi ini (seperti kalibrasi Fuzzy dan resep menu) terintegrasi dengan sangat baik.',
  'Saya merasa ada banyak ketidakkonsistenan di dalam aplikasi ini.',
  'Saya membayangkan bahwa kebanyakan barista akan dapat belajar menggunakan aplikasi ini dengan sangat cepat.',
  'Saya merasa aplikasi ini sangat membingungkan saat dioperasikan.',
  'Saya merasa sangat yakin dan tidak ada hambatan saat menggunakan aplikasi ini untuk mencari rekomendasi.',
  'Saya perlu banyak belajar dan membiasakan diri terlebih dahulu sebelum dapat menggunakan aplikasi ini dengan lancar.',
] as const;

export const LIKERT_LABELS = ['Sangat Tidak Setuju', 'Tidak Setuju', 'Netral', 'Setuju', 'Sangat Setuju'] as const;

export interface SusScore {
  /** Skor terkonversi per butir: ganjil = jawaban − 1, genap = 5 − jawaban. */
  converted: number[];
  oddTotal: number;
  evenTotal: number;
  /** Jumlah skor terkonversi (0–40). */
  total: number;
  /** Skor akhir = total × 2,5 (0–100). */
  score: number;
}

export function isCompleteSus(answers: (number | null | undefined)[]): answers is number[] {
  return answers.length === 10 && answers.every((a) => Number.isInteger(a) && a! >= 1 && a! <= 5);
}

export function scoreSus(answers: number[]): SusScore {
  const converted = answers.map((a, i) => (i % 2 === 0 ? a - 1 : 5 - a));
  const oddTotal = converted.filter((_, i) => i % 2 === 0).reduce((s, v) => s + v, 0);
  const evenTotal = converted.filter((_, i) => i % 2 === 1).reduce((s, v) => s + v, 0);
  const total = oddTotal + evenTotal;
  return { converted, oddTotal, evenTotal, total, score: total * 2.5 };
}

/** Interpretasi skor menurut Tabel 3.3. */
export function susCategory(score: number): string {
  if (score >= 85) return 'Excellent / Grade A';
  if (score >= 70) return 'Good / Grade B';
  if (score >= 68) return 'Acceptable threshold';
  if (score >= 50) return 'Poor';
  return 'Not acceptable';
}
