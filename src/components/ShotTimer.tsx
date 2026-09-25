import { Play, RotateCcw, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fmtFixed } from '../lib/format';
import { cx } from './ui';

/** Timer shot: ketuk MULAI saat pompa menyala, STOP saat target yield tercapai. */
export function ShotTimer({ onStop, targetRange }: { onStop: (seconds: number) => void; targetRange?: [number, number] }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      setElapsed((performance.now() - startRef.current) / 1000);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [running]);

  const vibrate = (ms: number) => {
    if ('vibrate' in navigator) navigator.vibrate?.(ms);
  };

  const toggle = () => {
    if (running) {
      const secs = Math.round(((performance.now() - startRef.current) / 1000) * 10) / 10;
      setRunning(false);
      setElapsed(secs);
      onStop(secs);
      vibrate(30);
    } else {
      startRef.current = performance.now();
      setElapsed(0);
      setRunning(true);
      vibrate(20);
    }
  };

  const inWindow = targetRange && elapsed >= targetRange[0] && elapsed <= targetRange[1];
  const over = targetRange && elapsed > targetRange[1];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2/60 p-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={running ? 'Stop timer' : 'Mulai timer'}
        className={cx(
          'flex h-20 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl text-sm font-bold uppercase tracking-wide transition active:scale-95',
          running ? 'timer-running bg-danger text-white' : 'bg-brand text-brand-ink',
        )}
      >
        {running ? <Square className="size-7" fill="currentColor" /> : <Play className="size-7" fill="currentColor" />}
        {running ? 'Stop' : 'Mulai'}
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Timer ekstraksi</div>
        <div
          className={cx(
            'tabular text-5xl leading-none font-bold tracking-tight',
            running && inWindow && 'text-hold',
            running && over && 'text-danger',
          )}
        >
          {fmtFixed(elapsed, 1)}
          <span className="ml-1 text-xl text-muted">s</span>
        </div>
        {targetRange && (
          <div className="mt-1 text-xs text-muted">
            Target {targetRange[0]}–{targetRange[1]} detik
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Reset timer"
        disabled={running || elapsed === 0}
        onClick={() => setElapsed(0)}
        className="flex size-12 items-center justify-center rounded-xl text-muted hover:bg-surface disabled:opacity-30"
      >
        <RotateCcw className="size-5" />
      </button>
    </div>
  );
}
