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
| **Kalibrasi** | Timer shot (tap Mulai/Stop), stepper besar untuk dose/yield/waktu, pemilih rasa (Sangat Asam … Sangat Pahit), setting grinder. Hasil: dial arah grinder, besar putaran & setting baru, *Catatan Head Barista*, dan **jejak perhitungan Mamdani** lengkap (fuzzifikasi → α-predikat → komposisi MAX → centroid). Setiap analisis tercatat sebagai shot dalam sesi dial-in. |
| **Resep** | Tampilan master-detail di tablet, pencarian & kategori, spesifikasi espresso + tombol "Kalibrasi shot ini", *Mode Seduh* layar penuh (checklist bahan, timer per langkah, layar tetap menyala). Head Barista dapat menambah/mengubah/menghapus resep. |
| **Riwayat** | Semua sesi kalibrasi, grafik waktu ekstraksi per shot, statistik sesi terkalibrasi, dan **agreement rate** — Head Barista menandai keputusannya sendiri per shot untuk mengukur kesesuaian sistem dengan pakar. Ekspor CSV. |
| **Pakar** | Basis pengetahuan: grafik fungsi keanggotaan + parameter (a, b, c, d) yang bisa diedit Head Barista dengan validasi, matriks 81 aturan yang bisa diubah per sel (untuk *member checking*), dan penjelasan metode. |
| **Pengaturan** | Profil & kata sandi, tema terang/gelap, konfigurasi grinder (satuan dial, skala step, resolusi, arah angka), manajemen akun barista, cadangan/pulihkan JSON. |

- **Peran**: *Head Barista* (kelola resep, basis pengetahuan, grinder, akun) dan *Barista*
  (resep, kalibrasi, riwayat). Saat pertama dibuka, aplikasi meminta pembuatan akun Head Barista.
- **Offline-first**: semua data tersimpan di perangkat (localStorage); versi web juga PWA sehingga bisa
  di-*install* dan jalan tanpa internet.
- Detail mesin fuzzy, 81 aturan, contoh perhitungan manual, dan pemetaan skenario black-box ada di
  **[docs/fuzzy-mamdani.md](docs/fuzzy-mamdani.md)**.

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
  pages/            Kalibrasi, Resep (+ editor, Mode Seduh), Riwayat, Pakar, Pengaturan, Login
  components/       komponen UI ramah sentuhan, grafik SVG (fungsi keanggotaan, dial grinder)
  lib/              autentikasi lokal (SHA-256 bersalt), ekspor berkas, statistik
android/            proyek Capacitor Android
docs/               dokumentasi Fuzzy Mamdani
```

Teknologi: React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Capacitor 8, Vitest.

## Catatan

- Akun bersifat **lokal per perangkat** (pembagian peran di tablet bersama), bukan sistem keamanan
  berbasis server. Pindahkan data antar-tablet lewat *Pengaturan → Cadangan (JSON)*.
- Basis pengetahuan bawaan adalah titik awal yang disusun dari praktik umum espresso; nilai akhir
  sebaiknya divalidasi bersama Head Barista di lokasi penelitian lalu disimpan lewat menu **Pakar**.
