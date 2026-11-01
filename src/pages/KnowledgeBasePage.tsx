import { ArrowLeft, Grid3x3, List, RotateCcw, Save, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { MembershipChart } from '../components/charts/MembershipChart';
import { termColor } from '../components/charts/colors';
import { Badge, Button, Card, ConfirmDialog, cx, Modal, PageHeader, Segmented, SectionTitle } from '../components/ui';
import { EXPERT_MATRIX } from '../fuzzy/defaultKb';
import { INPUT_KEYS } from '../fuzzy/engine';
import { validateVariable } from '../fuzzy/membership';
import type { FuzzyRule, FuzzyVariable, KnowledgeBase, VariableKey } from '../fuzzy/types';
import { fmtDateTime, fmtNum, parseDecimal } from '../lib/format';
import { useApp, useCurrentUser, useIsHead } from '../store/useApp';

type Tab = 'himpunan' | 'aturan' | 'metode';

export function KnowledgeBasePage() {
  const kb = useApp((s) => s.kb);
  const saveKb = useApp((s) => s.saveKb);
  const resetKb = useApp((s) => s.resetKb);
  const user = useCurrentUser();
  const isHead = useIsHead();
  const [tab, setTab] = useState<Tab>('himpunan');
  const [draft, setDraft] = useState<KnowledgeBase>(() => structuredClone(kb));
  const [confirmReset, setConfirmReset] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(kb);

  const errors = useMemo(() => {
    const out: Partial<Record<VariableKey, string[]>> = {};
    for (const v of [...INPUT_KEYS.map((k) => draft.inputs[k]), draft.output]) {
      const e = validateVariable(v);
      if (e.length) out[v.key] = e;
    }
    return out;
  }, [draft]);
  const hasErrors = Object.keys(errors).length > 0;

  const updateVariable = (v: FuzzyVariable) =>
    setDraft((d) => (v.key === 'grind' ? { ...d, output: v } : { ...d, inputs: { ...d.inputs, [v.key]: v } }));

  return (
    <>
      {isHead && (
        <Link to="/head-barista" className="mb-2 inline-flex h-11 items-center gap-2 rounded-lg pr-3 font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-5" /> Head Barista
        </Link>
      )}
      <PageHeader
        title="Basis pengetahuan"
        subtitle={`Himpunan fuzzy & ${kb.rules.length} aturan IF–THEN · diperbarui ${fmtDateTime(kb.updatedAt)} oleh ${kb.updatedBy}`}
        actions={
          isHead && (
            <Button variant="ghost" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="size-5" /> Kembalikan bawaan
            </Button>
          )
        }
      />
      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-5 w-full sm:w-auto"
        options={[
          { value: 'himpunan', label: 'Himpunan Fuzzy' },
          { value: 'aturan', label: 'Rule Base' },
          { value: 'metode', label: 'Metode' },
        ]}
      />

      {dirty && (
        <div className="sticky top-2 z-30 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink bg-surface px-4 py-3 shadow-md">
          <span className="font-semibold">{hasErrors ? 'Perbaiki kesalahan sebelum menyimpan.' : 'Ada perubahan yang belum disimpan.'}</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDraft(structuredClone(kb))}>
              <Undo2 className="size-5" /> Batalkan
            </Button>
            <Button disabled={hasErrors} onClick={() => saveKb({ ...draft, updatedAt: new Date().toISOString(), updatedBy: user?.name ?? '-' })}>
              <Save className="size-5" /> Simpan
            </Button>
          </div>
        </div>
      )}

      {tab === 'himpunan' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {[...INPUT_KEYS.map((k) => draft.inputs[k]), draft.output].map((v) => (
            <VariableCard key={v.key} variable={v} editable={isHead} errors={errors[v.key]} onChange={updateVariable} />
          ))}
        </div>
      )}
      {tab === 'aturan' && <RulesView kb={draft} editable={isHead} onChange={(rules) => setDraft((d) => ({ ...d, rules }))} />}
      {tab === 'metode' && <MethodView kb={draft} />}

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Kembalikan basis pengetahuan bawaan?"
        message="Semua himpunan fuzzy dan 81 aturan akan dikembalikan ke nilai bawaan sistem. Perubahan hasil validasi pakar akan hilang."
        confirmLabel="Kembalikan"
        onConfirm={() => {
          resetKb();
          setDraft(structuredClone(useApp.getState().kb));
        }}
      />
    </>
  );
}

