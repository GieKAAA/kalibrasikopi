# Verifikasi defuzzifikasi (skenario black-box 23)

Pembanding independen untuk mesin inferensi Fuzzy Mamdani aplikasi. Skrip Python
ditulis ulang dari rumusan naskah (Tabel 4.2, Tabel 4.3, indeks aliran, offset dose)
tanpa memakai kode aplikasi, dan menghitung Center of Area dengan integrasi numerik
aturan trapesium (60.000 subinterval). Aplikasi memakai rumus luas dan momen eksak.

```bash
# 1. Keluaran aplikasi untuk 300 masukan acak (Park–Miller, benih 7) + 10 shot uji Tabel 4.7
npx rolldown scripts/verifikasi/ekspor-keluaran.ts --platform node --format esm --file /tmp/ekspor.mjs
node /tmp/ekspor.mjs /tmp/keluaran-aplikasi.json

# 2. Bandingkan dengan implementasi independen
python3 scripts/verifikasi/defuzzifikasi_independen.py /tmp/keluaran-aplikasi.json
```

Hasil pada 10 November 2026: selisih mutlak terbesar 5,72 × 10⁻⁹ pada 310 masukan
(ambang lulus 0,001); shot uji ke-9 menghasilkan z* = −1,4824 pada kedua implementasi.
Skrip keluar dengan kode 0 bila selisih terbesar di bawah 0,001.
