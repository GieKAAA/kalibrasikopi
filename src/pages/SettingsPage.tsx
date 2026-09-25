import { Download, KeyRound, LogOut, Monitor, Moon, Plus, Sun, Trash2, Upload, UserCog } from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge, Button, Card, ConfirmDialog, Field, IconButton, Modal, PageHeader, Segmented, SectionTitle, Select, Switch, TextInput } from '../components/ui';
import { DEFAULT_GRINDER, type GrinderConfig } from '../fuzzy/advice';
import { isValidEmail, verifyPassword } from '../lib/auth';
import { readTextFile, saveTextFile, stamp } from '../lib/files';
import { fmtDateTime, initials, parseDecimal } from '../lib/format';
import type { Role, User } from '../store/types';
import { exportBackup, useApp, useCurrentUser, useIsHead } from '../store/useApp';
import { sessionsToCsv } from './HistoryPage';

export function SettingsPage() {
  const isHead = useIsHead();
  return (
    <>
      <PageHeader title="Pengaturan" subtitle="Akun, grinder, tampilan, dan data perangkat" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <ProfileCard />
          <ThemeCard />
          <GrinderCard editable={isHead} />
        </div>
        <div className="space-y-4">
          {isHead && <UsersCard />}
          <DataCard isHead={isHead} />
          <AboutCard />
        </div>
      </div>
    </>
  );
}

function ProfileCard() {
  const user = useCurrentUser();
  const setCurrentUser = useApp((s) => s.setCurrentUser);
  const [pwOpen, setPwOpen] = useState(false);
  if (!user) return null;
  return (
    <Card>
      <SectionTitle>Profil</SectionTitle>
      <div className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-brand text-xl font-bold text-brand-ink">{initials(user.name)}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xl font-semibold">{user.name}</div>
          <div className="truncate text-muted">{user.email}</div>
          <Badge className="mt-1">{user.role === 'head' ? 'Head Barista' : 'Barista'}</Badge>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setPwOpen(true)}>
          <KeyRound className="size-5" /> Ubah kata sandi
        </Button>
        <Button variant="outline" onClick={() => setCurrentUser(null)}>
          <LogOut className="size-5" /> Keluar
        </Button>
      </div>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} user={user} />
    </Card>
  );
}

function ChangePasswordModal({ open, onClose, user }: { open: boolean; onClose: () => void; user: User }) {
  const setPassword = useApp((s) => s.setPassword);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setCurrent('');
    setNext('');
    setError(null);
    onClose();
  };
  const submit = () => {
    if (!verifyPassword(current, user.salt, user.passwordHash)) return setError('Kata sandi saat ini salah.');
    if (next.length < 6) return setError('Kata sandi baru minimal 6 karakter.');
    setPassword(user.id, next);
    close();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title="Ubah kata sandi"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Batal
          </Button>
          <Button onClick={submit}>Simpan</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Kata sandi saat ini">
          <TextInput type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label="Kata sandi baru" error={error}>
          <TextInput type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </Field>
      </div>
    </Modal>
  );
}

function ThemeCard() {
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  return (
    <Card>
      <SectionTitle>Tampilan</SectionTitle>
      <Segmented
        value={theme}
        onChange={setTheme}
        className="w-full"
        options={[
          { value: 'system', label: <span className="inline-flex items-center gap-2"><Monitor className="size-4" /> Sistem</span> },
          { value: 'light', label: <span className="inline-flex items-center gap-2"><Sun className="size-4" /> Terang</span> },
          { value: 'dark', label: <span className="inline-flex items-center gap-2"><Moon className="size-4" /> Gelap</span> },
        ]}
      />
      <p className="mt-2 text-sm text-muted">Mode gelap nyaman untuk bar dengan pencahayaan redup.</p>
    </Card>
  );
}

