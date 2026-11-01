# Mesin Inferensi Fuzzy Mamdani — Kalibrasi Espresso

Dokumen ini menjelaskan basis pengetahuan **bawaan** aplikasi. Semua nilai dapat diubah
Head Barista di menu **Pakar** setelah sesi validasi (member checking). Implementasi:
[`src/fuzzy/engine.ts`](../src/fuzzy/engine.ts), basis pengetahuan:
[`src/fuzzy/defaultKb.ts`](../src/fuzzy/defaultKb.ts).

## 1. Variabel dan himpunan fuzzy

Semua himpunan memakai fungsi keanggotaan trapesium `(a, b, c, d)`; segitiga bila `b = c`,
bahu kiri/kanan bila `a = b` / `c = d`.

$$
\mu(x)=\begin{cases}
0 & x<a \text{ atau } x>d\\
\dfrac{x-a}{b-a} & a\le x<b\\
1 & b\le x\le c\\
\dfrac{d-x}{d-c} & c<x\le d
\end{cases}
$$

| Variabel | Jenis | Semesta | Himpunan (a, b, c, d) |
|---|---|---|---|
| Dose (g) | input | 14 – 24 | Rendah (14, 14, 16,5, 17,5) · Normal (16,5, 17,5, 18,5, 19,5) · Tinggi (18,5, 19,5, 24, 24) |
| Yield (g) | input | 20 – 60 | Sedikit (20, 20, 30, 34) · Normal (30, 34, 38, 42) · Banyak (38, 42, 60, 60) |
| Waktu ekstraksi (detik) | input | 10 – 50 | Cepat (10, 10, 22, 25) · Normal (22, 25, 30, 33) · Lambat (30, 33, 50, 50) |
| Profil rasa (skala) | input | −5 – +5 | Asam (−5, −5, −3, 0) · Seimbang (−2, 0, 0, 2) · Pahit (0, 3, 5, 5) |
| Penyesuaian grind (step) | output | −3 – +3 | Jauh Lebih Halus (−3, −3, −2, −1) · Lebih Halus (−2, −1, −1, 0) · Tetap (−1, 0, 0, 1) · Lebih Kasar (0, 1, 1, 2) · Jauh Lebih Kasar (1, 2, 3, 3) |

Nilai bawaan mengacu pada praktik espresso modern: double shot 18 g → 36 g (rasio 1:2) dalam
25–30 detik (Cameron et al., 2020). Profil rasa diinput sebagai skala numerik agar variabel
linguistik seperti *"sedikit asam"* dapat difuzzifikasi: di aplikasi tersedia tombol
Sangat Asam (−4), Asam (−2,5), Sedikit Asam (−1), Seimbang (0), Sedikit Pahit (+1), Pahit (+2,5),
Sangat Pahit (+4), serta slider untuk nilai di antaranya.

Output negatif berarti **putar ke arah halus**, positif **ke arah kasar**. Satu *step* diterjemahkan
ke satuan dial grinder lewat menu Pengaturan (bawaan 1 step = 1 klik; bisa diubah, mis. 1 step = 2 klik), lalu dibulatkan
sesuai resolusi dial. Bila |z*| < 0,25 step, rekomendasinya **pertahankan setting**.

## 2. Logika Head Barista (pembentuk rule base)

Rasa adalah sinyal utama. Waktu dan yield dipakai untuk mendiagnosis **apakah gilingan memang
penyebabnya** melalui *indeks aliran*:

```
indeks aliran = level(waktu) − level(yield)          level: bawah = −1, normal = 0, atas = +1
```

Positif = air mengalir lebih lambat dari seharusnya (gilingan terlalu halus); negatif = terlalu cepat
(gilingan terlalu kasar). Bila dose menyimpang **searah** dengan aliran (dose tinggi + aliran lambat,
dose rendah + aliran cepat), koreksi dikurangi satu tingkat karena dose ikut menjelaskan
penyimpangannya — barista diminta membetulkan dose lebih dulu.

| Rasa \ Indeks aliran | −2 | −1 | 0 | +1 | +2 |
|---|---|---|---|---|---|
| Asam | Jauh Lebih Halus | Jauh Lebih Halus | Lebih Halus | Tetap | Tetap |
| Seimbang | Lebih Halus | Tetap | Tetap | Tetap | Lebih Kasar |
| Pahit | Tetap | Tetap | Lebih Kasar | Jauh Lebih Kasar | Jauh Lebih Kasar |

- **Asam + aliran cepat** → under-extracted → haluskan.
- **Pahit + aliran lambat** → over-extracted → kasarkan.
- **Asam + lambat** atau **pahit + cepat** → gejala *channeling*; gilingan dipertahankan dan
  aplikasi menampilkan catatan perbaikan *puck prep* (distribusi, tamping, basket).