function VariableCard({
  variable,
  editable,
  errors,
  onChange,
}: {
  variable: FuzzyVariable;
  editable: boolean;
  errors?: string[];
  onChange: (v: FuzzyVariable) => void;
}) {
  const setPoint = (termIdx: number, p: number, value: number) => {
    const terms = variable.terms.map((t, i) => {
      if (i !== termIdx) return t;
      const points = [...t.points] as typeof t.points;
      points[p] = value;
      return { ...t, points };
    });
    onChange({ ...variable, terms });
  };
  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{variable.label}</h2>
        <Badge>
          {variable.key === 'grind' ? 'Output' : 'Input'} · semesta {fmtNum(variable.min)} – {fmtNum(variable.max)} {variable.unit}
        </Badge>
      </div>
      <MembershipChart variable={variable} />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="text-left text-sm font-medium text-muted">
            <tr>
              <th className="py-1.5 pr-2">Himpunan</th>
              {['a', 'b', 'c', 'd'].map((p) => (
                <th key={p} className="py-1.5 pr-2 text-center">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variable.terms.map((t, i) => (
              <tr key={t.key} className="border-t border-line">
                <td className="py-1.5 pr-2 font-semibold whitespace-nowrap" style={{ color: termColor(variable.key, i) }}>
                  {t.label}
                </td>
                {t.points.map((p, pi) => (
                  <td key={pi} className="py-1.5 pr-2">
                    {editable ? (
                      <PointInput value={p} onChange={(v) => setPoint(i, pi, v)} label={`${t.label} titik ${'abcd'[pi]}`} />
                    ) : (
                      <div className="tabular text-center">{fmtNum(p, 2)}</div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">Trapesium (a, b, c, d) — μ naik dari a ke b, bernilai 1 dari b ke c, turun ke 0 di d. Segitiga bila b = c.</p>
      {errors && (
        <ul className="mt-3 space-y-1 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PointInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [text, setText] = useState(String(value).replace('.', ','));
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setText(String(value).replace('.', ','));
  }
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const v = parseDecimal(e.target.value);
        if (Number.isFinite(v) && e.target.value.trim() !== '') {
          setPrev(v);
          onChange(v);
        }
      }}
      className="tabular h-10 w-full min-w-16 rounded-lg border border-line bg-surface text-center outline-none focus:border-brand"
    />
  );
}

function RulesView({ kb, editable, onChange }: { kb: KnowledgeBase; editable: boolean; onChange: (rules: FuzzyRule[]) => void }) {
  const [taste, setTaste] = useState(kb.inputs.taste.terms[0].key);
  const [mode, setMode] = useState<'matriks' | 'daftar'>('matriks');
  const [editing, setEditing] = useState<FuzzyRule | null>(null);
  const outputLabel = (k: string) => kb.output.terms.find((t) => t.key === k)?.label ?? k;
  const outIdx = (k: string) => kb.output.terms.findIndex((t) => t.key === k);
  const find = (dose: string, y: string, time: string, r: string) =>
    kb.rules.find((x) => x.if.dose === dose && x.if.yield === y && x.if.time === time && x.if.taste === r);
  const counts = kb.output.terms.map((t) => ({ t, n: kb.rules.filter((r) => r.then === t.key).length }));

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-muted">Rasa:</span>
        <Segmented
          value={taste}
          onChange={setTaste}
          options={kb.inputs.taste.terms.map((t) => ({ value: t.key, label: t.label }))}
        />
        <Segmented
          size="sm"
          value={mode}
          onChange={setMode}
          className="ml-auto"
          options={[
            { value: 'matriks', label: <span className="inline-flex items-center gap-1.5"><Grid3x3 className="size-4" /> Matriks</span> },
            { value: 'daftar', label: <span className="inline-flex items-center gap-1.5"><List className="size-4" /> Daftar</span> },
          ]}
        />
        <div className="flex w-full flex-wrap gap-2">
          {counts.map(({ t, n }, i) => (
            <span key={t.key} className="rounded-md px-2 py-0.5 text-xs font-semibold text-bg" style={{ background: termColor('grind', i) }}>
              {t.short} = {t.label} · {n}
            </span>
          ))}
        </div>
      </Card>

      {mode === 'matriks' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {kb.inputs.dose.terms.map((d) => (
            <Card key={d.key}>
              <SectionTitle>Dose {d.label}</SectionTitle>
              <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-1.5 text-center text-sm">
                <div className="flex items-end justify-center pb-1 text-[11px] leading-tight font-semibold text-muted">
                  Waktu ↓<br />Yield →
                </div>
                {kb.inputs.yield.terms.map((y) => (
                  <div key={y.key} className="pb-1 text-xs font-semibold text-muted">
                    {y.label}
                  </div>
                ))}
                {kb.inputs.time.terms.map((t) => (
                  <Row key={t.key}>
                    <div className="flex items-center pr-1 text-xs font-semibold text-muted">{t.label}</div>
                    {kb.inputs.yield.terms.map((y) => {
                      const rule = find(d.key, y.key, t.key, taste);
                      if (!rule) return <div key={y.key} className="rounded-xl border border-dashed border-line" />;
                      return (
                        <button
                          key={y.key}
                          type="button"
                          disabled={!editable}
                          onClick={() => setEditing(rule)}
                          title={`${rule.id}: ${outputLabel(rule.then)}`}
                          className="relative flex h-16 flex-col items-center justify-center rounded-xl font-bold text-bg transition enabled:hover:brightness-110 enabled:active:scale-95"
                          style={{ background: termColor('grind', outIdx(rule.then)) }}
                        >
                          <span className="absolute top-1 left-1.5 text-[10px] font-semibold opacity-80">{rule.id}</span>
                          {kb.output.terms[outIdx(rule.then)]?.short}
                        </button>
                      );
                    })}
                  </Row>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {kb.rules
              .filter((r) => r.if.taste === taste)
              .map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-12 shrink-0 font-bold">{r.id}</span>
                  <span className="min-w-0 flex-1 text-[15px]">
                    <b>JIKA</b>{' '}
                    {INPUT_KEYS.map((k, i) => (
                      <span key={k}>
                        {i > 0 && <b> DAN </b>}
                        {kb.inputs[k].label} <i>{kb.inputs[k].terms.find((t) => t.key === r.if[k])?.label}</i>
                      </span>
                    ))}{' '}
                    <b>MAKA</b> Grind <i>{outputLabel(r.then)}</i>
                  </span>
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => setEditing(r)}
                    className="shrink-0 rounded-md px-2.5 py-1 text-sm font-semibold text-bg enabled:hover:opacity-90"
                    style={{ background: termColor('grind', outIdx(r.then)) }}
                  >
                    {kb.output.terms[outIdx(r.then)]?.short}
                  </button>
                </li>
              ))}
          </ul>
        </Card>
      )}
      {!editable && <p className="text-sm text-muted">Hanya Head Barista yang dapat mengubah konsekuen aturan.</p>}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Ubah aturan ${editing.id}` : ''}>
        {editing && (
          <div className="space-y-4">
            <p className="text-[15px] leading-relaxed">
              <b>JIKA</b>{' '}
              {INPUT_KEYS.map((k, i) => (
                <span key={k}>
                  {i > 0 && <b> DAN </b>}
                  {kb.inputs[k].label} <i>{kb.inputs[k].terms.find((t) => t.key === editing.if[k])?.label}</i>
                </span>
              ))}{' '}
              <b>MAKA</b> Grind …
            </p>
            <div className="grid grid-cols-1 gap-2">
              {kb.output.terms.map((t, i) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    onChange(kb.rules.map((r) => (r.id === editing.id ? { ...r, then: t.key } : r)));
                    setEditing(null);
                  }}
                  className={cx(
                    'flex h-14 items-center justify-between rounded-lg border px-4 font-semibold transition',
                    editing.then === t.key ? 'text-bg' : 'border-line hover:border-brand',
                  )}
                  style={editing.then === t.key ? { background: termColor('grind', i), borderColor: termColor('grind', i) } : undefined}
                >
                  {t.label}
                  <span className="text-sm opacity-80">{t.short}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function MethodView({ kb }: { kb: KnowledgeBase }) {
  const tasteLabels = kb.inputs.taste.terms.map((t) => t.label);
  const flowHeads = ['−2 sangat cepat', '−1 cepat', '0 normal', '+1 lambat', '+2 sangat lambat'];
  const outShort = (idx: number) => kb.output.terms[idx + 2]?.short ?? '';
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <SectionTitle>Alur inferensi Mamdani</SectionTitle>
        <ol className="space-y-3 text-[15px] leading-relaxed">
          <li>
            <b>1. Fuzzifikasi.</b> Dose, yield, waktu, dan rasa (skala −5 asam … +5 pahit) diubah menjadi derajat keanggotaan μ pada himpunan trapesium/segitiga.
          </li>
          <li>
            <b>2. Evaluasi aturan.</b> {kb.rules.length} aturan JIKA–MAKA dievaluasi; α-predikat = MIN(μ dose, μ yield, μ waktu, μ rasa).
          </li>
          <li>
            <b>3. Implikasi &amp; komposisi.</b> Tiap himpunan output dipotong setinggi α (MIN), lalu seluruh potongan digabung dengan MAX.
          </li>
          <li>
            <b>4. Defuzzifikasi centroid.</b> z* = Σ z·μ(z) / Σ μ(z) atas {kb.output.min}…{kb.output.max} step. Negatif = putar ke halus, positif = ke kasar.
          </li>
          <li>
            <b>5. Terjemahan ke grinder.</b> z* dikalikan skala grinder (menu Pengaturan) dan dibulatkan sesuai resolusi dial. |z*| &lt; 0,25 → pertahankan setting.
          </li>
        </ol>
      </Card>
      <Card>
        <SectionTitle>Logika Head Barista (aturan bawaan)</SectionTitle>
        <p className="text-[15px] leading-relaxed text-muted">
          Rasa adalah sinyal utama; <b className="text-ink">indeks aliran</b> (level waktu − level yield) menunjukkan apakah gilingan memang penyebabnya. Bila dose menyimpang searah dengan aliran
          (dose tinggi + lambat, dose rendah + cepat), koreksi dikurangi satu tingkat karena dose ikut menjelaskan penyimpangan itu.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[460px] text-center text-sm">
            <thead>
              <tr className="text-xs text-muted">
                <th className="py-1.5 text-left">Rasa \ Aliran</th>
                {flowHeads.map((h) => (
                  <th key={h} className="py-1.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(EXPERT_MATRIX).map(([taste, row], r) => (
                <tr key={taste} className="border-t border-line">
                  <td className="py-2 text-left font-semibold">{tasteLabels[r] ?? taste}</td>
                  {row.map((v, i) => (
                    <td key={i} className="p-1">
                      <span className="block rounded-lg py-1.5 font-bold text-bg" style={{ background: termColor('grind', v + 2) }}>
                        {outShort(v)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 space-y-1.5 text-sm text-muted">
          <li>• Asam + aliran cepat → under-extracted: haluskan.</li>
          <li>• Pahit + aliran lambat → over-extracted: kasarkan.</li>
          <li>• Asam + lambat / pahit + cepat → gejala channeling: pertahankan gilingan, perbaiki puck prep.</li>
          <li>• Rasa seimbang → jangan kejar angka; koreksi hanya bila aliran sangat menyimpang.</li>
        </ul>
        <p className="mt-3 text-xs text-muted">Matriks ini adalah titik awal; validasi dan sesuaikan bersama Head Barista di tab Rule Base (member checking).</p>
      </Card>
    </div>
  );
}
