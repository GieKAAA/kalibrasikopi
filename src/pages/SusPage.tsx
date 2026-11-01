import { ArrowLeft, ClipboardList, Download, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, ConfirmDialog, cx, EmptyState, Field, PageHeader, Segmented, SectionTitle, Snackbar, TextInput } from '../components/ui';
import { saveTextFile, stamp, toCsv } from '../lib/files';
import { fmtDateTime, fmtMath } from '../lib/format';
import { isCompleteSus, LIKERT_LABELS, scoreSus, SUS_STATEMENTS, susCategory } from '../lib/sus';
import type { SusResponse } from '../store/types';
import { useApp, useCurrentUser, useIsHead } from '../store/useApp';

type Tab = 'isi' | 'rekap';

/** Kuesioner SUS (Tabel III.2). Responden hanya melihat pernyataan; skor dan rekap hanya untuk Head Barista. */
export function SusPage() {
  const responses = useApp((s) => s.susResponses);
  const isHead = useIsHead();
  const [tab, setTab] = useState<Tab>(isHead && responses.length ? 'rekap' : 'isi');
  return (
    <>
      {isHead && (
        <Link to="/head-barista" className="mb-2 inline-flex h-11 items-center gap-2 rounded-lg pr-3 font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-5" /> Head Barista
        </Link>
      )}
      <PageHeader title="Kuesioner SUS" subtitle="System Usability Scale · 10 pernyataan, skala 1–5" />
      {isHead && (
        <Segmented
          value={tab}
          onChange={setTab}
          className="mb-5 w-full sm:w-auto"
          options={[
            { value: 'isi', label: 'Isi kuesioner' },
            { value: 'rekap', label: `Rekap (${responses.length})` },
          ]}
        />
      )}
      {tab === 'isi' || !isHead ? <SusForm /> : <SusRecap responses={responses} />}
    </>
  );
}

function SusForm() {
  const user = useCurrentUser();
  const responses = useApp((s) => s.susResponses);
  const addSusResponse = useApp((s) => s.addSusResponse);
  const [respondent, setRespondent] = useState(`R${responses.length + 1}`);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [snack, setSnack] = useState<{ text: string; tone: 'warn' | 'success' } | null>(null);
  const answered = answers.filter((a) => a !== null).length;

  const save = () => {
    if (!respondent.trim() || !isCompleteSus(answers)) {
      setSnack({ text: 'Lengkapi kode responden dan seluruh 10 butir pernyataan.', tone: 'warn' });
      return;
    }
    addSusResponse({ respondent: respondent.trim(), answers });
    setSnack({ text: `Terima kasih. Jawaban ${respondent.trim()} tersimpan.`, tone: 'success' });
    setAnswers(Array(10).fill(null));
    setRespondent(`R${responses.length + 2}`);
    document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-3xl">
      <Card>
        <div className="grid grid-cols-1 gap-4 border-b border-line pb-4 sm:grid-cols-2">
          <Field label="Kode / nama responden" hint={`Dicatat oleh ${user?.name ?? '-'}`}>
            <TextInput value={respondent} onChange={(e) => setRespondent(e.target.value)} placeholder="mis. R1" />
          </Field>
          <div className="text-sm leading-relaxed text-muted sm:pt-7">
            1 = {LIKERT_LABELS[0]}
            <br />5 = {LIKERT_LABELS[4]}
          </div>
        </div>
        <ol className="divide-y divide-line">
          {SUS_STATEMENTS.map((text, i) => (
            <li key={i} className="py-4">
              <p className="text-base leading-relaxed">
                <span className="tabular mr-2 font-semibold text-muted">{i + 1}.</span>
                {text}
              </p>
              <div className="mt-3 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={`Butir ${i + 1}`}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={answers[i] === v}
                    title={LIKERT_LABELS[v - 1]}
                    onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))}
                    className={cx(
                      'h-12 rounded-lg border text-lg font-semibold transition active:scale-[0.98]',
                      answers[i] === v ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink hover:bg-surface-2',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted">{answered} dari 10 butir terjawab</span>
          <Button size="lg" onClick={save}>
            <Save className="size-5" /> Simpan jawaban
          </Button>
        </div>
      </Card>
      <Snackbar message={snack?.text ?? null} tone={snack?.tone} onClose={() => setSnack(null)} />
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
          Jawaban responden
        </SectionTitle>
        <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
          <table className="tabular w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-sm text-muted">
                <th className="py-2 pr-2 font-medium">Responden</th>
                {SUS_STATEMENTS.map((_, i) => (
                  <th key={i} className="py-2 pr-2 text-center font-medium">
                    P{i + 1}
                  </th>
                ))}
                <th className="py-2 pr-2 text-right font-medium">Jumlah (0–40)</th>
                <th className="py-2 pr-2 text-right font-medium">Skor SUS</th>
                <th className="py-2 pr-2 font-medium">Kategori</th>
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
                      <button type="button" aria-label={`Hapus ${r.respondent}`} onClick={() => setDeleting(r)} className="rounded-md p-2 text-danger hover:bg-danger/10">
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

      <Card className="grid grid-cols-1 gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div>
          <div className="text-sm text-muted">Skor rata-rata ({rows.length} responden)</div>
          <div className="readout mt-1.5 text-[40px]">{fmtMath(mean, 2)}</div>
          <div className="mt-1.5 font-semibold">{susCategory(mean)}</div>
        </div>
        <p className="text-sm leading-relaxed text-muted sm:border-l sm:border-line sm:pl-5">
          Kategori Tabel III.3: 85–100 Excellent (Grade A) · 70–84 Good (Grade B) · 68–69 Acceptable threshold · 50–67 Poor · di bawah 50 Not acceptable.
        </p>
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
