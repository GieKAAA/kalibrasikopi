import { LogIn } from 'lucide-react';
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
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Brand />
          </div>
          {setup ? <SetupForm /> : <LoginForm />}
        </div>
      </div>
      <p className="safe-bottom px-6 pb-6 text-center text-sm text-muted">Data tersimpan di perangkat ini dan tetap berjalan tanpa internet.</p>
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
        <h2 className="text-2xl font-semibold tracking-tight">Masuk</h2>
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
        <h2 className="text-2xl font-semibold tracking-tight">Buat akun Head Barista</h2>
        <p className="mt-1 text-muted">
          Perangkat ini belum punya akun. Akun pertama menjadi Head Barista; akun barista lain ditambahkan dari menu Head Barista.
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
