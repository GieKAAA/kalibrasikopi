import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleDashed,
  Coffee,
  Info,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { directionColor } from '../components/charts/colors';
import { GrindGauge } from '../components/charts/GrindGauge';
import { FuzzyTrace } from '../components/FuzzyTrace';
import { NumberStepper } from '../components/NumberStepper';
import { ShotTimer } from '../components/ShotTimer';
import { TasteSelector } from '../components/TasteSelector';
import { Badge, Button, Card, ConfirmDialog, cx, Field, Modal, PageHeader, SectionTitle, Snackbar, TextInput } from '../components/ui';
import {
  baristaNotes,
  calibrationStatus,
  CALIBRATED_CRITERIA,
  normalTarget,
  recommend,
  shotMetrics,
  tasteLabel,
  timeCategory,
  type BaristaNote,
  type TimeCategory,
  type Recommendation,
} from '../fuzzy/advice';
import { infer } from '../fuzzy/engine';
import type { CrispInputs, InferenceResult } from '../fuzzy/types';
import { uid } from '../lib/auth';
import { isDialedIn } from '../lib/stats';
import { fmtFixed, fmtMath, fmtNum, fmtTime } from '../lib/format';
import type { CalibrationSession, Shot } from '../store/types';
import { useApp } from '../store/useApp';

interface Analysis {
  shotId: string;
  inputs: CrispInputs;
  grindSetting: number | null;
  result: InferenceResult;
  rec: Recommendation | null;
  notes: BaristaNote[];
  status: { calibrated: boolean; unmet: string[] };
  timeCat: TimeCategory;
}

