# Sinkronisasi Aplikasi dengan Draf Hasil Revisi 2

> Seluruh perbaikan di bawah sudah diterapkan pada naskah **Draf Hasil REVISI-3**. Contoh perhitungan pada naskah
> memakai shot uji ke-9 (18 g / 45 g / 22 s / −1; R46 α 0,333, R47 α 0,5; ΣA 1,1389; ΣM −1,6883; z* −1,482 → perhalus 1 klik).

Catatan ini memetakan komentar pembimbing pada *Draf Hasil Revisi 2* ke perubahan aplikasi, dan
menyajikan keluaran aplikasi untuk data yang dipakai di naskah. Semua angka di bawah dihasilkan
oleh mesin inferensi aplikasi dengan basis pengetahuan bawaan, grinder 1 step = 1 klik.

## 1. Komentar pembimbing → perubahan aplikasi

| Komentar | Isi singkat | Perubahan di aplikasi | Yang perlu diperbaiki di naskah |
|---|---|---|---|
| C7 | Fuzzifikasi tidak dapat diverifikasi; cantumkan (a, b, c, d) dan grafik sebelum substitusi | Jejak perhitungan menampilkan grafik, parameter (a; b; c; d) tiap himpunan, dan substitusi rumus, mis. μ_Asam(−2,5) = (0 − (−2,5))/(0 − (−3)) = 0,833 | Salin Tabel IV.x (himpunan) lalu substitusi dari Riwayat → sesi → Lihat perhitungan (akun Head Barista) |
| C8 | Konsekuen aturan tidak konsisten; tulis α eksplisit dengan min | α ditulis α₄₆ = min(1; 1; 1; 0,833) = 0,833 beserta konsekuen aturan dari rule base | Konsekuen harus sama dengan Tabel IV.2 (Waktu Cepat + Asam → Jauh Lebih Halus) |
| C9 | COA tanpa langkah luas/momen; istilah "Lebar Halus" keliru | Centroid dihitung eksak dari segmen: tabel rentang z, μ(z), luas A, momen M, lalu z* = ΣM/ΣA | Ganti "Lebar Halus" → "Lebih Halus"; sertakan tabel luas/momen |
| C10 | Tabel 10 sesi tanpa nomor; agreement rate tidak dihitung; kriteria Calibrated tidak jelas | Kriteria tertulis di Riwayat; kesesuaian ditampilkan "x dari n shot cocok" beserta persentase; keputusan pakar mencatat arah **dan** besar klik | Lihat bagian 3 di bawah |
| C11, C13 | Klaim BVA/tipe data tidak didukung skenario; kolom Kesimpulan kosong; nomor Tabel IV.5 ganda | Perilaku aplikasi diselaraskan (pesan "Form tidak boleh kosong.", snackbar "Silakan lengkapi semua parameter kalibrasi", tombol Kembali Android, kartu "Perhalus Putaran Grinder") | Pakai [pengujian-blackbox.md](pengujian-blackbox.md): skenario per teknik uji, kolom Kesimpulan terisi |
| C12 | Format desimal tidak konsisten; kategori SUS tidak lengkap | Seluruh angka memakai koma desimal; CSV memakai pemisah titik koma dan koma desimal; modul Kuesioner SUS menghitung skor dan kategori Tabel III.3 | Lihat bagian 4 — angka SUS di draf perlu dihitung ulang |
| C1–C6, C14, C0 | Ejaan, kata ganti orang pertama, daftar pustaka, daftar isi, penyebutan pakar | — (perbaikan teks naskah) | Perbaiki langsung di naskah |

## 2. Contoh perhitungan manual yang benar (pengganti simulasi draf)

