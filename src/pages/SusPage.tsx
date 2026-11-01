import { ClipboardList, Download, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, ConfirmDialog, cx, EmptyState, Field, PageHeader, Segmented, SectionTitle, Snackbar, TextInput } from '../components/ui';
import { saveTextFile, stamp, toCsv } from '../lib/files';
import { fmtDateTime, fmtMath } from '../lib/format';
import { isCompleteSus, LIKERT_LABELS, scoreSus, SUS_STATEMENTS, susCategory } from '../lib/sus';
import type { SusResponse } from '../store/types';
import { useApp, useCurrentUser, useIsHead } from '../store/useApp';

type Tab = 'isi' | 'rekap';

/** Kuesioner SUS (Tabel III.2) dengan perhitungan skor yang ditulis lengkap, untuk Bab IV. */
export function SusPage() {
  const responses = useApp((s) => s.susResponses);
  const [tab, setTab] = useState<Tab>(responses.length ? 'rekap' : 'isi');
  return (
    <>
      <PageHeader title="Kuesioner SUS" subtitle="System Usability Scale · 10 butir pernyataan, skala Likert 1–5" />
      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-5 w-full sm:w-auto"
        options={[
          { value: 'isi', label: 'Isi kuesioner' },
          { value: 'rekap', label: `Rekapitulasi (${responses.length})` },
        ]}
      />
      {tab === 'isi' ? <SusForm onSaved={() => setTab('rekap')} /> : <SusRecap responses={responses} />}
    </>
  );
}