function GrinderCard({ editable }: { editable: boolean }) {
  const grinder = useApp((s) => s.grinder);
  const saveGrinder = useApp((s) => s.saveGrinder);
  const [g, setG] = useState<GrinderConfig>(grinder);
  const [unitsText, setUnitsText] = useState(String(grinder.unitsPerStep).replace('.', ','));
  const [saved, setSaved] = useState(false);
  const units = parseDecimal(unitsText);
  const valid = g.name.trim() !== '' && g.unitLabel.trim() !== '' && units > 0;
  const dirty = JSON.stringify({ ...g, unitsPerStep: units }) !== JSON.stringify(grinder);

  return (
    <Card>
      <SectionTitle>Grinder espresso</SectionTitle>
      <p className="mb-4 text-sm text-muted">
        Menerjemahkan keluaran fuzzy (step) ke angka pada dial grinder. Contoh: bila 1 step = 2 klik, rekomendasi 1,5 step menjadi 3 klik.
      </p>
      <fieldset disabled={!editable} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nama grinder">
          <TextInput value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} placeholder="mis. Mazzer Super Jolly" />
        </Field>
        <Field label="Satuan pada dial">
          <TextInput value={g.unitLabel} onChange={(e) => setG({ ...g, unitLabel: e.target.value })} placeholder="angka / klik / derajat" />
        </Field>
        <Field label="1 step fuzzy = … satuan" error={units > 0 ? null : 'Harus lebih dari 0'}>
          <TextInput inputMode="decimal" value={unitsText} onChange={(e) => setUnitsText(e.target.value)} />
        </Field>
        <Field label="Resolusi pembulatan">
          <Select value={String(g.resolution)} onChange={(e) => setG({ ...g, resolution: Number(e.target.value) })}>
            {[0.1, 0.25, 0.5, 1, 2].map((r) => (
              <option key={r} value={r}>
                {String(r).replace('.', ',')} {g.unitLabel}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 sm:col-span-2">
          <div>
            <div className="font-semibold">Angka lebih kecil = lebih halus</div>
            <div className="text-sm text-muted">Matikan bila dial grinder Anda berkebalikan.</div>
          </div>
          <Switch label="Angka lebih kecil = lebih halus" checked={g.finerIsLower} onChange={(v) => setG({ ...g, finerIsLower: v })} disabled={!editable} />
        </div>
      </fieldset>
      {editable && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            disabled={!valid || !dirty}
            onClick={() => {
              saveGrinder({ ...g, name: g.name.trim(), unitLabel: g.unitLabel.trim(), unitsPerStep: units });
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            }}
          >
            Simpan grinder
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setG(DEFAULT_GRINDER);
              setUnitsText(String(DEFAULT_GRINDER.unitsPerStep));
            }}
          >
            Bawaan
          </Button>
          {saved && <span className="text-sm font-semibold text-hold">Tersimpan ✓</span>}
        </div>
      )}
    </Card>
  );
}

function UsersCard() {
  const users = useApp((s) => s.users);
  const me = useCurrentUser();
  const removeUser = useApp((s) => s.removeUser);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const heads = users.filter((u) => u.role === 'head').length;

  return (
    <Card>
      <SectionTitle
        action={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Akun
          </Button>
        }
      >
        Akun barista
      </SectionTitle>
      <ul className="divide-y divide-line">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-3 py-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold">{initials(u.name)}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">
                {u.name} {u.id === me?.id && <span className="text-sm font-normal text-muted">(Anda)</span>}
              </div>
              <div className="truncate text-sm text-muted">{u.email}</div>
            </div>
            <Badge>{u.role === 'head' ? 'Head Barista' : 'Barista'}</Badge>
            <IconButton label={`Atur ulang kata sandi ${u.name}`} onClick={() => setResetting(u)}>
              <KeyRound className="size-5" />
            </IconButton>
            <IconButton
              label={`Hapus ${u.name}`}
              className="text-danger"
              disabled={u.id === me?.id || (u.role === 'head' && heads <= 1)}
              onClick={() => setDeleting(u)}
            >
              <Trash2 className="size-5" />
            </IconButton>
          </li>
        ))}
      </ul>
      <AddUserModal open={adding} onClose={() => setAdding(false)} />
      <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Hapus akun ${deleting?.name ?? ''}?`}
        message="Akun tidak bisa masuk lagi. Riwayat kalibrasi yang dibuat akun ini tetap tersimpan."
        onConfirm={() => deleting && removeUser(deleting.id)}
      />
    </Card>
  );
}

function AddUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const users = useApp((s) => s.users);
  const createUser = useApp((s) => s.createUser);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('barista');
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('barista');
    setError(null);
    onClose();
  };
  const submit = () => {
    if (!name.trim()) return setError('Nama wajib diisi.');
    if (!isValidEmail(email)) return setError('Format email tidak valid.');
    if (users.some((u) => u.email === email.trim().toLowerCase())) return setError('Email sudah terdaftar.');
    if (password.length < 6) return setError('Kata sandi minimal 6 karakter.');
    createUser({ name, email, password, role });
    close();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title="Tambah akun"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Batal
          </Button>
          <Button onClick={submit}>
            <UserCog className="size-5" /> Tambah
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nama">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Email">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Kata sandi awal">
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-medium">Peran</span>
          <Segmented
            value={role}
            onChange={setRole}
            className="w-full"
            options={[
              { value: 'barista', label: 'Barista' },
              { value: 'head', label: 'Head Barista' },
            ]}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const setPassword = useApp((s) => s.setPassword);
  const [pw, setPw] = useState('');
  const close = () => {
    setPw('');
    onClose();
  };
  return (
    <Modal
      open={user !== null}
      onClose={close}
      title={`Kata sandi baru untuk ${user?.name ?? ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Batal
          </Button>
          <Button
            disabled={pw.length < 6}
            onClick={() => {
              if (user) setPassword(user.id, pw);
              close();
            }}
          >
            Simpan
          </Button>
        </>
      }
    >
      <Field label="Kata sandi baru" hint="Minimal 6 karakter. Sampaikan langsung kepada barista yang bersangkutan.">
        <TextInput type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus />
      </Field>
    </Modal>
  );
}