Simulasi di draf (Dose 20 g, Yield 42 g, Waktu 21 s, Rasa "2 (cenderung asam)") tidak sesuai
aplikasi: pada skala aplikasi, **+2 berarti pahit**; rasa cenderung asam ditulis **−2**. Dengan
basis pengetahuan bawaan, 20 g termasuk Dose **Tinggi** (bukan Normal) dan 42 g termasuk Yield
**Banyak**. Perhitungan yang benar untuk 20 g / 42 g / 21 s / −2:

1. **Fuzzifikasi**
    - Dose 20: μ_Tinggi = 1 (19,5 ≤ 20 ≤ 24); μ_Rendah = μ_Normal = 0 (20 > d = 19,5).
    - Yield 42: μ_Banyak = 1 (42 ≤ 42 ≤ 60); μ_Normal = (42 − 42)/(42 − 38) = 0; μ_Sedikit = 0.
    - Waktu 21: μ_Cepat = 1 (10 ≤ 21 ≤ 22); μ_Normal = μ_Lambat = 0.
    - Rasa −2: μ_Asam = (0 − (−2))/(0 − (−3)) = 0,667; μ_Seimbang = 0 (x = a = −2); μ_Pahit = 0.
2. **Evaluasi aturan** — hanya R73 aktif: JIKA Dose Tinggi DAN Yield Banyak DAN Waktu Cepat DAN Rasa
   Asam MAKA Grind Jauh Lebih Halus; α₇₃ = min(1; 1; 1; 0,667) = 0,667.
3. **Komposisi** — μ_agr(z) = min(0,667; μ_JauhLebihHalus(z)).
4. **Defuzzifikasi**

| Segmen | Rentang z | μ(z) | Luas A | Momen M |
|---|---|---|---|---|
| 1 | −3 ≤ z ≤ −1,667 | 0,667 (konstan) | 0,8889 | −2,0741 |
| 2 | −1,667 ≤ z ≤ −1 | (−1 − z)/(−1 − (−2)) | 0,2222 | −0,3210 |
| **Jumlah** | | | **1,1111** | **−2,3951** |

   z* = −2,3951 / 1,1111 = **−2,156**
5. **Interpretasi** — |z*| × 1 = 2,156 klik, dibulatkan = 2 klik → **Perhalus Putaran Grinder 2 klik**.

Contoh dengan dose 18 g / yield 36 g / waktu 20 s / rasa −2,5 (aturan R37, α = 0,833) menghasilkan
ΣA = 1,3194, ΣM = −2,8897, z* = −2,190 (lihat [fuzzy-mamdani.md](fuzzy-mamdani.md)). Nilai z* = −1,25
pada draf tidak dihasilkan oleh basis pengetahuan aplikasi.

## 3. Keluaran aplikasi untuk 10 sesi pada draf

Nilai rasa yang dipakai: Asam −2,5; Sedikit/Agak/Cenderung Asam −1; Seimbang 0; Sedikit/Agak Pahit
+1; Pahit +2,5. Kriteria **Terkalibrasi**: rekomendasi Tetap, rasa Seimbang (μ ≥ 0,5), dan waktu
Normal (μ ≥ 0,5).