- **Rasa seimbang** → "jangan kejar angka"; hanya dikoreksi bila aliran sangat menyimpang.

## 3. Rule base (3 × 3 × 3 × 3 = 81 aturan)

Format: **JIKA** Dose … **DAN** Yield … **DAN** Waktu … **DAN** Rasa … **MAKA** Grind …

| No | Dose | Yield | Waktu | Rasa | Grind (output) |
|---|---|---|---|---|---|
| R1 | Rendah | Sedikit | Cepat | Asam | Lebih Halus |
| R2 | Rendah | Sedikit | Cepat | Seimbang | Tetap |
| R3 | Rendah | Sedikit | Cepat | Pahit | Lebih Kasar |
| R4 | Rendah | Sedikit | Normal | Asam | Tetap |
| R5 | Rendah | Sedikit | Normal | Seimbang | Tetap |
| R6 | Rendah | Sedikit | Normal | Pahit | Jauh Lebih Kasar |
| R7 | Rendah | Sedikit | Lambat | Asam | Tetap |
| R8 | Rendah | Sedikit | Lambat | Seimbang | Lebih Kasar |
| R9 | Rendah | Sedikit | Lambat | Pahit | Jauh Lebih Kasar |
| R10 | Rendah | Normal | Cepat | Asam | Lebih Halus |
| R11 | Rendah | Normal | Cepat | Seimbang | Tetap |
| R12 | Rendah | Normal | Cepat | Pahit | Lebih Kasar |
| R13 | Rendah | Normal | Normal | Asam | Lebih Halus |
| R14 | Rendah | Normal | Normal | Seimbang | Tetap |
| R15 | Rendah | Normal | Normal | Pahit | Lebih Kasar |
| R16 | Rendah | Normal | Lambat | Asam | Tetap |
| R17 | Rendah | Normal | Lambat | Seimbang | Tetap |
| R18 | Rendah | Normal | Lambat | Pahit | Jauh Lebih Kasar |
| R19 | Rendah | Banyak | Cepat | Asam | Jauh Lebih Halus |
| R20 | Rendah | Banyak | Cepat | Seimbang | Tetap |
| R21 | Rendah | Banyak | Cepat | Pahit | Tetap |
| R22 | Rendah | Banyak | Normal | Asam | Lebih Halus |
| R23 | Rendah | Banyak | Normal | Seimbang | Tetap |
| R24 | Rendah | Banyak | Normal | Pahit | Lebih Kasar |
| R25 | Rendah | Banyak | Lambat | Asam | Lebih Halus |
| R26 | Rendah | Banyak | Lambat | Seimbang | Tetap |
| R27 | Rendah | Banyak | Lambat | Pahit | Lebih Kasar |
| R28 | Normal | Sedikit | Cepat | Asam | Lebih Halus |
| R29 | Normal | Sedikit | Cepat | Seimbang | Tetap |
| R30 | Normal | Sedikit | Cepat | Pahit | Lebih Kasar |
| R31 | Normal | Sedikit | Normal | Asam | Tetap |
| R32 | Normal | Sedikit | Normal | Seimbang | Tetap |
| R33 | Normal | Sedikit | Normal | Pahit | Jauh Lebih Kasar |
| R34 | Normal | Sedikit | Lambat | Asam | Tetap |
| R35 | Normal | Sedikit | Lambat | Seimbang | Lebih Kasar |
| R36 | Normal | Sedikit | Lambat | Pahit | Jauh Lebih Kasar |
| R37 | Normal | Normal | Cepat | Asam | Jauh Lebih Halus |
| R38 | Normal | Normal | Cepat | Seimbang | Tetap |
| R39 | Normal | Normal | Cepat | Pahit | Tetap |
| R40 | Normal | Normal | Normal | Asam | Lebih Halus |
| R41 | Normal | Normal | Normal | Seimbang | Tetap |
| R42 | Normal | Normal | Normal | Pahit | Lebih Kasar |
| R43 | Normal | Normal | Lambat | Asam | Tetap |
| R44 | Normal | Normal | Lambat | Seimbang | Tetap |
| R45 | Normal | Normal | Lambat | Pahit | Jauh Lebih Kasar |
| R46 | Normal | Banyak | Cepat | Asam | Jauh Lebih Halus |
| R47 | Normal | Banyak | Cepat | Seimbang | Lebih Halus |
| R48 | Normal | Banyak | Cepat | Pahit | Tetap |
| R49 | Normal | Banyak | Normal | Asam | Jauh Lebih Halus |
| R50 | Normal | Banyak | Normal | Seimbang | Tetap |
| R51 | Normal | Banyak | Normal | Pahit | Tetap |
| R52 | Normal | Banyak | Lambat | Asam | Lebih Halus |
| R53 | Normal | Banyak | Lambat | Seimbang | Tetap |
| R54 | Normal | Banyak | Lambat | Pahit | Lebih Kasar |
| R55 | Tinggi | Sedikit | Cepat | Asam | Lebih Halus |
| R56 | Tinggi | Sedikit | Cepat | Seimbang | Tetap |
| R57 | Tinggi | Sedikit | Cepat | Pahit | Lebih Kasar |
| R58 | Tinggi | Sedikit | Normal | Asam | Lebih Halus |
| R59 | Tinggi | Sedikit | Normal | Seimbang | Tetap |
| R60 | Tinggi | Sedikit | Normal | Pahit | Lebih Kasar |
| R61 | Tinggi | Sedikit | Lambat | Asam | Tetap |
| R62 | Tinggi | Sedikit | Lambat | Seimbang | Tetap |
| R63 | Tinggi | Sedikit | Lambat | Pahit | Jauh Lebih Kasar |
| R64 | Tinggi | Normal | Cepat | Asam | Jauh Lebih Halus |
| R65 | Tinggi | Normal | Cepat | Seimbang | Tetap |
| R66 | Tinggi | Normal | Cepat | Pahit | Tetap |
| R67 | Tinggi | Normal | Normal | Asam | Lebih Halus |
| R68 | Tinggi | Normal | Normal | Seimbang | Tetap |
| R69 | Tinggi | Normal | Normal | Pahit | Lebih Kasar |
| R70 | Tinggi | Normal | Lambat | Asam | Lebih Halus |
| R71 | Tinggi | Normal | Lambat | Seimbang | Tetap |
| R72 | Tinggi | Normal | Lambat | Pahit | Lebih Kasar |
| R73 | Tinggi | Banyak | Cepat | Asam | Jauh Lebih Halus |
| R74 | Tinggi | Banyak | Cepat | Seimbang | Lebih Halus |
| R75 | Tinggi | Banyak | Cepat | Pahit | Tetap |
| R76 | Tinggi | Banyak | Normal | Asam | Jauh Lebih Halus |
| R77 | Tinggi | Banyak | Normal | Seimbang | Tetap |
| R78 | Tinggi | Banyak | Normal | Pahit | Tetap |
| R79 | Tinggi | Banyak | Lambat | Asam | Lebih Halus |
| R80 | Tinggi | Banyak | Lambat | Seimbang | Tetap |
| R81 | Tinggi | Banyak | Lambat | Pahit | Lebih Kasar |

