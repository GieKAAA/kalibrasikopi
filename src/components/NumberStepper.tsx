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
    'flex shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink transition active:bg-surface-2 hover:bg-surface-2 disabled:opacity-30';
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
    <div className="flex items-center gap-1.5 py-3 sm:gap-2">
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold">
          {label}
          {highlight && <span className="ml-2 text-xs font-medium text-crema">belum diisi</span>}
        </div>
        {hint && <div className="truncate text-sm text-muted">{hint}</div>}
      </div>
      <button type="button" aria-label={`Kurangi ${label}`} className={cx(btn, btnSize)} disabled={value <= min} {...holdProps(-1)}>
        <Minus className="size-5" strokeWidth={2.25} />
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
            className="readout h-14 w-full rounded-lg border border-ink bg-surface text-center text-3xl outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setText(String(value).replace('.', ','));
              setEditing(true);
            }}
            className={cx('readout h-14 w-full rounded-lg text-[26px] hover:bg-surface-2 sm:text-[30px]', highlight && 'text-muted')}
            aria-label={`${label} ${value} ${unit}, ketuk untuk mengetik`}
          >
            {fmtFixed(value, decimals)}
            <span className="ml-1 text-sm font-medium tracking-normal text-muted">{unit}</span>
          </button>
        )}
      </div>
      <button type="button" aria-label={`Tambah ${label}`} className={cx(btn, btnSize)} disabled={value >= max} {...holdProps(1)}>
        <Plus className="size-5" strokeWidth={2.25} />
      </button>
    </div>
  );
}
