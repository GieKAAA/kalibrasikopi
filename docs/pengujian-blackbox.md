# Skenario Pengujian Black-Box

Skenario di bawah disusun dari perilaku aplikasi yang sebenarnya dan dikelompokkan per teknik
pengujian, sehingga klaim di naskah (alur normal, nilai batas, masukan tidak valid, tipe data)
sesuai dengan skenario yang benar-benar diuji (komentar C11 dan C13 pembimbing).

Kolom **Cara uji**: *UI* = dijalankan di browser lewat skrip Playwright terhadap build aplikasi;
*Unit* = tes otomatis `npm test`; *Perangkat* = harus diuji langsung di tablet Android.

## A. Alur normal (happy path)

| No | Modul | Skenario | Hasil yang diharapkan | Cara uji | Kesimpulan |
|---|---|---|---|---|---|
| 1 | Autentikasi | Memasukkan email dan kata sandi yang valid lalu menekan **Masuk** | Masuk ke halaman Beranda (Dashboard) | UI | Valid |
| 2 | Dashboard | Menekan **Mulai kalibrasi** pada Modul 1 Kalibrasi espresso | Halaman kalibrasi terbuka | UI | Valid |
| 3 | Mesin inferensi | Dose 18 g, yield 42 g, waktu 21 s, rasa Asam (−2,5), setting 12, tekan **Analisis shot** | Kartu hasil "Perhalus Putaran Grinder", −2 klik, setting 12 → 10, alasan "Shot terlalu cepat …, rasa asam" | UI | Valid |
| 4 | Jejak perhitungan | Head Barista membuka Riwayat → sesi → **Lihat perhitungan** pada shot tersebut | Substitusi μ per himpunan, α = min(1; 1; 1; 0,833) = 0,833, tabel luas/momen, z* = −2,8897 / 1,3194 = −2,19 | UI | Valid |
| 5 | Status kalibrasi | Dose 18 g, yield 39 g, waktu 29 s, rasa Seimbang | "Pertahankan Setting Grinder" dan status "Terkalibrasi" | UI | Valid |
| 5a | Kalibrasi ulang | Shot 1: 18/36/34 s/Pahit, setting 12 → saran +2 klik (12 → 14); tekan **Sudah diputar ke 14 — lanjut shot #2**; shot 2: waktu 28 s, rasa Seimbang | Waktu dan rasa dikosongkan untuk shot #2; hasil shot #2 "Pertahankan Setting Grinder", Terkalibrasi, "Dibanding shot #1: waktu 34 → 28 detik" | UI | Valid |
| 5b | Kalibrasi ulang | Setelah hasil shot 1 keluar, setting grinder di stepper diubah ke 14 tanpa menarik shot baru | Tidak ada tombol analisis ulang; muncul penjelasan bahwa waktu dan rasa masih milik shot #1 serta tombol **Lanjut ke shot #2** | UI | Valid |
| 6 | Riwayat & agreement | Head Barista mengisi keputusan pakar dua shot (sama dengan sistem) | Kesesuaian 100% ("2 dari 2 shot cocok") | UI | Valid |
| 7 | Modul resep | Memilih kategori **Signature**, lalu menu Es Kopi Susu Gula Aren | Komposisi, takaran gramasi, dan SOP tampil | UI | Valid |
| 8 | Kuesioner SUS | Mengisi 10 butir (5, 1, 5, 1, 4, 1, 4, 1, 4, 2) lalu Head Barista membuka Rekap | Jawaban tersimpan; Rekap menampilkan jumlah 36 dan skor SUS 90 (subtotal ganjil 17, genap 19 diverifikasi tes unit). Responden tidak melihat skor. | UI + Unit | Valid |
| 8a | Dial desimal | Grinder diatur satuan angka, 1 step = 0,1, resolusi 0,1; shot 18/36/34 s/Pahit di setting 2,2 | Saran +0,2, setting 2,2 → 2,4 | UI + Unit | Valid |

