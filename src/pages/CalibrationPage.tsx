import { ArrowRight, Check, CheckCircle2, CircleAlert, CircleDashed, Info, Plus, RotateCcw } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { directionColor } from '../components/charts/colors';
import { GrindScale } from '../components/charts/GrindScale';
import { NumberStepper } from '../components/NumberStepper';
import { ShotTimer } from '../components/ShotTimer';
import { TasteSelector } from '../components/TasteSelector';
import { Button, Card, ConfirmDialog, cx, Field, Modal, PageHeader, SectionTitle, Snackbar, TextInput } from '../components/ui';
import {
  baristaNotes,
  calibrationStatus,
  diagnosis,
  normalTarget,
  recommend,
  shotMetrics,
  tasteLabel,
  timeCategory,
  type BaristaNote,
  type GrinderConfig,
  type Recommendation,
  type TimeCategory,
} from '../fuzzy/advice';
import { infer } from '../fuzzy/engine';
import type { CrispInputs, InferenceResult, KnowledgeBase } from '../fuzzy/types';
import { uid } from '../lib/auth';
import { fmtFixed, fmtNum, fmtTime } from '../lib/format';
import { isDialedIn } from '../lib/stats';
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

/** Jumlah angka desimal sesuai resolusi dial grinder: 1 → 0, 0,5 / 0,1 → 1, 0,25 → 2. */
const decimalsFor = (resolution: number) => Math.min(2, String(resolution).split('.')[1]?.length ?? 0);

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
  const gDec = decimalsFor(grinder.resolution || 1);

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

  // Pulihkan hasil shot terakhir bila belum dilanjutkan ke shot berikutnya (mis. setelah pindah menu).
  const [analysis, setAnalysis] = useState<Analysis | null>(() => {
    const last = session?.shots.at(-1);
    if (!last || draft.taste === null) return null;
    if (last.dose !== draft.dose || last.yield !== draft.yield || last.time !== draft.time || last.taste !== draft.taste) return null;
    return run({ dose: last.dose, yield: last.yield, time: last.time, taste: last.taste }, last.grindSetting, last.id);
  });
  const [timerKey, setTimerKey] = useState(0);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

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

  /** Data hasil shot (dose/yield/waktu/rasa) diubah setelah dianalisis → koreksi salah input. */
  const dataChanged =
    analysis !== null &&
    (analysis.inputs.dose !== draft.dose || analysis.inputs.yield !== draft.yield || analysis.inputs.time !== draft.time || analysis.inputs.taste !== draft.taste);
  /** Hanya setting grinder yang diubah → barista sudah memutar grinder; perlu shot baru, bukan analisis ulang. */
  const settingChanged = analysis !== null && !dataChanged && draft.grindSetting !== analysis.grindSetting;

  const shotIndex = analysis && session ? session.shots.findIndex((s) => s.id === analysis.shotId) : -1;
  const shotNo = shotIndex >= 0 ? shotIndex + 1 : (session?.shots.length ?? 0) + 1;
  const prevShot = shotIndex > 0 ? session!.shots[shotIndex - 1] : !analysis ? (session?.shots.at(-1) ?? null) : null;

  const analyze = (grindSetting = draft.grindSetting) => {
    if (missing.length || draft.taste === null) {
      setSnack(`Silakan lengkapi semua parameter kalibrasi (${missing.join(', ')}).`);
      return;
    }
    if (!session) startSession(sessions[0]?.beanName ?? 'House Blend');
    const inputs: CrispInputs = { dose: draft.dose, yield: draft.yield, time: draft.time, taste: draft.taste };
    // Analisis ulang sebelum lanjut ke shot berikutnya menimpa shot yang sama, bukan menambah shot baru.
    const shotId = analysis?.shotId ?? uid();
    const a = run(inputs, grindSetting, shotId);
    setAnalysis(a);
    if (window.matchMedia('(max-width: 1023px)').matches)
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    const shot: Shot = {
      id: shotId,
      createdAt: new Date().toISOString(),
      ...inputs,
      grindSetting,
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

  /** Shot ini selesai: grinder sudah diputar ke `setting`; kosongkan waktu & rasa untuk shot baru. */
  const nextShot = (setting: number | null) => {
    setDraft({ time: 0, taste: null, grindSetting: setting });
    setAnalysis(null);
    setTimerKey((k) => k + 1);
    document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <PageHeader
        title="Kalibrasi espresso"
        subtitle={<SessionLine session={session} />}
        actions={
          session ? (
            <>
              <Button variant="outline" onClick={() => setFinishOpen(true)}>
                <Check className="size-5" /> Selesai sesi
              </Button>
              <Button variant="ghost" onClick={() => setNewSessionOpen(true)}>
                <Plus className="size-5" /> Sesi baru
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setNewSessionOpen(true)}>
              <Plus className="size-5" /> Mulai sesi
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        {/* ── Input shot ── */}
        <div className="scroll-mt-4" ref={formRef}>
          <Card className="pt-3 pb-4 sm:pt-4">
            <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
              <h2 className="text-lg font-semibold">Shot #{shotNo}</h2>
              <span className="text-sm text-muted">
                Target {fmtNum(doseTarget.mid)} g → {fmtNum(yieldTarget.mid)} g · {fmtNum(timeTarget.low, 0)}–{fmtNum(timeTarget.high, 0)} detik
              </span>
            </div>
            <div className="divide-y divide-line">
              <ShotTimer key={timerKey} targetRange={[timeTarget.low, timeTarget.high]} onStop={(s) => setDraft({ time: s })} />
              <NumberStepper label="Dose" hint="Bubuk di basket" value={draft.dose} onChange={(v) => setDraft({ dose: v })} step={0.1} min={0} max={30} unit="g" highlight={draft.dose <= 0} />
              <NumberStepper label="Yield" hint="Espresso di cangkir" value={draft.yield} onChange={(v) => setDraft({ yield: v })} step={0.5} min={0} max={100} unit="g" highlight={draft.yield <= 0} />
              <div>
                <NumberStepper label="Waktu" hint="Dari timer atau ketik" value={draft.time} onChange={(v) => setDraft({ time: v })} step={1} min={0} max={120} unit="s" highlight={draft.time === 0} />
                <p className="tabular -mt-1 pb-3 text-sm text-muted">
                  Rasio 1:{fmtFixed(metrics.ratio, 1)} · aliran {draft.time > 0 ? `${fmtFixed(metrics.flowRate, 2)} g/s` : '–'}
                </p>
              </div>
              <TasteSelector value={draft.taste} onChange={(v) => setDraft({ taste: v })} highlight={dataChanged || !analysis} />
              {draft.grindSetting === null ? (
                <div className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">Setting grinder</div>
                    <div className="text-sm text-muted">Catat agar aplikasi menghitung angka dial berikutnya.</div>
                  </div>
                  <Button variant="outline" onClick={() => setDraft({ grindSetting: 10 })}>
                    <Plus className="size-4" /> Catat setting
                  </Button>
                </div>
              ) : (
                <NumberStepper
                  label="Setting grinder"
                  hint={grinder.finerIsLower ? 'Saat shot ditarik · kecil = halus' : 'Saat shot ditarik · besar = halus'}
                  value={draft.grindSetting}
                  onChange={(v) => setDraft({ grindSetting: v })}
                  step={grinder.resolution || 1}
                  min={-999}
                  max={999}
                  unit={grinder.unitLabel}
                  decimals={gDec}
                />
              )}
            </div>

            {settingChanged && analysis ? (
              <div className="mt-2 rounded-lg border border-line bg-surface-2 p-4">
                <p className="text-[15px] leading-relaxed">
                  Setting diubah ke <b className="tabular">{fmtNum(draft.grindSetting, gDec)}</b>. Waktu dan rasa di atas masih milik shot #{shotNo}, jadi
                  analisis ulang akan memberi saran yang sama. Tarik shot baru dengan setting ini dulu.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button size="lg" className="flex-1" onClick={() => nextShot(draft.grindSetting)}>
                    Lanjut ke shot #{shotNo + 1} <ArrowRight className="size-5" />
                  </Button>
                  <Button size="lg" variant="ghost" onClick={() => analyze(draft.grindSetting)}>
                    Koreksi setting shot #{shotNo}
                  </Button>
                </div>
              </div>
            ) : analysis && !dataChanged ? (
              <p className="mt-3 rounded-lg bg-surface-2 px-4 py-3 text-[15px] text-muted">
                Shot #{shotNo} sudah dianalisis. Ubah angka di atas hanya bila ada salah input.
              </p>
            ) : (
              <Button size="xl" className="mt-3 w-full" onClick={() => analyze()}>
                {dataChanged ? <RotateCcw className="size-5" /> : null}
                {dataChanged ? `Analisis ulang shot #${shotNo}` : 'Analisis shot'}
              </Button>
            )}
          </Card>
        </div>

        {/* ── Hasil ── */}
        <div className="scroll-mt-4 space-y-5" ref={resultRef}>
          {analysis ? (
            <>
              <ResultCard
                kb={kb}
                analysis={analysis}
                prev={prevShot}
                prevNo={shotNo - 1}
                shotNo={shotNo}
                stale={dataChanged}
                grinder={grinder}
                decimals={gDec}
                onNext={() => nextShot(analysis.rec?.newSetting ?? draft.grindSetting)}
                onFinish={() => setFinishOpen(true)}
                onEdit={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              />
              <NotesCard notes={analysis.notes} />
            </>
          ) : prevShot ? (
            <NextShotCard prev={prevShot} prevNo={shotNo - 1} setting={draft.grindSetting} grinder={grinder} decimals={gDec} />
          ) : (
            <GuideCard />
          )}
          {session && session.shots.length > 0 && <SessionShots session={session} grinder={grinder} decimals={gDec} />}
        </div>
      </div>

      <Snackbar message={snack} onClose={() => setSnack(null)} />
      <NewSessionModal
        open={newSessionOpen}
        onClose={() => setNewSessionOpen(false)}
        onStarted={() => {
          setAnalysis(null);
          setTimerKey((k) => k + 1);
        }}
      />
      <ConfirmDialog
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Selesaikan sesi kalibrasi?"
        message="Sesi dan seluruh shot disimpan di Riwayat. Setting grinder terakhir tetap diingat untuk sesi berikutnya."
        confirmLabel="Selesai & simpan"
        tone="primary"
        onConfirm={() => {
          if (analysis?.rec?.newSetting != null) setDraft({ grindSetting: analysis.rec.newSetting });
          finishSession();
          setAnalysis(null);
          setTimerKey((k) => k + 1);
        }}
      />
    </>
  );
}

function SessionLine({ session }: { session: CalibrationSession | null }) {
  const renameSession = useApp((s) => s.renameSession);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  if (!session) return <>Belum ada sesi. Sesi dimulai otomatis saat shot pertama dianalisis.</>;
  if (editing)
    return (
      <form
        className="mt-1 flex items-center gap-2"
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
    );
  return (
    <>
      <button
        type="button"
        title="Ubah nama biji"
        className="font-semibold text-ink underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink"
        onClick={() => {
          setName(session.beanName);
          setEditing(true);
        }}
      >
        {session.beanName}
      </button>
      {` · ${session.shots.length} shot · mulai ${fmtTime(session.startedAt)} · ${session.baristaName}`}
    </>
  );
}

function dirLabel(direction: Shot['direction'], amount: number, unit: string, decimals: number) {
  if (direction === 'tetap' || direction === null) return 'Tetap';
  return `${direction === 'halus' ? 'Perhalus' : 'Perkasar'} ${fmtNum(amount, decimals)} ${unit}`;
}

function ResultCard({
  kb,
  analysis,
  prev,
  prevNo,
  shotNo,
  stale,
  grinder,
  decimals,
  onNext,
  onFinish,
  onEdit,
}: {
  kb: KnowledgeBase;
  analysis: Analysis;
  prev: Shot | null;
  prevNo: number;
  shotNo: number;
  stale: boolean;
  grinder: GrinderConfig;
  decimals: number;
  onNext: () => void;
  onFinish: () => void;
  onEdit: () => void;
}) {
  const { rec, inputs, status } = analysis;
  if (!rec)
    return (
      <Card>
        <p className="font-semibold">Tidak ada aturan yang cocok untuk kombinasi ini.</p>
        <p className="mt-1 text-sm text-muted">Minta Head Barista memeriksa basis pengetahuan.</p>
      </Card>
    );
  const color = directionColor(rec.direction);
  const hold = rec.direction === 'tetap';
  const known = analysis.grindSetting !== null && rec.newSetting !== null;
  return (
    <Card className={cx('p-0 sm:p-0', stale && 'opacity-50')}>
      {stale && (
        <div className="flex items-center gap-2 border-b border-line px-5 py-3 text-sm font-semibold text-warn">
          <CircleAlert className="size-4" /> Data shot diubah. Tekan Analisis ulang untuk memperbarui saran.
        </div>
      )}
      <div className="p-5">
        <div className="text-sm font-medium text-muted">Hasil shot #{shotNo}</div>
        <h2 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight md:text-[32px]" style={{ color }}>
          {rec.headline}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{diagnosis(kb, inputs, analysis.timeCat)}</p>

        <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <div className="text-sm text-muted">Putaran</div>
            <div className="readout mt-1 text-[40px]" style={{ color }}>
              {hold ? '0' : `${rec.direction === 'halus' ? '−' : '+'}${fmtNum(rec.amount, decimals)}`}
              <span className="ml-1.5 text-lg font-medium tracking-normal text-muted">{grinder.unitLabel}</span>
            </div>
          </div>
          {known && (
            <div>
              <div className="text-sm text-muted">Setting grinder</div>
              <div className="readout mt-1 flex items-center gap-3 text-[40px]">
                <span className="text-muted">{fmtNum(analysis.grindSetting, decimals)}</span>
                <ArrowRight className="size-6 text-muted" />
                <span style={{ color }}>{fmtNum(rec.newSetting, decimals)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="mt-5">
          <GrindScale value={rec.crisp} />
        </div>
      </div>

      <div className="border-t border-line px-5 py-4">
        <div className="flex gap-3">
          {status.calibrated ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-hold" /> : <CircleDashed className="mt-0.5 size-5 shrink-0 text-muted" />}
          <div className="text-[15px]">
            <span className="font-semibold">{status.calibrated ? 'Terkalibrasi.' : 'Belum terkalibrasi:'}</span>{' '}
            <span className="text-muted">
              {status.calibrated ? 'Rasa seimbang dan waktu masuk target. Kunci setting ini.' : `${status.unmet.join(', ')}.`}
            </span>
          </div>
        </div>
        {prev && (
          <div className="mt-2 flex gap-3 text-[15px]">
            <Info className="mt-0.5 size-5 shrink-0 text-muted" />
            <span className="text-muted">
              Dibanding shot #{prevNo}: waktu {fmtNum(prev.time)} → {fmtNum(inputs.time)} detik, rasa {tasteLabel(prev.taste).toLowerCase()} → {tasteLabel(inputs.taste).toLowerCase()}.
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-line p-4 sm:flex-row sm:p-5">
        {hold && status.calibrated ? (
          <>
            <Button size="lg" className="flex-1" onClick={onFinish} disabled={stale}>
              <Check className="size-5" /> Selesai sesi
            </Button>
            <Button size="lg" variant="outline" onClick={onNext} disabled={stale}>
              Tarik shot lagi
            </Button>
          </>
        ) : (
          <Button size="lg" className="flex-1" onClick={onNext} disabled={stale}>
            {hold ? `Tarik shot #${shotNo + 1} dengan setting sama` : known ? `Sudah diputar ke ${fmtNum(rec.newSetting, decimals)}` : 'Sudah diputar'}
            {!hold && <span className="hidden sm:inline">— lanjut shot #{shotNo + 1}</span>}
            <ArrowRight className="size-5" />
          </Button>
        )}
        <Button size="lg" variant="ghost" className="lg:hidden" onClick={onEdit}>
          Ubah data shot
        </Button>
      </div>
    </Card>
  );
}

const NOTE_DOT = { success: 'bg-hold', warn: 'bg-warn', info: 'bg-muted' };

function NotesCard({ notes }: { notes: BaristaNote[] }) {
  if (!notes.length) return null;
  return (
    <Card>
      <SectionTitle>Catatan Head Barista</SectionTitle>
      <ul className="space-y-3">
        {notes.map((n) => (
          <li key={n.title} className="flex gap-3">
            <span aria-hidden className={cx('mt-2 size-2 shrink-0 rounded-full', NOTE_DOT[n.tone])} />
            <div>
              <div className="font-semibold">{n.title}</div>
              <p className="mt-0.5 text-[15px] leading-relaxed text-muted">{n.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NextShotCard({ prev, prevNo, setting, grinder, decimals }: { prev: Shot; prevNo: number; setting: number | null; grinder: GrinderConfig; decimals: number }) {
  return (
    <Card>
      <div className="text-sm font-medium text-muted">Shot #{prevNo + 1}</div>
      <h2 className="mt-1 text-xl font-semibold">
        {setting !== null ? (
          <>
            Tarik shot dengan setting <span className="tabular">{fmtNum(setting, decimals)}</span> {grinder.unitLabel}
          </>
        ) : (
          'Tarik shot berikutnya'
        )}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Purge 2–3 g bubuk lama, pakai dose dan target yield yang sama, lalu isi waktu dan rasa shot baru. Saran hanya berubah bila hasil shot berubah.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-[15px] sm:grid-cols-4">
        <div>
          <dt className="text-sm text-muted">Shot #{prevNo}</dt>
          <dd className="tabular font-semibold">
            {fmtNum(prev.time)} s · {tasteLabel(prev.taste)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Saran</dt>
          <dd className="font-semibold" style={{ color: directionColor(prev.direction) }}>
            {dirLabel(prev.direction, prev.amount, grinder.unitLabel, decimals)}
          </dd>
        </div>
        {prev.grindSetting !== null && (
          <div>
            <dt className="text-sm text-muted">Setting</dt>
            <dd className="tabular font-semibold">
              {fmtNum(prev.grindSetting, decimals)} → {fmtNum(prev.newSetting, decimals)}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-sm text-muted">Status</dt>
          <dd className="font-semibold">{isDialedIn(prev) ? 'Terkalibrasi' : 'Belum'}</dd>
        </div>
      </dl>
    </Card>
  );
}

function GuideCard() {
  const steps = [
    'Tekan Mulai saat pompa menyala, Stop saat yield tercapai.',
    'Timbang dose dan yield, sesuaikan angkanya.',
    'Cicipi, lalu pilih rasa: asam, seimbang, atau pahit.',
    'Tekan Analisis shot dan ikuti saran putaran grinder.',
  ];
  return (
    <Card>
      <SectionTitle>Cara memakai</SectionTitle>
      <ol className="space-y-2.5">
        {steps.map((t, i) => (
          <li key={t} className="flex gap-3 text-[15px] leading-relaxed">
            <span className="tabular w-5 shrink-0 font-semibold text-muted">{i + 1}.</span>
            {t}
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-muted">
        Saran dihitung dari hasil cangkir (dose, yield, waktu, rasa), bukan dari angka grinder. Setelah grinder diputar, tarik shot baru agar saran ikut berubah.
      </p>
    </Card>
  );
}

function SessionShots({ session, grinder, decimals }: { session: CalibrationSession; grinder: GrinderConfig; decimals: number }) {
  return (
    <Card>
      <SectionTitle>Shot di sesi ini</SectionTitle>
      <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
        <table className="tabular w-full min-w-[460px] text-[15px]">
          <thead className="text-left text-sm text-muted">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium">#</th>
              <th className="py-2 pr-3 font-medium">Setting</th>
              <th className="py-2 pr-3 font-medium">Shot</th>
              <th className="py-2 pr-3 font-medium">Rasa</th>
              <th className="py-2 font-medium">Saran</th>
            </tr>
          </thead>
          <tbody>
            {[...session.shots].reverse().map((s, idx) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="py-2.5 pr-3 font-semibold">{session.shots.length - idx}</td>
                <td className="py-2.5 pr-3">{s.grindSetting === null ? '–' : fmtNum(s.grindSetting, decimals)}</td>
                <td className="py-2.5 pr-3">
                  {fmtNum(s.dose)}→{fmtNum(s.yield)} g · {fmtNum(s.time)} s
                </td>
                <td className="py-2.5 pr-3">{tasteLabel(s.taste)}</td>
                <td className="py-2.5 font-semibold" style={{ color: directionColor(s.direction) }}>
                  {isDialedIn(s) ? 'Terkalibrasi' : dirLabel(s.direction, s.amount, grinder.unitLabel, decimals)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