export function CalibrationPage() {
  const kb = useApp((s) => s.kb);
  const grinder = useApp((s) => s.grinder);
  const draft = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const sessions = useApp((s) => s.sessions);
  const activeSessionId = useApp((s) => s.activeSessionId);
  const startSession = useApp((s) => s.startSession);
  const upsertShot = useApp((s) => s.upsertShot);
  const finishSession = useApp((s) => s.finishSession);
  const session = sessions.find((s) => s.id === activeSessionId) ?? null;

  const run = (inputs: CrispInputs, grindSetting: number | null, shotId: string): Analysis => {
    const result = infer(kb, inputs);
    const rec = recommend(result, grinder, grindSetting);
    return {
      shotId,
      inputs,
      grindSetting,
      result,
      rec,
      notes: baristaNotes(kb, inputs, result, rec),
      status: calibrationStatus(result, rec),
      timeCat: timeCategory(result),
    };
  };

  // Pulihkan hasil analisis terakhir bila shot belum "diterapkan" (mis. setelah pindah tab).
  const [analysis, setAnalysis] = useState<Analysis | null>(() => {
    const last = session?.shots.at(-1);
    if (!last || draft.taste === null) return null;
    if (last.dose !== draft.dose || last.yield !== draft.yield || last.time !== draft.time || last.taste !== draft.taste) return null;
    return run({ dose: last.dose, yield: last.yield, time: last.time, taste: last.taste }, last.grindSetting, last.id);
  });
  const [showTrace, setShowTrace] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);

  const timeTarget = normalTarget(kb, 'time');
  const doseTarget = normalTarget(kb, 'dose');
  const yieldTarget = normalTarget(kb, 'yield');
  const metrics = shotMetrics(draft.dose, draft.yield, draft.time);
  const missing = [
    draft.dose <= 0 && 'Dose',
    draft.yield <= 0 && 'Yield',
    draft.time <= 0 && 'Waktu',
    draft.taste === null && 'Profil rasa',
  ].filter(Boolean) as string[];
  const [snack, setSnack] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const stale =
    analysis !== null &&
    (analysis.inputs.dose !== draft.dose ||
      analysis.inputs.yield !== draft.yield ||
      analysis.inputs.time !== draft.time ||
      analysis.inputs.taste !== draft.taste ||
      analysis.grindSetting !== draft.grindSetting);

  const analyze = () => {
    if (missing.length || draft.taste === null) {
      setSnack(`Silakan lengkapi semua parameter kalibrasi (${missing.join(', ')}).`);
      return;
    }
    if (!session) {
      const lastBean = sessions[0]?.beanName ?? 'House Blend';
      startSession(lastBean);
    }
    const inputs: CrispInputs = { dose: draft.dose, yield: draft.yield, time: draft.time, taste: draft.taste };
    // Analisis ulang sebelum "Terapkan" menimpa shot yang sama, bukan menambah shot baru.
    const shotId = analysis?.shotId ?? uid();
    const a = run(inputs, draft.grindSetting, shotId);
    setAnalysis(a);
    if (window.matchMedia('(max-width: 1023px)').matches)
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    const shot: Shot = {
      id: shotId,
      createdAt: new Date().toISOString(),
      ...inputs,
      grindSetting: draft.grindSetting,
      crisp: a.result.crisp,
      direction: a.rec?.direction ?? null,
      amount: a.rec?.amount ?? 0,
      termLabel: a.rec?.termLabel ?? '-',
      newSetting: a.rec?.newSetting ?? null,
      topRules: a.result.fired.slice(0, 3).map((f) => ({ id: f.rule.id, alpha: f.alpha })),
      timeCategory: a.timeCat,
      calibrated: a.status.calibrated,
    };
    upsertShot(shot);
  };

  const applyAndNext = () => {
    setDraft({ time: 0, taste: null, grindSetting: analysis?.rec?.newSetting ?? draft.grindSetting });
    setAnalysis(null);
    setShowTrace(false);
    document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const shotNo = (session?.shots.length ?? 0) + (analysis && !stale ? 0 : 1);

  return (
    <>
      <PageHeader
        title="Kalibrasi Espresso"
        subtitle="Smart Assistant · Logika Fuzzy Mamdani"
        actions={
          session ? (
            <>
              <Button variant="outline" onClick={() => setFinishOpen(true)}>
                <CheckCircle2 className="size-5" /> Selesai sesi
              </Button>
              <Button variant="secondary" onClick={() => setNewSessionOpen(true)}>
                <Plus className="size-5" /> Sesi baru
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setNewSessionOpen(true)}>
              <Plus className="size-5" /> Mulai sesi
            </Button>
          )
        }
      />

      <SessionBar session={session} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* ── Kolom input ── */}
        <div className="scroll-mt-4 space-y-4" ref={formRef}>
          <Card className="space-y-3">
            <SectionTitle action={<Badge>Shot #{shotNo}</Badge>}>Parameter shot</SectionTitle>
            <ShotTimer targetRange={[timeTarget.low, timeTarget.high]} onStop={(s) => setDraft({ time: s })} />
            <NumberStepper
              label="Dose"
              hint={`Standar ${fmtNum(doseTarget.mid)} g`}
              value={draft.dose}
              onChange={(v) => setDraft({ dose: v })}
              step={0.1}
              min={0}
              max={30}
              unit="g"
              highlight={draft.dose <= 0}
            />
            <NumberStepper
              label="Yield"
              hint={`Target ${fmtNum(yieldTarget.mid)} g`}
              value={draft.yield}
              onChange={(v) => setDraft({ yield: v })}
              step={0.5}
              min={0}
              max={100}
              unit="g"
              highlight={draft.yield <= 0}
            />
            <NumberStepper
              label="Waktu"
              hint={`Standar ${fmtNum(timeTarget.low, 0)}–${fmtNum(timeTarget.high, 0)} dtk`}
              value={draft.time}
              onChange={(v) => setDraft({ time: v })}
              step={1}
              min={0}
              max={120}
              unit="s"
              highlight={draft.time === 0}
            />
            <div className="flex flex-wrap gap-2 px-1 text-sm">
              <Badge>Rasio 1:{fmtFixed(metrics.ratio, 1)}</Badge>
              <Badge>Aliran {draft.time > 0 ? fmtFixed(metrics.flowRate, 2) : '–'} g/s</Badge>
            </div>
            <TasteSelector value={draft.taste} onChange={(v) => setDraft({ taste: v })} />
            {draft.grindSetting === null ? (
              <button
                type="button"
                onClick={() => setDraft({ grindSetting: 10 })}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-semibold text-muted hover:border-brand hover:text-ink"
              >
                <Plus className="size-4" /> Catat setting {grinder.name} (opsional)
              </button>
            ) : (
              <div className="relative">
                <NumberStepper
                  label="Setting grinder"
                  hint={`${grinder.name} · ${grinder.finerIsLower ? 'kecil = halus' : 'besar = halus'}`}
                  value={draft.grindSetting}
                  onChange={(v) => setDraft({ grindSetting: v })}
                  step={grinder.resolution || 0.5}
                  min={-999}
                  max={999}
                  unit={grinder.unitLabel}
                  decimals={2}
                />
                <button
                  type="button"
                  aria-label="Hapus setting grinder"
                  onClick={() => setDraft({ grindSetting: null })}
                  className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            <Button size="xl" className="w-full" onClick={analyze}>
              {stale ? <RefreshCw className="size-6" /> : <BrainCircuit className="size-6" />}
              {stale ? 'Analisis ulang' : 'Analisis shot'}
            </Button>
            {missing.length > 0 && <p className="text-center text-sm text-muted">Belum diisi: {missing.join(', ')}</p>}
          </Card>
        </div>

        {/* ── Kolom hasil ── */}
        <div className="scroll-mt-4 space-y-4" ref={resultRef}>
          {analysis ? (
            <>
              <ResultCard
                analysis={analysis}
                stale={stale}
                onApply={applyAndNext}
                onBack={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                unitLabel={grinder.unitLabel}
              />
              <NotesCard notes={analysis.notes} />
            </>
          ) : (
            <GuideCard />
          )}
          {session && session.shots.length > 0 && <SessionShots session={session} unitLabel={grinder.unitLabel} />}
        </div>
      </div>

      {analysis && (
        <Card className="mt-6">
          <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setShowTrace((v) => !v)} aria-expanded={showTrace}>
            <div>
              <div className="font-display text-xl font-semibold">Perhitungan Fuzzy Mamdani</div>
              <div className="text-sm text-muted">Fuzzifikasi → evaluasi aturan → komposisi → defuzzifikasi centroid → interpretasi</div>
            </div>
            <ChevronDown className={cx('size-6 shrink-0 transition', showTrace && 'rotate-180')} />
          </button>
          {showTrace && (
            <div className="mt-5">
              <FuzzyTrace kb={kb} result={analysis.result} rec={analysis.rec} grinder={grinder} />
            </div>
          )}
        </Card>
      )}

      <Snackbar message={snack} onClose={() => setSnack(null)} />
      <NewSessionModal open={newSessionOpen} onClose={() => setNewSessionOpen(false)} onStarted={() => setAnalysis(null)} />
      <ConfirmDialog
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Selesaikan sesi kalibrasi?"
        message="Sesi dan seluruh shot akan disimpan di Riwayat. Setting grinder terakhir tetap diingat untuk sesi berikutnya."
        confirmLabel="Selesai & simpan"
        tone="primary"
        onConfirm={() => {
          finishSession();
          setAnalysis(null);
        }}
      />
    </>
  );
}

function SessionBar({ session }: { session: CalibrationSession | null }) {
  const renameSession = useApp((s) => s.renameSession);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  if (!session)
    return (
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">
        <Info className="size-5 shrink-0" />
        Belum ada sesi aktif. Sesi otomatis dimulai saat analisis pertama — atau tekan <b className="text-ink">Mulai sesi</b> untuk mengisi nama biji.
      </div>
    );
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-brand-soft/70 px-4 py-3">
      <Coffee className="size-5 text-brand" />
      {editing ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) renameSession(session.id, name.trim());
            setEditing(false);
          }}
        >
          <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-10 w-56" aria-label="Nama biji" />
          <Button size="sm" type="submit">
            Simpan
          </Button>
        </form>
      ) : (
        <button
          type="button"
          className="font-semibold underline decoration-dotted underline-offset-4"
          onClick={() => {
            setName(session.beanName);
            setEditing(true);
          }}
        >
          {session.beanName}
        </button>
      )}
      <span className="text-sm text-muted">
        {session.shots.length} shot · mulai {fmtTime(session.startedAt)} · {session.baristaName}
      </span>
    </div>
  );
}

