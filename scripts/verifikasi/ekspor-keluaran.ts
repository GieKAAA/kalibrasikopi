/**
 * Ekspor keluaran mesin inferensi aplikasi untuk dibandingkan dengan implementasi
 * independen (defuzzifikasi_independen.py).
 *
 *   npx rolldown scripts/verifikasi/ekspor-keluaran.ts --platform node --format esm --file /tmp/ekspor.mjs
 *   node /tmp/ekspor.mjs keluaran-aplikasi.json
 *
 * Masukan acak dibangkitkan dengan pembangkit bilangan acak Park–Miller (benih 7),
 * seragam pada semesta setiap variabel — sama dengan src/fuzzy/centroid.test.ts.
 */
import { writeFileSync } from 'node:fs';
import { createDefaultKnowledgeBase } from '../../src/fuzzy/defaultKb';
import { infer } from '../../src/fuzzy/engine';

const kb = createDefaultKnowledgeBase();
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const rows: { sumber: string; dose: number; yield: number; time: number; taste: number; z: number | null }[] = [];
for (let i = 0; i < 300; i++) {
  const input = { dose: 14 + rnd() * 10, yield: 20 + rnd() * 40, time: 10 + rnd() * 40, taste: -5 + rnd() * 10 };
  rows.push({ sumber: `acak-${i + 1}`, ...input, z: infer(kb, input).crisp });
}
// Sepuluh shot uji pada Tabel 4.7.
const shots: [number, number, number][] = [
  [50, 16, -2.5], [40, 28, 0], [32, 38, 2.5], [42, 21, -2.5], [38, 32, 1],
  [48, 19, -1], [40, 27, 0], [35, 36, 2.5], [45, 22, -1], [39, 29, 0],
];
shots.forEach(([y, t, r], i) => {
  const input = { dose: 18, yield: y, time: t, taste: r };
  rows.push({ sumber: `shot-${i + 1}`, ...input, z: infer(kb, input).crisp });
});

writeFileSync(process.argv[2] ?? 'keluaran-aplikasi.json', JSON.stringify(rows, null, 1));
console.log(`${rows.length} baris ditulis`);
