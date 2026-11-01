import { BookOpen, BrainCircuit, Gauge, LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Brand } from '../components/Logo';
import { Button, Field, TextInput } from '../components/ui';
import { isValidEmail, verifyPassword } from '../lib/auth';
import { useApp } from '../store/useApp';

/** Halaman masuk. Saat pertama kali dibuka (belum ada akun) berubah menjadi pembuatan akun Head Barista. */
export function AuthPage() {
  const users = useApp((s) => s.users);
  const setup = users.length === 0;
  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#2a1d15] p-12 text-[#f4ece3] lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -bottom-40 size-[560px] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #c27a2e 0%, transparent 65%)' }}
        />
        <div className="relative [--brand:#dca46b] [--brand-ink:#1a120d] [--muted:#c9b8a8]">
          <Brand />
        </div>
        <div className="relative max-w-lg">
          <h1 className="font-display text-5xl leading-[1.05] font-semibold">Setiap shot, terkalibrasi seperti di tangan Head Barista.</h1>
          <p className="mt-5 text-lg text-[#d8c8b8]">
            Asisten digital meja bar: buku resep standar dan kalibrasi espresso berbasis Logika Fuzzy Mamdani.
          </p>
          <ul className="mt-8 space-y-3 text-[#e9dccf]">
            <li className="flex items-center gap-3"><Gauge className="size-5 text-[#dca46b]" /> Rekomendasi grind size dari dose, yield, waktu &amp; rasa</li>
            <li className="flex items-center gap-3"><BookOpen className="size-5 text-[#dca46b]" /> Resep standar dengan Mode Seduh langkah demi langkah</li>
            <li className="flex items-center gap-3"><BrainCircuit className="size-5 text-[#dca46b]" /> Basis pengetahuan pakar yang transparan &amp; bisa divalidasi</li>
          </ul>
        </div>
        <p className="relative text-sm text-[#a8988a]">Data tersimpan di perangkat ini dan tetap berjalan tanpa internet.</p>
      </aside>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          {setup ? <SetupForm /> : <LoginForm />}
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const users = useApp((s) => s.users);
  const setCurrentUser = useApp((s) => s.setCurrentUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Form tidak boleh kosong.');
      return;
    }
    const user = users.find((u) => u.email === email.trim().toLowerCase());
    if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
      setError('Email atau kata sandi salah.');
      return;
    }
    window.location.hash = '#/';
    setCurrentUser(user.id);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div>
        <h2 className="font-display text-3xl font-semibold">Masuk</h2>
        <p className="mt-1 text-muted">Gunakan akun barista yang dibuat oleh Head Barista.</p>
      </div>
      <Field label="Email">
        <TextInput type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@kedai.id" />
      </Field>
      <Field label="Kata sandi" error={error}>
        <TextInput type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" size="lg" className="w-full">
        <LogIn className="size-5" /> Masuk
      </Button>
    </form>
  );
}

function SetupForm() {
  const createUser = useApp((s) => s.createUser);
  const setCurrentUser = useApp((s) => s.setCurrentUser);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirm) return setError('Form tidak boleh kosong.');
    if (!isValidEmail(email)) return setError('Format email tidak valid.');
    if (password.length < 6) return setError('Kata sandi minimal 6 karakter.');
    if (password !== confirm) return setError('Konfirmasi kata sandi tidak sama.');
    const user = createUser({ name, email, password, role: 'head' });
    window.location.hash = '#/';
    setCurrentUser(user.id);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <h2 className="font-display text-3xl font-semibold">Selamat datang</h2>
        <p className="mt-1 text-muted">
          Buat akun <b className="text-ink">Head Barista</b> untuk perangkat ini. Akun barista lain bisa ditambahkan di menu Pengaturan.
        </p>
      </div>
      <Field label="Nama lengkap">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Andi Head Barista" />
      </Field>
      <Field label="Email">
        <TextInput type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="head@kedai.id" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Kata sandi">
          <TextInput type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Ulangi kata sandi">
          <TextInput type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" size="lg" className="w-full">
        Buat akun &amp; mulai
      </Button>
    </form>
  );
}
