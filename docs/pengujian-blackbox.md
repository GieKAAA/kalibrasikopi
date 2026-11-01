# Skenario Pengujian Black-Box

Skenario ini sama dengan Tabel 3.1 (rancangan) dan Tabel 4.8 (hasil) pada naskah Draf Hasil REVISI-3.
Skenario dikelompokkan per teknik pengujian sehingga klaim di naskah sesuai dengan skenario yang benar-benar diuji.

Kolom **Cara uji**: *UI* = dijalankan di browser lewat skrip Playwright terhadap build aplikasi terbaru;
*Unit* = tes otomatis `npm test`; *Perangkat* = diuji langsung di tablet Android.

| No | Teknik | Modul | Skenario | Hasil yang diharapkan | Hasil aktual | Cara uji | Kesimpulan |
|---|---|---|---|---|---|---|---|
| 1 | Alur normal | Autentikasi | Mengisi email dan kata sandi yang valid, lalu menekan Masuk. | Pengguna masuk ke halaman Beranda. | Halaman Beranda tampil dengan Modul 1 dan Modul 2. | UI | Valid |
| 2 | Alur normal | Beranda | Menekan Mulai kalibrasi pada Modul 1. | Halaman kalibrasi terbuka. | Halaman kalibrasi terbuka. | UI | Valid |
| 3 | Alur normal | Kalibrasi | Dose 18 g, yield 45 g, waktu 22 detik, rasa Sedikit Asam, setting 12, lalu menekan Analisis shot. | Saran "Perhalus Putaran Grinder" sebanyak 1 klik dan setting 12 → 11, sesuai perhitungan manual. | Tampil "Perhalus Putaran Grinder", −1 klik, 12 → 11. | UI | Valid |
| 4 | Alur normal | Kalibrasi ulang | Menekan "Sudah diputar ke 11 — lanjut shot #2". | Waktu dan rasa dikosongkan; shot #2 siap diisi dengan setting 11. | Waktu 0 s, rasa kosong, setting 11. | UI | Valid |
| 5 | Alur normal | Kalibrasi ulang | Setelah hasil keluar, setting grinder diubah tanpa menarik shot baru. | Data lama tidak dianalisis ulang; muncul penjelasan dan tombol lanjut ke shot berikutnya. | Penjelasan dan tombol "Lanjut ke shot #2" tampil; tombol analisis ulang tidak ada. | UI | Valid |
| 6 | Alur normal | Status kalibrasi | Dose 18 g, yield 39 g, waktu 29 detik, rasa Seimbang. | "Pertahankan Setting Grinder" dan status Terkalibrasi. | Sesuai harapan. | UI | Valid |
| 7 | Alur normal | Riwayat | Head Barista mengisi keputusan pada 10 shot uji. | Kolom Kesesuaian dan persentase kesesuaian tampil. | Tampil 8 dari 10 shot cocok (80%). | UI | Valid |
| 8 | Alur normal | Jejak perhitungan | Head Barista menekan Lihat perhitungan pada shot uji ke-9. | Substitusi μ, α = min(…), tabel luas dan momen, serta z* tampil. | z* = −1,482, sama dengan perhitungan manual. | UI | Valid |
| 9 | Alur normal | Resep | Memilih kategori Signature lalu salah satu menu, kemudian membuka Mode Seduh. | Komposisi, takaran, dan SOP tampil; Mode Seduh menampilkan langkah satu per satu. | Sesuai harapan. | UI | Valid |
| 10 | Alur normal | Kuesioner SUS | Mengisi 10 butir pernyataan lalu menyimpan. | Jawaban tersimpan; skor tampil pada rekap Head Barista. | Jawaban tersimpan dan skor tampil pada rekap. | UI | Valid |
| 11 | Alur normal | Grinder dial desimal | Grinder diatur satuan angka, 1 step = 0,1; shot 34 detik dan pahit pada setting 2,2. | Saran perkasar 0,2 (2,2 → 2,4). | Tampil +0,2 angka, 2,2 → 2,4. | UI + Unit | Valid |
| 12 | Alur normal | Ekspor data | Menekan Ekspor CSV pada menu Riwayat. | Berkas CSV (pemisah titik koma, koma desimal) dihasilkan. | Berkas CSV terunduh. | UI | Valid |
| 13 | Masukan tidak valid | Autentikasi | Mengosongkan email dan kata sandi, lalu menekan Masuk. | Pesan "Form tidak boleh kosong." | Pesan tampil; akses ditolak. | UI | Valid |
| 14 | Masukan tidak valid | Autentikasi | Memasukkan kata sandi yang salah. | Pesan "Email atau kata sandi salah." | Pesan tampil; tetap di halaman masuk. | UI | Valid |
| 15 | Masukan tidak valid | Validasi form kalibrasi | Menekan Analisis shot sebelum waktu dan rasa diisi. | Snackbar "Silakan lengkapi semua parameter kalibrasi (Waktu, Profil rasa)." dan perhitungan dibatalkan. | Sesuai harapan. | UI | Valid |
| 16 | Masukan tidak valid | Validasi form kalibrasi | Mengisi dose 0 lalu menekan Analisis shot. | Snackbar menyebut parameter Dose. | Sesuai harapan. | UI | Valid |
| 17 | Masukan tidak valid | Basis pengetahuan | Mengubah titik himpunan sehingga a > b. | Perubahan ditolak dengan pesan kesalahan. | Perubahan ditolak. | UI + Unit | Valid |
| 18 | Masukan tidak valid | Hak akses | Akun Barista membuka menu Head Barista. | Menu tidak tampil; halaman menampilkan "Khusus Head Barista". | Sesuai harapan. | UI | Valid |
| 19 | Tipe data | Form kalibrasi | Mengetik teks "abc" pada isian dose. | Masukan ditolak; nilai tetap 18 g. | Nilai tetap 18 g. | UI | Valid |
| 20 | Tipe data | Kuesioner SUS | Menyimpan jawaban yang baru terisi 9 butir. | Jawaban tidak tersimpan; muncul permintaan melengkapi. | Sesuai harapan. | UI | Valid |
| 21 | Nilai batas | Mesin inferensi | Dose 30 g, yield 80 g, waktu 5 detik, rasa Sangat Asam (di luar semesta). | Nilai dibatasi ke 24 g, 60 g, dan 10 detik; rekomendasi tetap keluar disertai peringatan. | Sesuai harapan. | UI + Unit | Valid |
| 22 | Nilai batas | Fungsi keanggotaan | Dose 14 g dan 24 g (bahu), 17 g, dan 19 g. | μ = 1; 1; 0,5; 0,5. | Sesuai harapan. | Unit | Valid |
| 23 | Nilai batas | Defuzzifikasi | 300 kombinasi masukan acak. | Centroid eksak (luas dan momen) sama dengan integrasi numerik (selisih < 0,001). | Selisih terbesar < 0,001. | Unit | Valid |
| 24 | Perangkat Android | Navigasi | Menekan tombol Kembali Android pada halaman hasil kalibrasi. | Kembali ke halaman sebelumnya tanpa aplikasi tertutup paksa (force close). | Kembali ke halaman sebelumnya; aplikasi tidak tertutup. | Perangkat | Valid |

Persentase kesesuaian fungsional = 24 / 24 × 100% = 100% (12 alur normal, 6 masukan tidak valid, 2 tipe data,
3 nilai batas, 1 perangkat Android). Skenario 24 (tombol Kembali Android) berasal dari uji perangkat yang dicatat
pada draf; ulangi dengan APK terbaru sebelum sidang.