| No | Parameter | Aturan aktif (α) | z* | Output sistem | Waktu | Status shot |
|---|---|---|---|---|---|---|
| 1 | 18 g / 50 g / 16 s / Asam | R46 (0,833) | −2,190 | Perhalus (−2 klik) | Under | Belum terkalibrasi |
| 2 | 18 g / 40 g / 28 s / Seimbang | R41 (0,5); R50 (0,5) | 0 | Tetap (0 klik) | Ideal | Terkalibrasi |
| 3 | 18 g / 32 g / 38 s / Pahit | R36 (0,5); R45 (0,5) | 2,119 | Perkasar (+2 klik) | Over | Belum terkalibrasi |
| 4 | 18 g / 42 g / 21 s / Asam | R46 (0,833) | −2,190 | **Perhalus (−2 klik)** | Under | Belum terkalibrasi |
| 5 | 18 g / 38 g / 32 s / Sedikit Pahit | R44 (0,5); R41, R42, R45 (0,333) | 0,939 | Perkasar (+1 klik) | Over | Belum terkalibrasi |
| 6 | 18 g / 48 g / 19 s / Cenderung Asam | R47 (0,5); R46 (0,333) | −1,482 | Perhalus (−1 klik) | Under | Belum terkalibrasi |
| 7 | 18 g / 40 g / 27 s / Seimbang | R41 (0,5); R50 (0,5) | 0 | Tetap (0 klik) | Ideal | Terkalibrasi |
| 8 | 18 g / 35 g / 36 s / Pahit | R45 (0,833) | 2,190 | Perkasar (+2 klik) | Over | Belum terkalibrasi |
| 9 | 18 g / 45 g / 22 s / Agak Asam | R47 (0,5); R46 (0,333) | −1,482 | Perhalus (−1 klik) | Under | Belum terkalibrasi |
| 10 | 18 g / 39 g / 29 s / Seimbang | R41 (0,75); R50 (0,25) | 0 | Tetap (0 klik) | Ideal | **Terkalibrasi** |

Perbedaan dengan tabel draf:

- **Sesi 4** — draf menulis output sistem −1 klik; aplikasi menghasilkan −2 klik untuk rasa Asam (−2,5).
  Bila rasa yang dicatat sebenarnya "sedikit asam", ubah parameter rasanya menjadi −1 (hasilnya −1 klik).
  Status kesesuaian dengan pakar (−1 klik) ikut berubah.
- **Sesi 10** — rasa Seimbang, waktu 29 s (Ideal), output Tetap → menurut kriteria aplikasi
  **Terkalibrasi**, bukan Uncalibrated (komentar C10).

Agreement rate dihitung eksplisit: jumlah shot sesuai / jumlah shot dinilai × 100%. Pada draf
(9 sesuai dari 10) = 9/10 × 100% = 90%; hitung ulang setelah sesi 4 diperbaiki.

## 4. Perhitungan ulang SUS draf

Skor dari jawaban responden pada tabel "Jawaban Responden" draf **tidak sama** dengan tabel
"Skor SUS per responden":

| Responden | Jawaban P1–P10 | Ganjil | Genap | Jumlah (0–40) | Skor SUS | Di draf |
|---|---|---|---|---|---|---|
| R1 | 5, 1, 5, 1, 4, 1, 4, 1, 4, 2 | 17 | 19 | 36 | 90,00 | 35,0 / 87,50 |
| R2 | 4, 2, 4, 1, 5, 2, 5, 2, 5, 2 | 18 | 16 | 34 | 85,00 | 34,0 / 85,00 |
| R3 | 5, 1, 5, 1, 5, 1, 4, 1, 4, 1 | 18 | 20 | 38 | 95,00 | 35,5 / 88,75 |
| R4 | 4, 2, 4, 2, 4, 2, 4, 2, 4, 2 | 15 | 15 | 30 | 75,00 | 33,5 / 83,75 |
| R5 | 4, 2, 4, 2, 4, 2, 4, 2, 4, 2 | 15 | 15 | 30 | 75,00 | 33,0 / 82,50 |
| **Rata-rata** | | | | 33,6 | **84,00** | 34,2 / 85,50 |

Rata-rata 84,00 berada pada kategori **Good / Grade B** (70–84) menurut Tabel III.3, bukan
Excellent / Grade A. Jumlah skor terkonversi selalu bilangan bulat, sehingga nilai 35,5 dan 33,5
pada draf tidak mungkin terjadi. Periksa kembali lembar jawaban asli: bila jawaban di tabel yang
salah ketik, perbaiki jawabannya; bila skornya yang salah, perbaiki skor, rata-rata, kategori, dan
kesimpulan Bab V. Jawaban dapat dimasukkan ulang di menu **Kuesioner SUS** untuk menghasilkan
tabel dan rata-rata yang konsisten.
