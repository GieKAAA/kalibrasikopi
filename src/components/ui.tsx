import { X } from 'lucide-react';
import { Link, type LinkProps } from 'react-router-dom';
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-ink hover:brightness-110 active:brightness-95 shadow-sm',
  secondary: 'bg-surface-2 text-ink hover:bg-line/70 active:bg-line',
  outline: 'border border-line bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-ink hover:bg-surface-2 active:bg-line/60',
  danger: 'bg-danger text-white hover:brightness-110',
};
const sizes: Record<Size, string> = {
  sm: 'h-10 px-3 text-sm gap-1.5 rounded-xl',
  md: 'h-12 px-4 text-[15px] gap-2 rounded-xl',
  lg: 'h-14 px-5 text-base gap-2 rounded-2xl',
  xl: 'h-16 px-6 text-lg gap-3 rounded-2xl',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cx(
    'inline-flex shrink-0 items-center justify-center font-semibold transition select-none disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" {...props} className={buttonClass(variant, size, className)} />;
}

export function LinkButton({ variant = 'primary', size = 'md', className, ...props }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={cx(
        'inline-flex size-12 shrink-0 items-center justify-center rounded-xl text-ink transition hover:bg-surface-2 active:bg-line/60 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('rounded-3xl border border-line bg-surface p-4 shadow-[0_1px_0_rgb(0_0_0/0.03)] sm:p-5', className)}>{children}</section>;
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-sm text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

const inputCls =
  'w-full h-12 rounded-xl border border-line bg-surface px-3.5 text-base text-ink placeholder:text-muted/70 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25';

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, className)} />;
}

export function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputCls, 'h-auto min-h-24 py-3 leading-relaxed', className)} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(inputCls, 'appearance-none pr-8', className)}>
      {children}
    </select>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="tablist" className={cx('inline-flex rounded-2xl bg-surface-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 whitespace-nowrap rounded-xl font-semibold transition',
            size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4 text-[15px]',
            o.value === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-40',
        checked ? 'bg-brand' : 'bg-line',
      )}
    >
      <span className={cx('absolute top-1 size-6 rounded-full bg-surface shadow transition-all', checked ? 'left-7' : 'left-1')} />
    </button>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        // Warna bawaan hanya bila pemanggil tidak memberi warna sendiri (menghindari bentrok kelas).
        !/(^|\s)bg-/.test(className ?? '') && 'bg-surface-2',
        !/(^|\s)text-(?!xs|sm|base)/.test(className ?? '') && 'text-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cx(
          'safe-bottom flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <IconButton label="Tutup" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Hapus',
  onConfirm,
  onClose,
  tone = 'danger',
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  tone?: 'danger' | 'primary';
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant={tone}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[15px] leading-relaxed text-muted">{message}</div>
    </Modal>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-line px-6 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-surface-2 text-muted">{icon}</div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {children && <p className="max-w-md text-muted">{children}</p>}
      {action}
    </div>
  );
}

/** Pesan singkat di bagian bawah layar yang hilang sendiri setelah beberapa detik. */
export function Snackbar({ message, onClose, tone = 'warn' }: { message: string | null; onClose: () => void; tone?: 'warn' | 'success' }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => closeRef.current(), 3500);
    return () => window.clearTimeout(t);
  }, [message]);
  if (!message) return null;
  return (
    <div role="status" aria-live="polite" className="safe-bottom pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 md:bottom-6">
      <div
        className={cx(
          'pointer-events-auto flex max-w-lg items-center gap-3 rounded-2xl px-5 py-3.5 text-[15px] font-semibold text-white shadow-2xl',
          tone === 'warn' ? 'bg-[#3a2416]' : 'bg-hold',
        )}
      >
        {message}
        <button type="button" onClick={onClose} className="ml-2 rounded-lg px-2 py-1 text-sm text-white/80 hover:bg-white/10">
          Tutup
        </button>
      </div>
    </div>
  );
}