function DataCard({ isHead }: { isHead: boolean }) {
  const importData = useApp((s) => s.importData);
  const resetAll = useApp((s) => s.resetAll);
  const sessions = useApp((s) => s.sessions);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<unknown>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <Card>
      <SectionTitle>Data &amp; cadangan</SectionTitle>
      <p className="mb-4 text-sm text-muted">
        Semua data (resep, basis pengetahuan, riwayat, akun) tersimpan di perangkat ini. Buat cadangan berkala untuk dipindahkan ke tablet lain.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => saveTextFile(`riwayat-kalibrasi-${stamp()}.csv`, sessionsToCsv(sessions.filter((s) => s.shots.length)), 'text/csv')}>
          <Download className="size-5" /> Riwayat (CSV)
        </Button>
        {isHead && (
          <>
            <Button variant="secondary" onClick={() => saveTextFile(`kalibrasikopi-cadangan-${stamp()}.json`, JSON.stringify(exportBackup(useApp.getState()), null, 2), 'application/json')}>
              <Download className="size-5" /> Cadangan (JSON)
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="size-5" /> Pulihkan cadangan
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  setPending(JSON.parse(await readTextFile(file)));
                } catch {
                  setMessage({ ok: false, text: 'Berkas tidak dapat dibaca sebagai JSON.' });
                }
              }}
            />
          </>
        )}
      </div>
      {message && <p className={`mt-3 text-sm font-semibold ${message.ok ? 'text-hold' : 'text-danger'}`}>{message.text}</p>}
      {isHead && (
        <div className="mt-5 border-t border-line pt-4">
          <Button variant="ghost" className="text-danger" onClick={() => setConfirmReset(true)}>
            <Trash2 className="size-5" /> Hapus semua data perangkat
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Pulihkan dari cadangan?"
        message="Data di perangkat ini (resep, basis pengetahuan, riwayat, akun) akan diganti isi cadangan."
        confirmLabel="Pulihkan"
        tone="primary"
        onConfirm={() => {
          try {
            importData(pending);
            setMessage({ ok: true, text: 'Cadangan berhasil dipulihkan.' });
          } catch (err) {
            setMessage({ ok: false, text: (err as Error).message });
          }
        }}
      />
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Hapus semua data?"
        message="Semua akun, resep buatan sendiri, riwayat, dan basis pengetahuan akan dihapus dari perangkat ini. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus semua"
        onConfirm={resetAll}
      />
    </Card>
  );
}

function AboutCard() {
  const kb = useApp((s) => s.kb);
  return (
    <Card>
      <SectionTitle>Tentang</SectionTitle>
      <p className="font-display text-xl font-semibold">Kalibrasi Kopi · Smart Assistant Digital Barista Handbook</p>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Buku resep digital dan asisten kalibrasi espresso. Mesin inferensi Logika Fuzzy Mamdani dengan 4 input (dose, yield, waktu ekstraksi, profil rasa),
        1 output (penyesuaian grind size), {kb.rules.length} aturan, dan defuzzifikasi centroid. Antarmuka dirancang dengan pendekatan User-Centered Design untuk
        tablet di meja bar.
      </p>
      <p className="mt-3 text-sm text-muted">Versi {__APP_VERSION__} · basis pengetahuan diperbarui {fmtDateTime(kb.updatedAt)}</p>
    </Card>
  );
}