function SusForm({ onSaved }: { onSaved: () => void }) {
  const user = useCurrentUser();
  const responses = useApp((s) => s.susResponses);
  const addSusResponse = useApp((s) => s.addSusResponse);
  const [respondent, setRespondent] = useState(`R${responses.length + 1}`);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [snack, setSnack] = useState<string | null>(null);
  const complete = isCompleteSus(answers);
  const score = complete ? scoreSus(answers) : null;

  const save = () => {
    if (!respondent.trim() || !isCompleteSus(answers)) {
      setSnack('Lengkapi kode responden dan seluruh 10 butir pernyataan.');
      return;
    }
    addSusResponse({ respondent: respondent.trim(), answers });
    setAnswers(Array(10).fill(null));
    setRespondent(`R${responses.length + 2}`);
    onSaved();
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Kode / nama responden" hint={`Diisi oleh: ${user?.name ?? '-'}`}>
            <TextInput value={respondent} onChange={(e) => setRespondent(e.target.value)} placeholder="mis. R1" />
          </Field>
        </div>
        <p className="mb-4 text-sm text-muted">1 = {LIKERT_LABELS[0]} · 2 = {LIKERT_LABELS[1]} · 3 = {LIKERT_LABELS[2]} · 4 = {LIKERT_LABELS[3]} · 5 = {LIKERT_LABELS[4]}</p>
        <ol className="space-y-3">
          {SUS_STATEMENTS.map((text, i) => (
            <li key={i} className="rounded-2xl border border-line p-3">
              <div className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-relaxed">{text}</p>
                  <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={`Butir ${i + 1}`}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={answers[i] === v}
                        title={LIKERT_LABELS[v - 1]}
                        onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))}
                        className={cx(
                          'h-12 rounded-xl text-lg font-bold transition active:scale-95',
                          answers[i] === v ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-ink hover:bg-line/70',
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <Card>
          <SectionTitle>Perhitungan skor</SectionTitle>
          <table className="tabular w-full text-sm">
            <thead>
              <tr className="text-left text-xs tracking-wide text-muted uppercase">
                <th className="py-1.5">Butir</th>
                <th className="py-1.5">Jawaban</th>
                <th className="py-1.5">Rumus</th>
                <th className="py-1.5 text-right">Skor</th>
              </tr>
            </thead>
            <tbody>
              {answers.map((a, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1.5">P{i + 1}</td>
                  <td className="py-1.5">{a ?? '–'}</td>
                  <td className="py-1.5 text-muted">{a === null ? '–' : i % 2 === 0 ? `${a} − 1` : `5 − ${a}`}</td>
                  <td className="py-1.5 text-right font-semibold">{a === null ? '–' : i % 2 === 0 ? a - 1 : 5 - a}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {score ? (
            <div className="tabular mt-3 space-y-1 rounded-2xl bg-surface-2 px-4 py-3 text-[15px]">
              <div>Subtotal ganjil = {score.converted.filter((_, i) => i % 2 === 0).join(' + ')} = {score.oddTotal}</div>
              <div>Subtotal genap = {score.converted.filter((_, i) => i % 2 === 1).join(' + ')} = {score.evenTotal}</div>
              <div>
                SUS = ({score.oddTotal} + {score.evenTotal}) × 2,5 = <b className="text-lg">{fmtMath(score.score, 2)}</b>
              </div>
              <div className="text-muted">Kategori: {susCategory(score.score)}</div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Skor muncul setelah ke-10 butir dijawab.</p>
          )}
        </Card>
        <Button size="lg" className="w-full" onClick={save}>
          <Save className="size-5" /> Simpan jawaban
        </Button>
      </div>
      <Snackbar message={snack} onClose={() => setSnack(null)} />
    </div>
  );
}

function SusRecap({ responses }: { responses: SusResponse[] }) {
  const isHead = useIsHead();
  const deleteSusResponse = useApp((s) => s.deleteSusResponse);
  const [deleting, setDeleting] = useState<SusResponse | null>(null);
  if (!responses.length)
    return (
      <EmptyState icon={<ClipboardList className="size-7" />} title="Belum ada jawaban">
        Minta setiap barista mengisi kuesioner setelah menyelesaikan skenario tugas.
      </EmptyState>
    );

  const rows = responses.map((r) => ({ r, s: scoreSus(r.answers) }));
  const sum = rows.reduce((t, x) => t + x.s.score, 0);
  const mean = sum / rows.length;

  const exportCsv = () => {
    const data: (string | number | null)[][] = [
      ['responden', ...SUS_STATEMENTS.map((_, i) => `P${i + 1}`), 'jumlah_terkonversi', 'skor_sus', 'kategori'],
      ...rows.map(({ r, s }) => [r.respondent, ...r.answers, s.total, s.score, susCategory(s.score)]),
      ['rata-rata', ...SUS_STATEMENTS.map(() => null), rows.reduce((t, x) => t + x.s.total, 0) / rows.length, mean, susCategory(mean)],
    ];
    saveTextFile(`kuesioner-sus-${stamp()}.csv`, toCsv(data), 'text/csv');
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle
          action={
            <Button size="sm" variant="secondary" onClick={exportCsv}>
              <Download className="size-4" /> CSV
            </Button>
          }
        >
          Jawaban responden (skala Likert 1–5)
        </SectionTitle>
        <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
          <table className="tabular w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs tracking-wide text-muted uppercase">
                <th className="py-2 pr-2">Responden</th>
                {SUS_STATEMENTS.map((_, i) => (
                  <th key={i} className="py-2 pr-2 text-center">
                    P{i + 1}
                  </th>
                ))}
                <th className="py-2 pr-2 text-right">Jumlah (0–40)</th>
                <th className="py-2 pr-2 text-right">Skor SUS</th>
                <th className="py-2 pr-2">Kategori</th>
                {isHead && <th className="py-2" />}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, s }) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-2 pr-2 font-semibold">
                    {r.respondent}
                    <div className="text-xs font-normal text-muted">{fmtDateTime(r.createdAt)}</div>
                  </td>
                  {r.answers.map((a, i) => (
                    <td key={i} className="py-2 pr-2 text-center">
                      {a}
                    </td>
                  ))}
                  <td className="py-2 pr-2 text-right">{s.total}</td>
                  <td className="py-2 pr-2 text-right font-semibold">{fmtMath(s.score, 2)}</td>
                  <td className="py-2 pr-2">
                    <Badge>{susCategory(s.score)}</Badge>
                  </td>
                  {isHead && (
                    <td className="py-2 text-right">
                      <button type="button" aria-label={`Hapus ${r.respondent}`} onClick={() => setDeleting(r)} className="rounded-lg p-2 text-danger hover:bg-danger/10">
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionTitle>Skor rata-rata</SectionTitle>
        <div className="tabular rounded-2xl bg-surface-2 px-4 py-3 text-[15px] leading-relaxed">
          Rata-rata SUS = ({rows.map(({ s }) => fmtMath(s.score, 2)).join(' + ')}) / {rows.length} = {fmtMath(sum, 2)} / {rows.length} ={' '}
          <b className="text-lg">{fmtMath(mean, 2)}</b>
          <div className="mt-1">
            Kategori (Tabel III.3): <b>{susCategory(mean)}</b>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">Kriteria: 85–100 Excellent / Grade A · 70–84 Good / Grade B · 68–69 Acceptable threshold · 50–67 Poor · &lt; 50 Not acceptable.</p>
      </Card>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Hapus jawaban ${deleting?.respondent ?? ''}?`}
        message="Jawaban kuesioner ini akan dihapus dari rekapitulasi."
        onConfirm={() => deleting && deleteSusResponse(deleting.id)}
      />
    </div>
  );
}
