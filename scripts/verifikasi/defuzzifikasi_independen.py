"""Pembanding independen mesin inferensi Fuzzy Mamdani (skenario black-box 23).

Implementasi ini ditulis ulang dari rumusan pada naskah (Tabel 4.2 parameter
fungsi keanggotaan, Tabel 4.3 matriks keputusan pakar, rumus indeks aliran, dan
offset dose), tanpa memakai kode aplikasi. Defuzzifikasi Center of Area dihitung
dengan integrasi numerik aturan trapesium (60.000 subinterval pada semesta
keluaran −3 sampai 3), bukan dengan rumus luas dan momen eksak seperti aplikasi.

    python3 scripts/verifikasi/defuzzifikasi_independen.py keluaran-aplikasi.json

Berkas JSON dihasilkan oleh ekspor-keluaran.ts dan memuat masukan beserta z*
keluaran aplikasi. Skrip melaporkan selisih mutlak terbesar.
"""
import json
import sys

# Tabel 4.2 — (a, b, c, d) dan semesta tiap variabel.
MASUKAN = {
    'dose': ((14, 24), {'rendah': (14, 14, 16.5, 17.5), 'normal': (16.5, 17.5, 18.5, 19.5), 'tinggi': (18.5, 19.5, 24, 24)}),
    'yield': ((20, 60), {'sedikit': (20, 20, 30, 34), 'normal': (30, 34, 38, 42), 'banyak': (38, 42, 60, 60)}),
    'time': ((10, 50), {'cepat': (10, 10, 22, 25), 'normal': (22, 25, 30, 33), 'lambat': (30, 33, 50, 50)}),
    'taste': ((-5, 5), {'asam': (-5, -5, -3, 0), 'seimbang': (-2, 0, 0, 2), 'pahit': (0, 3, 5, 5)}),
}
KELUARAN = {'JLH': (-3, -3, -2, -1), 'LH': (-2, -1, -1, 0), 'T': (-1, 0, 0, 1), 'LK': (0, 1, 1, 2), 'JLK': (1, 2, 3, 3)}
LEVEL = {'rendah': -1, 'sedikit': -1, 'cepat': -1, 'normal': 0, 'tinggi': 1, 'banyak': 1, 'lambat': 1}
# Tabel 4.3 — baris rasa, kolom indeks aliran −2 … +2.
MATRIKS = {'asam': ['JLH', 'JLH', 'LH', 'T', 'T'], 'seimbang': ['LH', 'T', 'T', 'T', 'LK'], 'pahit': ['T', 'T', 'LK', 'JLK', 'JLK']}


def mu(x, p):
    a, b, c, d = p
    if x < a or x > d:
        return 0.0
    if b <= x <= c:
        return 1.0
    return (x - a) / (b - a) if x < b else (d - x) / (d - c)


def konsekuen(dose, yld, waktu, rasa):
    f = LEVEL[waktu] - LEVEL[yld]                 # indeks aliran = level waktu − level yield
    d = LEVEL[dose]
    if d != 0 and f != 0 and (d > 0) == (f > 0):  # dose searah aliran → koreksi dikurangi satu tingkat
        f -= 1 if f > 0 else -1
    return MATRIKS[rasa][f + 2]


ATURAN = [((d, y, t, r), konsekuen(d, y, t, r))
          for d in MASUKAN['dose'][1] for y in MASUKAN['yield'][1]
          for t in MASUKAN['time'][1] for r in MASUKAN['taste'][1]]
assert len(ATURAN) == 81


def inferensi(x):
    deraj = {}
    for k, ((lo, hi), himp) in MASUKAN.items():
        v = min(hi, max(lo, x[k]))                # nilai di luar semesta dibatasi
        deraj[k] = {h: mu(v, p) for h, p in himp.items()}
    potong = {h: 0.0 for h in KELUARAN}
    for (d, y, t, r), out in ATURAN:
        alfa = min(deraj['dose'][d], deraj['yield'][y], deraj['time'][t], deraj['taste'][r])  # operator MIN
        potong[out] = max(potong[out], alfa)                                                   # komposisi MAX
    aktif = [(potong[h], p) for h, p in KELUARAN.items() if potong[h] > 0]
    n, lo, hi = 60000, -3.0, 3.0
    h = (hi - lo) / n
    luas = momen = 0.0
    for i in range(n + 1):
        z = lo + i * h
        m = 0.0
        for a, p in aktif:
            v = mu(z, p)
            if v > a:
                v = a
            if v > m:
                m = v
        w = 0.5 if i in (0, n) else 1.0
        luas += w * m
        momen += w * z * m
    return momen / luas if luas > 0 else None


def main(path):
    baris = json.load(open(path, encoding='utf-8'))
    terbesar, contoh = 0.0, None
    for b in baris:
        z = inferensi(b)
        s = abs(z - b['z'])
        if s > terbesar:
            terbesar, contoh = s, b['sumber']
    acak = [b for b in baris if b['sumber'].startswith('acak')]
    print('baris diuji      :', len(baris), '(acak: %d)' % len(acak))
    print('selisih terbesar : %.2e (pada %s)' % (terbesar, contoh))
    for b in baris:
        if b['sumber'] in ('shot-4', 'shot-6', 'shot-9'):
            print('%-7s z* aplikasi = %.4f, z* independen = %.4f' % (b['sumber'], b['z'], inferensi(b)))
    return terbesar


if __name__ == '__main__':
    sys.exit(0 if main(sys.argv[1] if len(sys.argv) > 1 else 'keluaran-aplikasi.json') < 1e-3 else 1)