## 4. Tahapan inferensi

1. **Fuzzifikasi** — setiap input crisp dibatasi ke semesta pembicaraannya lalu dihitung μ-nya.
2. **Evaluasi aturan** — α-predikat tiap aturan = `MIN(μ_dose, μ_yield, μ_waktu, μ_rasa)`.
3. **Implikasi & komposisi** — himpunan output dipotong setinggi α (MIN); potongan dari semua
   aturan digabung dengan MAX: `μ_agr(z) = max_i min(α_i, μ_Ci(z))`.
4. **Defuzzifikasi centroid (COA)** — `z* = ∫ z·μ_agr(z) dz / ∫ μ_agr(z) dz`, dihitung **eksak**:
   daerah hasil agregasi dipecah menjadi segmen linear, lalu tiap segmen menyumbang
   luas `A = ½(μ₀ + μ₁)(z₁ − z₀)` dan momen `M = (z₁ − z₀)/6 · [z₀(2μ₀ + μ₁) + z₁(μ₀ + 2μ₁)]`,
   sehingga `z* = ΣM / ΣA` (lihat [`src/fuzzy/centroid.ts`](../src/fuzzy/centroid.ts)).
5. **Interpretasi** — |z*| × skala grinder dibulatkan ke resolusi dial (bawaan: 1 step = 1 klik).
   Bila |z*| < 0,25 → *Pertahankan Setting Grinder*; z* < 0 → *Perhalus Putaran Grinder*;
   z* > 0 → *Perkasar Putaran Grinder*.

## 5. Contoh perhitungan

**Input:** dose 18 g, yield 36 g, waktu 20 detik, rasa −2,5 (Asam).

| Variabel | Derajat keanggotaan |
|---|---|
| Dose 18 | Normal = 1 |
| Yield 36 | Normal = 1 |
| Waktu 20 | Cepat = 1 (20 ≤ 22) |
| Rasa −2,5 | Asam = (0 − (−2,5)) / (0 − (−3)) = 0,833; Seimbang = 0 |

Aturan aktif: **R37** — JIKA Dose Normal DAN Yield Normal DAN Waktu Cepat DAN Rasa Asam MAKA
Grind Jauh Lebih Halus, α = min(1; 1; 1; 0,833) = **0,833**.