function ResultCard({
  analysis,
  stale,
  onApply,
  onBack,
  unitLabel,
}: {
  analysis: Analysis;
  stale: boolean;
  onApply: () => void;
  onBack: () => void;
  unitLabel: string;
}) {
  const { rec, result } = analysis;
  if (!rec)
    return (
      <Card>
        <p className="font-semibold">Tidak ada aturan yang aktif untuk kombinasi input ini.</p>
        <p className="mt-1 text-sm text-muted">Periksa himpunan fuzzy dan rule base di menu Pakar.</p>
      </Card>
    );
  const color = directionColor(rec.direction);
  return (
    <Card className={cx('relative overflow-hidden', stale && 'opacity-60')}>
      <div aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: color }} />
      {stale && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-warn/15 px-3 py-2 text-sm font-semibold text-warn">
          <CircleAlert className="size-4" /> Input berubah — tekan Analisis ulang
        </div>
      )}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="w-full max-w-[280px] shrink-0">
          <GrindGauge value={rec.crisp} />
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase sm:justify-start">
            <Sparkles className="size-4" /> Rekomendasi Smart Assistant
          </div>
          <h2 className="mt-1 font-display text-3xl leading-tight font-semibold md:text-[34px]" style={{ color }}>
            {rec.headline}
          </h2>
          {rec.direction !== 'tetap' ? (
            <p className="mt-2 text-lg">
              Sebanyak <b className="tabular">{fmtNum(rec.amount, 2)} {unitLabel}</b> ke arah {rec.direction} (z* = {fmtMath(rec.crisp, 2)})
            </p>
          ) : (
            <p className="mt-2 text-lg">Tidak perlu memutar grinder (z* = {fmtMath(rec.crisp, 2)}).</p>
          )}
          {analysis.grindSetting !== null && rec.newSetting !== null && (
            <div className="mt-3 inline-flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-2">
              <span className="tabular text-2xl font-bold text-muted">{fmtNum(analysis.grindSetting, 2)}</span>
              <ArrowRight className="size-5 text-muted" />
              <span className="tabular text-3xl font-bold" style={{ color }}>
                {fmtNum(rec.newSetting, 2)}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
        <Badge>
          Himpunan: {rec.termLabel} (μ {fmtNum(rec.termDegree, 2)})
        </Badge>
        <Badge className="tabular">z* = {fmtNum(rec.crisp, 2)} step</Badge>
        <Badge>{result.fired.length} aturan aktif</Badge>
        <Badge>Rasa: {tasteLabel(analysis.inputs.taste)}</Badge>
        <Badge className="tabular">
          Waktu {fmtMath(analysis.inputs.time, 1)} s ({analysis.timeCat})
        </Badge>
      </div>
      <div
        className={cx('mt-4 flex gap-3 rounded-2xl p-3.5', analysis.status.calibrated ? 'bg-hold/10' : 'bg-surface-2')}
        title={CALIBRATED_CRITERIA}
      >
        {analysis.status.calibrated ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-hold" /> : <CircleDashed className="mt-0.5 size-5 shrink-0 text-muted" />}
        <div className="text-sm">
          <div className="font-semibold">{analysis.status.calibrated ? 'Status shot: Terkalibrasi' : 'Status shot: Belum terkalibrasi'}</div>
          <div className="text-muted">
            {analysis.status.calibrated ? 'Rekomendasi Tetap, rasa Seimbang, dan waktu Normal.' : `Karena ${analysis.status.unmet.join('; ')}.`}
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button size="lg" variant="secondary" onClick={onBack}>
          <ArrowLeft className="size-5" /> Kembali ke input
        </Button>
        <Button size="lg" className="flex-1" onClick={onApply} disabled={stale}>
          {rec.direction === 'tetap' ? 'Catat & tarik shot berikutnya' : 'Terapkan & tarik shot berikutnya'} <ArrowRight className="size-5" />
        </Button>
      </div>
    </Card>
  );
}

const NOTE_STYLE = {
  success: { icon: CheckCircle2, cls: 'text-hold', bg: 'bg-hold/10' },
  warn: { icon: CircleAlert, cls: 'text-warn', bg: 'bg-warn/10' },
  info: { icon: Info, cls: 'text-fine', bg: 'bg-fine/10' },
};

function NotesCard({ notes }: { notes: BaristaNote[] }) {
  if (!notes.length) return null;
  return (
    <Card>
      <SectionTitle>Catatan Head Barista</SectionTitle>
      <ul className="space-y-2.5">
        {notes.map((n) => {
          const s = NOTE_STYLE[n.tone];
          const Icon = s.icon;
          return (
            <li key={n.title} className={cx('flex gap-3 rounded-2xl p-3.5', s.bg)}>
              <Icon className={cx('mt-0.5 size-5 shrink-0', s.cls)} />
              <div>
                <div className="font-semibold">{n.title}</div>
                <p className="mt-0.5 text-[15px] leading-relaxed text-muted">{n.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function GuideCard() {
  const steps = [
    ['Tarik shot', 'Tekan MULAI saat pompa menyala, STOP saat yield tercapai.'],
    ['Timbang', 'Pastikan dose dan yield sesuai hasil timbangan.'],
    ['Cicipi', 'Pilih profil rasa: asam, seimbang, atau pahit — seberapa kuat.'],
    ['Analisis', 'Smart Assistant menghitung arah & besar putaran grinder.'],
  ];
  return (
    <Card className="bg-gradient-to-br from-surface to-brand-soft/50">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-brand text-brand-ink">
          <BrainCircuit className="size-6" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold">Siap mengkalibrasi</h2>
          <p className="text-sm text-muted">Empat langkah, satu shot dalam satu waktu.</p>
        </div>
      </div>
      <ol className="mt-5 space-y-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold">{i + 1}</span>
            <div>
              <div className="font-semibold">{t}</div>
              <div className="text-[15px] text-muted">{d}</div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function SessionShots({ session, unitLabel }: { session: CalibrationSession; unitLabel: string }) {
  const shots = [...session.shots].reverse();
  return (
    <Card>
      <SectionTitle>Shot di sesi ini</SectionTitle>
      <ul className="divide-y divide-line">
        {shots.map((s, idx) => {
          const n = session.shots.length - idx;
          const color = directionColor(s.direction);
          return (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold">#{n}</span>
              <div className="min-w-0 flex-1">
                <div className="tabular text-[15px] font-semibold">
                  {fmtNum(s.dose)} g → {fmtNum(s.yield)} g · {fmtNum(s.time)} s
                </div>
                <div className="text-sm text-muted">
                  {tasteLabel(s.taste)}
                  {s.timeCategory && ` · ${s.timeCategory}`}
                  {s.grindSetting !== null && ` · setting ${fmtNum(s.grindSetting, 2)}`}
                  {isDialedIn(s) && <span className="font-semibold text-hold"> · Terkalibrasi</span>}
                </div>
              </div>
              <span className="rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ background: color }}>
                {s.direction === 'tetap' ? 'Tetap' : `${s.direction === 'halus' ? 'Halus' : 'Kasar'} ${fmtNum(s.amount, 2)} ${unitLabel}`}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function NewSessionModal({ open, onClose, onStarted }: { open: boolean; onClose: () => void; onStarted: () => void }) {
  const sessions = useApp((s) => s.sessions);
  const grinder = useApp((s) => s.grinder);
  const draft = useApp((s) => s.draft);
  const startSession = useApp((s) => s.startSession);
  const setDraft = useApp((s) => s.setDraft);
  const beans = useMemo(() => Array.from(new Set(sessions.map((s) => s.beanName))).slice(0, 12), [sessions]);
  const [bean, setBean] = useState('');
  const [setting, setSetting] = useState('');

  const submit = () => {
    startSession(bean || beans[0] || 'House Blend');
    const g = setting.trim() === '' ? draft.grindSetting : Number(setting.replace(',', '.'));
    setDraft({ time: 0, taste: null, grindSetting: Number.isFinite(g) ? g : null });
    onStarted();
    onClose();
    setBean('');
    setSetting('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sesi kalibrasi baru"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={submit}>Mulai sesi</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nama biji / blend" hint="Mis. House Blend, Gayo Wine, Toraja Sapan">
          <TextInput list="bean-list" value={bean} onChange={(e) => setBean(e.target.value)} placeholder={beans[0] ?? 'House Blend'} autoFocus />
          <datalist id="bean-list">
            {beans.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>
        <Field label={`Setting ${grinder.name} saat ini (opsional)`} hint={draft.grindSetting !== null ? `Terakhir: ${fmtNum(draft.grindSetting, 2)} ${grinder.unitLabel}` : undefined}>
          <TextInput inputMode="decimal" value={setting} onChange={(e) => setSetting(e.target.value)} placeholder={draft.grindSetting !== null ? String(draft.grindSetting) : 'mis. 12'} />
        </Field>
      </div>
    </Modal>
  );
}
