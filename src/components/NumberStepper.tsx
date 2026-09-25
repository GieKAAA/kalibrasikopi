import { Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fmtFixed, parseDecimal } from '../lib/format';
import { cx } from './ui';

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  unit: string;
  decimals?: number;
  hint?: React.ReactNode;
  highlight?: boolean;
  size?: 'md' | 'lg';
}

const snap = (v: number, decimals: number) => Math.round(v * 10 ** decimals) / 10 ** decimals;

/** Input angka ramah sentuhan: tombol −/+ besar (tahan untuk mengulang), ketuk angka untuk mengetik. */
export function NumberStepper({ label, value, onChange, step, min, max, unit, decimals = 1, hint, highlight, size = 'lg' }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const valueRef = useRef(value);
  valueRef.current = value;
  const timer = useRef<{ t?: number; i?: number }>({});

  const bump = (dir: 1 | -1) => {
    const next = snap(Math.min(max, Math.max(min, valueRef.current + dir * step)), decimals);
    valueRef.current = next;
    onChange(next);
  };
  const stop = () => {
    window.clearTimeout(timer.current.t);
    window.clearInterval(timer.current.i);
  };
  const start = (dir: 1 | -1) => {
    stop();
    bump(dir);
    timer.current.t = window.setTimeout(() => {
      timer.current.i = window.setInterval(() => bump(dir), 70);
    }, 380);
  };
  useEffect(() => stop, []);

  const commit = () => {
    const v = parseDecimal(text);
    if (Number.isFinite(v)) onChange(snap(Math.min(max, Math.max(min, v)), decimals));
    setEditing(false);
  };

  const btn =
    'flex shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-ink transition active:scale-95 active:bg-line hover:bg-line/70 disabled:opacity-30';
  const btnSize = size === 'lg' ? 'size-12 sm:size-14' : 'size-12';
  const holdProps = (dir: 1 | -1) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      start(dir);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && bump(dir),
  });

  return (
    <div className={cx('flex items-center gap-1.5 rounded-2xl border bg-surface py-2 pr-2 pl-3 sm:gap-2 sm:pl-4', highlight ? 'border-brand ring-2 ring-brand/20' : 'border-line')}>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold">{label}</div>
        {hint && <div className="truncate text-xs text-muted">{hint}</div>}
      </div>
      <button type="button" aria-label={`Kurangi ${label}`} className={cx(btn, btnSize)} disabled={value <= min} {...holdProps(-1)}>
        <Minus className="size-6" strokeWidth={2.5} />
      </button>
      <div className="w-[6.5rem] shrink-0 text-center sm:w-36">
        {editing ? (
          <input
            autoFocus
            inputMode="decimal"
            aria-label={label}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="tabular h-14 w-full rounded-xl border border-brand bg-surface text-center text-3xl font-bold outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setText(String(value).replace('.', ','));
              setEditing(true);
            }}
            className="tabular h-14 w-full rounded-xl text-[26px] leading-none font-bold tracking-tight hover:bg-surface-2 sm:text-[32px]"
            aria-label={`${label} ${value} ${unit}, ketuk untuk mengetik`}
          >
            {fmtFixed(value, decimals)}
            <span className="ml-1 text-sm font-semibold text-muted">{unit}</span>
          </button>
        )}
      </div>
      <button type="button" aria-label={`Tambah ${label}`} className={cx(btn, btnSize)} disabled={value >= max} {...holdProps(1)}>
        <Plus className="size-6" strokeWidth={2.5} />
      </button>
    </div>
  );
}
