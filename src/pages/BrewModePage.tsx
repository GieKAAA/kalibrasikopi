import { Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, cx, EmptyState } from '../components/ui';
import { fmtNum } from '../lib/format';
import { useApp } from '../store/useApp';

/** Mode Seduh: panduan langkah demi langkah layar penuh dengan timer per langkah. */
export function BrewModePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const recipe = useApp((s) => s.recipes.find((r) => r.id === id));
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Jaga layar tetap menyala selama Mode Seduh (bila didukung browser/WebView).
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => undefined);
    return () => void lock?.release().catch(() => undefined);
  }, []);

  if (!recipe) return <EmptyState icon={<X className="size-7" />} title="Resep tidak ditemukan" />;

  const step = recipe.steps[index];
  const last = index === recipe.steps.length - 1;
  const close = () => navigate(`/resep/${recipe.id}`);

  return (
    <div className="safe-top safe-bottom fixed inset-0 z-50 flex flex-col bg-bg">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3 md:px-8">
        <Button variant="ghost" onClick={close} aria-label="Tutup Mode Seduh">
          <X className="size-6" /> Tutup
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-lg font-semibold">{recipe.name}</div>
          <div className="text-sm text-muted">
            Langkah {index + 1} dari {recipe.steps.length}
          </div>
        </div>
        <div className="w-[104px]" />
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-r border-line p-6 lg:block">
          <h2 className="mb-3 text-base font-semibold">Siapkan bahan</h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => setChecked((c) => ({ ...c, [i.id]: !c[i.id] }))}
                  className={cx('flex w-full items-center gap-3 rounded-lg border p-3 text-left transition', checked[i.id] ? 'border-line bg-surface-2' : 'border-line bg-surface')}
                >
                  <span className={cx('flex size-6 shrink-0 items-center justify-center rounded-md border-2', checked[i.id] ? 'border-ink bg-ink text-bg' : 'border-line')}>
                    {checked[i.id] && <Check className="size-4" strokeWidth={3} />}
                  </span>
                  <span className={cx('min-w-0 flex-1 font-semibold', checked[i.id] && 'text-muted line-through')}>{i.name}</span>
                  <span className="tabular shrink-0 font-semibold">
                    {i.amount !== null ? fmtNum(i.amount, 2) : ''} {i.unit}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8 text-center md:px-16">
          <p className="max-w-3xl text-3xl leading-snug font-semibold tracking-tight md:text-4xl lg:text-[44px]">{step?.text}</p>
          {step?.durationSec ? <StepTimer key={step.id} seconds={step.durationSec} /> : null}
        </main>
      </div>

      <footer className="border-t border-line px-4 py-4 md:px-8">
        <div className="mb-4 flex justify-center gap-1.5">
          {recipe.steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Ke langkah ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cx('h-1.5 rounded-full transition-all', i === index ? 'w-8 bg-ink' : i < index ? 'w-4 bg-ink/40' : 'w-4 bg-line')}
            />
          ))}
        </div>
        <div className="mx-auto flex max-w-3xl gap-3">
          <Button variant="secondary" size="xl" className="flex-1" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            <ChevronLeft className="size-6" /> Sebelumnya
          </Button>
          {last ? (
            <Button size="xl" className="flex-1" onClick={close}>
              <Check className="size-6" /> Selesai
            </Button>
          ) : (
            <Button size="xl" className="flex-1" onClick={() => setIndex((i) => i + 1)}>
              Berikutnya <ChevronRight className="size-6" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

function StepTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      const left = Math.max(0, (endAt.current - performance.now()) / 1000);
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        navigator.vibrate?.([120, 80, 120]);
      }
    }, 100);
    return () => window.clearInterval(t);
  }, [running]);

  const mm = Math.floor(Math.ceil(remaining) / 60);
  const ss = Math.ceil(remaining) % 60;
  const done = remaining <= 0;

  return (
    <div className="mt-10 flex items-center gap-4">
      <div className={cx('readout text-6xl md:text-7xl', done && 'text-hold')}>
        {mm}:{String(ss).padStart(2, '0')}
      </div>
      <Button
        size="xl"
        variant={running ? 'secondary' : 'primary'}
        onClick={() => {
          if (running) setRunning(false);
          else {
            endAt.current = performance.now() + (done ? seconds : remaining) * 1000;
            if (done) setRemaining(seconds);
            setRunning(true);
          }
        }}
        aria-label={running ? 'Jeda timer' : 'Mulai timer'}
      >
        {running ? <Pause className="size-6" /> : <Play className="size-6" fill="currentColor" />}
      </Button>
      <Button size="xl" variant="ghost" aria-label="Ulangi timer" onClick={() => { setRunning(false); setRemaining(seconds); }}>
        <RotateCcw className="size-6" />
      </Button>
    </div>
  );
}
