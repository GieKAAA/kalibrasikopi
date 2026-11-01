import { ArrowLeft, Calculator, CheckCircle2, CircleDashed, Download, History, Minus, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { directionColor } from '../components/charts/colors';
import { FuzzyTrace } from '../components/FuzzyTrace';
import { Badge, Button, Card, ConfirmDialog, cx, EmptyState, Modal, PageHeader, SectionTitle, TextInput } from '../components/ui';
import { CALIBRATED_CRITERIA, normalTarget, recommend, tasteLabel, type Direction } from '../fuzzy/advice';
import { infer } from '../fuzzy/engine';
import { saveTextFile, stamp, toCsv } from '../lib/files';
import { fmtDateTime, fmtMath, fmtNum, fmtTime } from '../lib/format';
import { agreement, expertAgrees, isDialedIn, sessionDialedIn } from '../lib/stats';
import type { CalibrationSession, Shot } from '../store/types';
import { useApp, useIsHead } from '../store/useApp';

const DIR_LABEL: Record<Direction, string> = { halus: 'Perhalus', tetap: 'Tetap', kasar: 'Perkasar' };

/** "Perhalus (−2 klik)", "Tetap (0 klik)", "Perkasar (+1 klik)". */
function dirText(d: Direction | null, amount: number | null, unit: string): string {
  if (!d) return '–';
  if (d === 'tetap') return `Tetap (0 ${unit})`;
  if (amount === null) return DIR_LABEL[d];
  return `${DIR_LABEL[d]} (${d === 'halus' ? '−' : '+'}${fmtMath(amount, 2)} ${unit})`;
}

function ExpertInput({
  direction,
  amount,
  step,
  unit,
  onChange,
  suggest,
}: {
  direction: Direction | null;
  amount: number | null;
  step: number;
  unit: string;
  onChange: (d: Direction | null, amount: number | null) => void;
  suggest: (d: Direction) => number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="inline-flex rounded-lg border border-line p-0.5">
        {(['halus', 'tetap', 'kasar'] as Direction[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => (direction === d ? onChange(null, null) : onChange(d, suggest(d)))}
            className={cx('h-9 rounded-md px-2.5 text-sm font-semibold transition', direction === d ? 'text-bg' : 'text-muted hover:text-ink')}
            style={direction === d ? { background: directionColor(d) } : undefined}
          >
            {DIR_LABEL[d]}
          </button>
        ))}
      </div>
      {direction && direction !== 'tetap' && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Kurangi besar putaran"
            disabled={(amount ?? 0) <= step}
            onClick={() => onChange(direction, Math.max(step, Math.round(((amount ?? step) - step) * 1000) / 1000))}
            className="flex size-8 items-center justify-center rounded-lg bg-surface-2 disabled:opacity-30"
          >
            <Minus className="size-4" />
          </button>
          <span className="tabular w-16 text-center text-sm font-semibold">
            {fmtMath(amount ?? step, 2)} {unit}
          </span>
          <button
            type="button"
            aria-label="Tambah besar putaran"
            onClick={() => onChange(direction, Math.round(((amount ?? 0) + step) * 1000) / 1000)}
            className="flex size-8 items-center justify-center rounded-lg bg-surface-2"
          >
            <Plus className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function sessionsToCsv(sessions: CalibrationSession[]): string {
  const rows: (string | number | null)[][] = [
    [
      'sesi', 'biji', 'barista', 'shot', 'waktu_catat', 'dose_g', 'yield_g', 'waktu_s', 'kategori_waktu', 'rasa', 'rasa_label', 'setting',
      'z_crisp', 'rekomendasi', 'besar', 'setting_baru', 'status_shot', 'keputusan_pakar', 'besar_pakar', 'sesuai',
    ],
  ];
  for (const s of sessions)
    s.shots.forEach((x, i) =>
      rows.push([
        s.id,
        s.beanName,
        s.baristaName,
        i + 1,
        x.createdAt,
        x.dose,
        x.yield,
        x.time,
        x.timeCategory ?? null,
        x.taste,
        tasteLabel(x.taste),
        x.grindSetting,
        x.crisp === null ? null : Number(x.crisp.toFixed(4)),
        x.direction,
        x.amount,
        x.newSetting,
        isDialedIn(x) ? 'Terkalibrasi' : 'Belum terkalibrasi',
        x.expertDecision ?? null,
        x.expertDecision ? (x.expertAmount ?? null) : null,
        expertAgrees(x) === null ? null : expertAgrees(x) ? 'Cocok' : 'Tidak cocok',
      ]),
    );
  return toCsv(rows);
}

export function HistoryPage() {
  const { id } = useParams();
  const sessions = useApp((s) => s.sessions);
  const session = sessions.find((s) => s.id === id);
  if (id) return session ? <SessionDetail session={session} /> : <EmptyState icon={<History className="size-7" />} title="Sesi tidak ditemukan" />;
  return <SessionList sessions={sessions} />;
}

function SessionList({ sessions }: { sessions: CalibrationSession[] }) {
  const [query, setQuery] = useState('');
  const withShots = sessions.filter((s) => s.shots.length > 0);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withShots.filter((s) => !q || s.beanName.toLowerCase().includes(q) || s.baristaName.toLowerCase().includes(q));
  }, [withShots, query]);

  const totalShots = withShots.reduce((n, s) => n + s.shots.length, 0);
  const dialed = withShots.filter(sessionDialedIn).length;
  const dialedShots = withShots.reduce((n, s) => n + s.shots.filter(isDialedIn).length, 0);
  const agr = agreement(withShots);

  return (
    <>
      <PageHeader
        title="Riwayat Kalibrasi"
        subtitle="Setiap sesi dial-in beserta saran sistem"
        actions={
          withShots.length > 0 && (
            <Button variant="secondary" onClick={() => saveTextFile(`riwayat-kalibrasi-${stamp()}.csv`, sessionsToCsv(withShots), 'text/csv')}>
              <Download className="size-5" /> Ekspor CSV
            </Button>
          )
        }
      />
      <Card className="mb-5 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
        <Stat label="Sesi" value={String(withShots.length)} />
        <Stat label="Total shot" value={String(totalShots)} sub={withShots.length ? `${fmtNum(totalShots / withShots.length, 1)} shot per sesi` : undefined} />
        <Stat
          label="Shot terkalibrasi"
          value={totalShots ? `${fmtNum((dialedShots / totalShots) * 100, 1)}%` : '–'}
          sub={`${dialedShots} dari ${totalShots} shot · ${dialed} sesi tuntas`}
        />
        <Stat
          label="Kesesuaian dengan Head Barista"
          value={agr.rate === null ? '–' : `${fmtNum(agr.rate, 1)}%`}
          sub={agr.judged ? `${agr.agreed} dari ${agr.judged} shot yang dinilai` : 'Belum ada penilaian'}
        />
      </Card>

      {withShots.length === 0 ? (
        <EmptyState icon={<History className="size-7" />} title="Belum ada riwayat">
          Sesi kalibrasi yang sudah dianalisis akan muncul di sini.
        </EmptyState>
      ) : (
        <>
          <div className="relative mb-4 max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
            <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari biji atau barista…" className="pl-11" aria-label="Cari riwayat" />
          </div>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((s) => {
              const ok = sessionDialedIn(s);
              const last = s.shots.at(-1)!;
              return (
                <li key={s.id}>
                  <Link to={`/riwayat/${s.id}`} className="block rounded-xl border border-line bg-surface p-4 transition hover:border-ink/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold">{s.beanName}</div>
                        <div className="text-sm text-muted">
                          {fmtDateTime(s.startedAt)} · {s.baristaName}
                        </div>
                      </div>
                      {s.finishedAt === null ? (
                        <Badge className="bg-crema/10 text-crema">Aktif</Badge>
                      ) : ok ? (
                        <Badge className="bg-hold/10 text-hold">
                          <CheckCircle2 className="size-3.5" /> Terkalibrasi
                        </Badge>
                      ) : (
                        <Badge>
                          <CircleDashed className="size-3.5" /> Belum tuntas
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div className="text-sm text-muted">
                        {s.shots.length} shot
                        {last.grindSetting !== null && (
                          <>
                            {' '}
                            · setting akhir <b className="tabular text-ink">{fmtNum(last.newSetting ?? last.grindSetting, 2)}</b>
                          </>
                        )}
                      </div>
                      <Sparkline values={s.shots.map((x) => x.crisp ?? 0)} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-sm text-muted">{label}</div>
      <div className="readout mt-1.5 text-[28px]">{value}</div>
      {sub && <div className="mt-1.5 text-sm text-muted">{sub}</div>}
    </div>
  );
}

/** Grafik mini arah rekomendasi per shot (bawah = halus, atas = kasar). */
function Sparkline({ values }: { values: number[] }) {
  const w = 120;
  const h = 40;
  const x = (i: number) => (values.length === 1 ? w / 2 : 6 + (i * (w - 12)) / (values.length - 1));
  const y = (v: number) => h / 2 - (Math.max(-3, Math.min(3, v)) / 3) * (h / 2 - 5);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-30 shrink-0" aria-hidden>
      <line x1={0} x2={w} y1={h / 2} y2={h / 2} stroke="var(--line)" strokeDasharray="3 3" />
      {values.length > 1 && <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke="var(--muted)" strokeWidth={1.5} />}
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill={directionColor(Math.abs(v) < 0.25 ? 'tetap' : v < 0 ? 'halus' : 'kasar')} />
      ))}
    </svg>
  );
}

function SessionDetail({ session }: { session: CalibrationSession }) {
  const navigate = useNavigate();
  const isHead = useIsHead();
  const kb = useApp((s) => s.kb);
  const grinder = useApp((s) => s.grinder);
  const deleteSession = useApp((s) => s.deleteSession);
  const setExpertDecision = useApp((s) => s.setExpertDecision);
  const [confirm, setConfirm] = useState(false);
  const [trace, setTrace] = useState<{ shot: Shot; no: number } | null>(null);
  const agr = agreement([session]);
  const dialedN = session.shots.filter(isDialedIn).length;
  const t = normalTarget(kb, 'time');

  return (
    <>
      <Link to="/riwayat" className="mb-2 inline-flex h-11 items-center gap-2 rounded-lg pr-3 font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-5" /> Semua riwayat
      </Link>
      <PageHeader
        title={session.beanName}
        subtitle={`${fmtDateTime(session.startedAt)}${session.finishedAt ? ` – ${fmtTime(session.finishedAt)}` : ' · sesi aktif'} · ${session.baristaName} · ${session.grinderName}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => saveTextFile(`kalibrasi-${session.beanName.replace(/\W+/g, '-')}-${stamp()}.csv`, sessionsToCsv([session]), 'text/csv')}>
              <Download className="size-5" /> CSV
            </Button>
            {isHead && (
              <Button variant="ghost" className="text-danger" onClick={() => setConfirm(true)}>
                <Trash2 className="size-5" /> Hapus
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SectionTitle>Waktu ekstraksi per shot</SectionTitle>
          <TimeChart session={session} band={[t.low, t.high]} />
        </div>
        <div className="grid grid-cols-2 content-start gap-5 border-t border-line pt-5 lg:grid-cols-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
          <Stat
            label="Kesesuaian dengan Head Barista"
            value={agr.rate === null ? '–' : `${fmtNum(agr.rate, 1)}%`}
            sub={agr.judged ? `${agr.agreed} dari ${agr.judged} shot cocok (arah dan jumlah klik sama)` : 'Belum ada shot yang dinilai'}
          />
          <Stat label="Shot terkalibrasi" value={`${dialedN} dari ${session.shots.length}`} sub="Saran tetap, rasa seimbang, waktu masuk target" />
        </div>
      </Card>

      <Card>
        <SectionTitle>Detail shot</SectionTitle>
        {isHead && (
          <p className="-mt-1 mb-3 text-sm text-muted">
            Isi kolom <b className="text-ink">Keputusan Head Barista</b> dengan arah dan jumlah klik menurut Anda sendiri. {CALIBRATED_CRITERIA}
          </p>
        )}
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[980px] text-[15px]">
            <thead className="text-left text-sm text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Parameter ekstraksi</th>
                <th className="py-2 pr-3 font-medium">Waktu</th>
                <th className="py-2 pr-3 font-medium">Saran sistem</th>
                <th className="py-2 pr-3 font-medium">Keputusan Head Barista</th>
                <th className="py-2 pr-3 font-medium">Kesesuaian</th>
                <th className="py-2 font-medium">Status shot</th>
              </tr>
            </thead>
            <tbody>
              {session.shots.map((s, i) => {
                const agree = expertAgrees(s);
                return (
                  <tr key={s.id} className="border-b border-line align-top last:border-0">
                    <td className="py-3 pr-3 font-semibold">{i + 1}</td>
                    <td className="tabular py-3 pr-3">
                      {fmtNum(s.dose)} g → {fmtNum(s.yield)} g
                      <div className="text-sm text-muted">Rasa: {tasteLabel(s.taste)} ({fmtMath(s.taste, 1)})</div>
                      {s.grindSetting !== null && (
                        <div className="text-sm text-muted">
                          Setting {fmtNum(s.grindSetting, 2)} → {fmtNum(s.newSetting, 2)}
                        </div>
                      )}
                    </td>
                    <td className="tabular py-3 pr-3">
                      {fmtMath(s.time, 1)} s{s.timeCategory && <div className="text-sm text-muted">{s.timeCategory}</div>}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="font-semibold" style={{ color: directionColor(s.direction) }}>
                        {dirText(s.direction, s.amount, grinder.unitLabel)}
                      </span>
                      {isHead && (
                        <button
                          type="button"
                          onClick={() => setTrace({ shot: s, no: i + 1 })}
                          className="mt-1 flex items-center gap-1 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
                        >
                          <Calculator className="size-3.5" /> Lihat perhitungan
                        </button>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {isHead ? (
                        <ExpertInput
                          direction={s.expertDecision ?? null}
                          amount={s.expertAmount ?? null}
                          step={grinder.resolution || 1}
                          unit={grinder.unitLabel}
                          onChange={(d, a) => setExpertDecision(session.id, s.id, d, a)}
                          suggest={(d) => (d === 'tetap' ? 0 : d === s.direction ? s.amount : grinder.resolution || 1)}
                        />
                      ) : s.expertDecision ? (
                        dirText(s.expertDecision, s.expertAmount ?? null, grinder.unitLabel)
                      ) : (
                        <span className="text-muted">–</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {agree === null ? (
                        <span className="text-muted">–</span>
                      ) : (
                        <Badge className={agree ? 'bg-hold/10 text-hold' : 'bg-danger/10 text-danger'}>{agree ? 'Cocok' : 'Tidak cocok'}</Badge>
                      )}
                    </td>
                    <td className="py-3">
                      {isDialedIn(s) ? (
                        <Badge className="bg-hold/10 text-hold">
                          <CheckCircle2 className="size-3.5" /> Terkalibrasi
                        </Badge>
                      ) : (
                        <Badge>
                          <CircleDashed className="size-3.5" /> Belum
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <TraceModal open={trace} onClose={() => setTrace(null)} />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Hapus sesi ini?"
        message="Seluruh shot di sesi ini akan dihapus permanen dari perangkat."
        onConfirm={() => {
          deleteSession(session.id);
          navigate('/riwayat');
        }}
      />
    </>
  );
}

/** Jejak perhitungan Mamdani untuk satu shot — hanya untuk Head Barista / keperluan penelitian. */
function TraceModal({ open, onClose }: { open: { shot: Shot; no: number } | null; onClose: () => void }) {
  const kb = useApp((s) => s.kb);
  const grinder = useApp((s) => s.grinder);
  if (!open) return null;
  const { shot } = open;
  const result = infer(kb, { dose: shot.dose, yield: shot.yield, time: shot.time, taste: shot.taste });
  const rec = recommend(result, grinder, shot.grindSetting);
  return (
    <Modal open onClose={onClose} title={`Perhitungan Fuzzy Mamdani · shot #${open.no}`} wide>
      <p className="mb-4 text-sm text-muted">
        Dihitung ulang dengan basis pengetahuan yang berlaku sekarang ({fmtDateTime(kb.updatedAt)}). Halaman ini untuk verifikasi oleh Head Barista dan penulisan laporan.
      </p>
      <FuzzyTrace kb={kb} result={result} rec={rec} grinder={grinder} />
    </Modal>
  );
}

function TimeChart({ session, band }: { session: CalibrationSession; band: [number, number] }) {
  const W = 720;
  const H = 220;
  const pad = { l: 40, r: 16, t: 16, b: 34 };
  const times = session.shots.map((s) => s.time);
  const lo = Math.min(10, ...times, band[0]) - 2;
  const hi = Math.max(45, ...times, band[1]) + 2;
  const n = session.shots.length;
  const x = (i: number) => (n === 1 ? (W + pad.l - pad.r) / 2 : pad.l + 20 + (i * (W - pad.l - pad.r - 40)) / (n - 1));
  const y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks = [10, 20, 30, 40, 50].filter((v) => v >= lo && v <= hi);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Grafik waktu ekstraksi per shot">
      <rect x={pad.l} width={W - pad.l - pad.r} y={y(band[1])} height={y(band[0]) - y(band[1])} fill="var(--hold)" opacity={0.1} />
      <text x={pad.l + 6} y={y(band[1]) - 6} fontSize="12" fill="var(--hold)" fontWeight={600}>
        target {band[0]}–{band[1]} s
      </text>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="3 5" />
          <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">
            {v}s
          </text>
        </g>
      ))}
      {n > 1 && <polyline points={session.shots.map((s, i) => `${x(i)},${y(s.time)}`).join(' ')} fill="none" stroke="var(--muted)" strokeWidth={1.5} />}
      {session.shots.map((s, i) => (
        <g key={s.id}>
          <circle cx={x(i)} cy={y(s.time)} r={6} fill={directionColor(s.direction)} stroke="var(--surface)" strokeWidth={2} />
          <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="12" fill="var(--muted)">
            #{i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