## B. Masukan tidak valid (invalid input)

| No | Modul | Skenario | Hasil yang diharapkan | Cara uji | Kesimpulan |
|---|---|---|---|---|---|
| 9 | Autentikasi | Form email/kata sandi dikosongkan lalu menekan **Masuk** | Pesan "Form tidak boleh kosong." | UI | Valid |
| 10 | Autentikasi | Kata sandi salah | Pesan "Email atau kata sandi salah.", tetap di halaman masuk | UI | Valid |
| 11 | Validasi form kalibrasi | Menekan **Analisis shot** sebelum waktu dan rasa diisi | Snackbar "Silakan lengkapi semua parameter kalibrasi (Waktu, Profil rasa)." dan perhitungan dibatalkan | UI | Valid |
| 12 | Validasi form kalibrasi | Dose dikosongkan (0) lalu analisis ulang | Snackbar menyebut "Dose" | UI | Valid |
| 13 | Basis pengetahuan | Titik himpunan diubah menjadi a > b, atau membuat celah semesta | Perubahan ditolak dengan pesan kesalahan | Unit | Valid |

## C. Tipe data

| No | Modul | Skenario | Hasil yang diharapkan | Cara uji | Kesimpulan |
|---|---|---|---|---|---|
| 14 | Form kalibrasi | Mengetik teks "abc" pada isian dose | Masukan ditolak, nilai tetap 18 g | UI | Valid |
| 15 | Kuesioner SUS | Jawaban tidak lengkap (9 butir) atau di luar 1–5 | Jawaban tidak dapat disimpan | Unit | Valid |

## D. Analisis nilai batas (Boundary Value Analysis)

| No | Modul | Skenario | Hasil yang diharapkan | Cara uji | Kesimpulan |
|---|---|---|---|---|---|
| 16 | Mesin inferensi | Nilai di luar semesta: dose 30 g, yield 80 g, waktu 5 s, rasa Sangat Asam | Nilai dibatasi ke 24 / 60 / 10, rekomendasi tetap keluar, peringatan "Nilai di luar rentang basis pengetahuan" dan catatan gushing | UI | Valid |
| 17 | Fungsi keanggotaan | Nilai di titik batas: dose 14 g dan 24 g (bahu), 17 g (sisi turun Rendah), 19 g (sisi naik Tinggi); segitiga tepat di titik a dan di luar d | μ = 1; 1; 0,5; 0,5; 0; 0 | Unit | Valid |
| 18 | Mesin inferensi | Rasa −5 sampai +5 dan waktu 10–50 s | z* naik searah rasa dan waktu (monoton) | Unit | Valid |
| 19 | Defuzzifikasi | 300 kombinasi input acak | Centroid eksak (luas/momen) sama dengan integrasi numerik halus (selisih < 0,001) | Unit | Valid |

## E. Perlu diuji di tablet Android

| No | Modul | Skenario | Hasil yang diharapkan | Cara uji | Kesimpulan |
|---|---|---|---|---|---|
| 20 | Navigasi | Menekan tombol **Kembali** Android di halaman hasil kalibrasi | Kembali ke halaman sebelumnya; di halaman awal aplikasi diminimalkan, tidak tertutup paksa | Perangkat | [isi] |
| 21 | Hak akses | Akun Barista membuka menu Head Barista (alamat /head-barista) | Menu tidak tampil di navigasi; halaman menampilkan "Khusus Head Barista" | UI | Valid |
| 22 | Ekspor data | Ekspor CSV riwayat kalibrasi | Lembar Bagikan Android terbuka dengan berkas CSV | Perangkat | [isi] |

Persentase kesesuaian fungsional = jumlah skenario Valid / jumlah skenario × 100%. Saat ini 23
skenario (A–D, termasuk 5a, 5b, 8a, dan 21) sudah dijalankan dan seluruhnya valid; skenario 20 dan 22
diisi setelah uji di tablet.
