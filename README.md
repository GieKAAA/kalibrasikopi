# Kalibrasi Kopi — Smart Assistant Digital Barista Handbook

Aplikasi web responsif + APK Android (dioptimalkan untuk **tablet** di meja bar) yang menggabungkan:

1. **Kalibrasi espresso berbasis AI — Logika Fuzzy Mamdani.** Barista memasukkan *dose*, *yield*,
   waktu ekstraksi, dan profil rasa; sistem memberi rekomendasi arah & besar putaran grinder
   (lebih halus / tetap / lebih kasar) beserta catatan Head Barista.
2. **Buku resep digital** — takaran gramasi, urutan pembuatan (SOP), catatan penyajian, dan
   *Mode Seduh* langkah demi langkah dengan timer.

Dibangun mengikuti proposal *"Penerapan Logika Fuzzy Mamdani pada Smart Assistant Digital Barista
Handbook Menggunakan Pendekatan User-Centered Design (UCD)"*: 4 variabel input (dose, yield, waktu,
profil rasa), 1 variabel output (grind size), rule base IF–THEN, defuzzifikasi centroid (COA).

## Fitur

| Menu | Isi |
|---|---|
| **Beranda** | Setelah masuk: Modul 1 (Kalibrasi) dengan sesi berjalan, setting grinder sekarang, dan saran shot terakhir; Modul 2 (Resep) per kategori; tabel shot terakhir; daftar tugas Head Barista. |
| **Kalibrasi** | Timer shot, stepper dose/yield/waktu, pemilih rasa, setting grinder (mendukung dial berklik maupun berangka desimal, mis. 2,2). Hasil berisi saran dalam bahasa meja bar ("Perkasar Putaran Grinder", +2 klik, 12 → 14), alasan singkat (mis. "Shot terlalu lambat, rasa pahit"), status terkalibrasi, perbandingan dengan shot sebelumnya, dan Catatan Head Barista. Tanpa rumus di layar barista. |
| **Resep** | Daftar resep per kategori, spesifikasi espresso + tombol "Kalibrasi shot ini", SOP, dan *Mode Seduh* layar penuh. Head Barista dapat menambah/mengubah/menghapus resep. |
| **Riwayat** | Semua sesi, grafik waktu ekstraksi, kategori waktu, status shot, dan kesesuaian sistem dengan Head Barista. Head Barista mengisi keputusan sendiri (arah + jumlah klik) per shot dan dapat membuka **Lihat perhitungan** (jejak Fuzzy Mamdani lengkap) untuk verifikasi. Ekspor CSV. |
| **Head Barista** | Hanya untuk akun Head Barista: ringkasan penilaian shot, basis pengetahuan (himpunan fuzzy + 81 aturan, bisa diedit), kuesioner SUS (rekap & skor), konfigurasi grinder, akun barista, cadangan/pulihkan data. |
| **Pengaturan** | Profil & kata sandi, tema terang/gelap, tentang aplikasi. |

**Alur kalibrasi ulang.** Saran dihitung dari hasil cangkir (dose, yield, waktu, rasa), bukan dari angka grinder.
Setelah grinder diputar sesuai saran, tekan *Sudah diputar … lanjut shot berikutnya*: waktu dan rasa
dikosongkan dan barista menarik shot baru. Bila setting diubah langsung di stepper setelah hasil keluar,
aplikasi menjelaskan bahwa data rasa/waktu masih milik shot lama dan menawarkan lanjut ke shot berikutnya
(atau mengoreksi setting shot yang sama). Saran baru "Pertahankan" baru muncul setelah shot baru memang
seimbang dan masuk target waktu.

**Dial desimal (mis. Latina 2,2).** Di menu Head Barista → Grinder: satuan `angka`, 1 step = `0,1`,
resolusi `0,1`. Saran 2 step lalu tampil sebagai +0,2 (2,2 → 2,4).

- **Peran**: *Head Barista* (menu Head Barista: penilaian shot, basis pengetahuan, SUS, grinder, akun,
  cadangan data; juga kelola resep) dan *Barista* (resep, kalibrasi, riwayat, mengisi SUS). Saat pertama
  dibuka, aplikasi meminta pembuatan akun Head Barista.
- **Offline-first**: semua data tersimpan di perangkat (localStorage); versi web juga PWA sehingga bisa
  di-*install* dan jalan tanpa internet.
- Detail mesin fuzzy, 81 aturan, contoh perhitungan manual, dan pemetaan skenario black-box ada di
  **[docs/fuzzy-mamdani.md](docs/fuzzy-mamdani.md)**. Skenario black-box per teknik uji ada di
  **[docs/pengujian-blackbox.md](docs/pengujian-blackbox.md)**, dan sinkronisasi dengan komentar draf
  Revisi 2 di **[docs/sinkron-naskah-revisi-2.md](docs/sinkron-naskah-revisi-2.md)**.

## Menjalankan versi web

Butuh Node.js 22+.

```bash
npm install
npm run dev        # http://localhost:5173 — juga tampil alamat LAN untuk dibuka dari tablet
npm test           # unit test + skenario black-box mesin fuzzy
npm run build      # hasil statis di dist/ (bisa di-hosting di mana saja)
```

Untuk GitHub Pages: aktifkan *Settings → Pages → Source: GitHub Actions*, lalu jalankan workflow
**Deploy Web (GitHub Pages)** dari tab Actions.

## Membuat APK Android

**Otomatis (tanpa Android Studio):** setiap push menjalankan workflow **Build Web & APK**. Buka tab
*Actions* → run terbaru → unduh artifact **kalibrasi-kopi-apk** → pasang `kalibrasi-kopi-debug.apk`
di tablet (izinkan *instal dari sumber tidak dikenal*).

**Lokal dengan Android Studio** (JDK 21 + Android SDK 36):

```bash
npm run cap:sync          # build web lalu salin ke proyek android/
npm run android:open      # buka di Android Studio → Run / Build APK
# atau langsung:
cd android && ./gradlew assembleDebug   # → android/app/build/outputs/apk/debug/app-debug.apk
```

APK debug cukup untuk uji coba & pengujian SUS. Untuk rilis Play Store, buat keystore dan
gunakan *Build → Generate Signed Bundle/APK*.

## Struktur kode

```
src/
  fuzzy/            mesin inferensi Mamdani, basis pengetahuan bawaan, rekomendasi & catatan barista, tes
  store/            state aplikasi (zustand + persist), tipe data, resep bawaan
  pages/            Beranda, Kalibrasi, Resep (+ editor, Mode Seduh), Riwayat, Head Barista, Basis pengetahuan, SUS, Pengaturan, Login
  components/       komponen UI ramah sentuhan, grafik SVG (fungsi keanggotaan, skala arah grind), jejak perhitungan
  lib/              autentikasi lokal (SHA-256 bersalt), ekspor berkas, statistik
android/            proyek Capacitor Android
docs/               dokumentasi Fuzzy Mamdani
```

Teknologi: React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Capacitor 8, Vitest.

## Catatan

- Akun bersifat **lokal per perangkat** (pembagian peran di tablet bersama), bukan sistem keamanan
  berbasis server. Pindahkan data antar-tablet lewat *Head Barista → Data & cadangan (JSON)*.
- Basis pengetahuan bawaan adalah titik awal yang disusun dari praktik umum espresso; nilai akhir
  sebaiknya divalidasi bersama Head Barista di lokasi penelitian lalu disimpan lewat menu **Head Barista → Basis pengetahuan**.