Himpunan *Jauh Lebih Halus* (−3; −3; −2; −1) dipotong pada α = 0,833. Garis potong bertemu sisi turun
μ = (−1 − z)/(−1 − (−2)) pada z = −1 − 0,833 = −1,833, sehingga daerah agregasi terdiri atas dua segmen:

| Segmen | Rentang z | μ(z) | Luas A | Momen M |
|---|---|---|---|---|
| 1 (dipotong α) | −3 ≤ z ≤ −1,833 | 0,833 | 0,9722 | −2,3495 |
| 2 (sisi turun) | −1,833 ≤ z ≤ −1 | (−1 − z)/1 | 0,3472 | −0,5401 |
| **Jumlah** | | | **1,3194** | **−2,8897** |

z* = ΣM / ΣA = −2,8897 / 1,3194 = **−2,190 step** → *Perhalus Putaran Grinder 2 klik*
(1 step = 1 klik, resolusi 1). Setting 12 → 10.

Contoh lain (hasil dari mesin yang sama, dapat diulang di menu Kalibrasi → *Perhitungan Fuzzy Mamdani*):

| Dose | Yield | Waktu | Rasa | Aturan aktif (α) | z* | Rekomendasi |
|---|---|---|---|---|---|---|
| 18 | 36 | 28 | 0 | R41 Tetap (1) | 0,000 | Pertahankan |
| 18 | 36 | 28 | −1 | R41 Tetap (0,5); R40 Lebih Halus (0,333) | −0,410 | Perhalus 1 klik |
| 18 | 36 | 32 | −2,5 | R43 Tetap (0,667); R40 Lebih Halus (0,333) | −0,364 | Perhalus 1 klik + catatan channeling |
| 18 | 36 | 38 | +3 | R45 Jauh Lebih Kasar (1) | +2,222 | Perkasar 2 klik |
| 20 | 40 | 30 | 0 | R68 Tetap (0,5); R77 Tetap (0,5) | 0,000 | Pertahankan + catatan dose |

## 6. Catatan Head Barista (aturan tegas pendamping)

Keluaran fuzzy tetap tunggal (grind size) sesuai batasan penelitian. Di samping itu aplikasi
menampilkan catatan diagnostik tegas (crisp) yang **tidak mengubah nilai z***, antara lain:
indikasi channeling, dose di luar standar, yield jauh dari target, gushing (< 15 dtk) / choking
(> 40 dtk), saran suhu/rasio bila aliran normal tetapi rasa masih menyimpang, dan pengingat
*purge* 2–3 g setelah mengubah setting. Lihat [`src/fuzzy/advice.ts`](../src/fuzzy/advice.ts).

## 7. Pemetaan ke skenario Black-Box Testing

Skenario diuji otomatis (`npm test`) di [`src/fuzzy/engine.test.ts`](../src/fuzzy/engine.test.ts)
dan [`src/lib/auth.test.ts`](../src/lib/auth.test.ts):

| Skenario (Tabel III.1 & analisis) | Input | Hasil yang diharapkan |
|---|---|---|
| Autentikasi | email + kata sandi benar / salah | masuk ke Dashboard / pesan "Email atau kata sandi salah" |
| Kalibrasi — shot standar | 18 / 36 / 28 / Seimbang | Pertahankan setting, catatan "on point" |
| Kalibrasi — asam & cepat | 18 / 36 / 19 / Asam | Jauh Lebih Halus, z* < −1,5 |
| Kalibrasi — pahit & lambat | 18 / 36 / 38 / Pahit | Jauh Lebih Kasar, z* > 1,5 |
| Kalibrasi — sedikit asam | 18 / 36 / 28 / −1 | Sedikit ke halus (−1 < z* < −0,25) |
| Kalibrasi — channeling | 18 / 36 / 36 / Asam | Tetap + catatan channeling |
| Dose berlebih | 20,5 / 36 / 33 / Seimbang | Tetap + catatan dose |
| Nilai batas / di luar semesta | 30 / 80 / 5 / −9 | Dibatasi ke 24 / 60 / 10 / −5, tetap ada rekomendasi + peringatan |
| Konsistensi (monoton) | rasa −5…+5, waktu 10…50 | z* naik searah rasa/waktu |
| Rule base kosong | 0 aturan | tidak ada rekomendasi (ditangani di UI) |
| Validasi himpunan | titik a > b, celah semesta | ditolak dengan pesan kesalahan |

## 8. Agreement rate terhadap pakar

Di menu **Riwayat → detail sesi**, Head Barista memilih keputusannya sendiri (Halus/Tetap/Kasar)
untuk tiap shot. Aplikasi menghitung

```
agreement rate = (jumlah shot dengan arah sistem = keputusan pakar / jumlah shot yang dinilai) × 100%
```

dan seluruh data dapat diekspor ke CSV (kolom `rekomendasi`, `keputusan_pakar`, `sesuai`) untuk
analisis di Bab IV.
