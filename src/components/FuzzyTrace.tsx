import { useState } from 'react';
import { INPUT_KEYS } from '../fuzzy/engine';
import type { InferenceResult, KnowledgeBase } from '../fuzzy/types';
import { fmtNum } from '../lib/format';
import { MembershipChart } from './charts/MembershipChart';
import { termColor } from './charts/colors';
import { Button, cx } from './ui';

function termLabel(kb: KnowledgeBase, key: keyof KnowledgeBase['inputs'] | 'grind', term: string) {
  const v = key === 'grind' ? kb.output : kb.inputs[key];
  return v.terms.find((t) => t.key === term)?.label ?? term;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="relative pl-11">
      <div className="absolute top-0 left-0 flex size-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-ink">{n}</div>
      <h3 className="mb-3 pt-1 font-semibold">{title}</h3>
      {children}
    </div>
  );
}

/** Jejak perhitungan Mamdani lengkap — transparan & dapat diaudit (untuk barista maupun penguji). */
export function FuzzyTrace({ kb, result }: { kb: KnowledgeBase; result: InferenceResult }) {
  const [showAll, setShowAll] = useState(false);
  const rules = showAll ? result.fired : result.fired.slice(0, 6);

  return (
    <div className="space-y-8">
      <Step n={1} title="Fuzzifikasi — nilai tegas → derajat keanggotaan">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {INPUT_KEYS.map((key) => {
            const v = kb.inputs[key];
            return (
              <div key={key} className="rounded-2xl border border-line p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{v.label}</span>
                  <span className="tabular text-sm font-bold">
                    {fmtNum(result.inputs[key], 2)} {v.unit}
                  </span>
                </div>
                <MembershipChart variable={v} value={result.inputs[key]} height={170} compact />
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {v.terms.map((t, i) => {
                    const mu = result.fuzzified[key][t.key] ?? 0;
                    return (
                      <span
                        key={t.key}
                        className={cx('tabular rounded-full px-2 py-0.5 text-xs font-semibold', mu > 0 ? 'text-white' : 'bg-surface-2 text-muted')}
                        style={mu > 0 ? { background: termColor(key, i) } : undefined}
                      >
                        μ {t.label} = {fmtNum(mu, 2)}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Step>

      <Step n={2} title={`Evaluasi aturan — ${result.fired.length} dari ${kb.rules.length} aturan aktif (α = MIN)`}>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Aturan</th>
                <th className="px-3 py-2">JIKA</th>
                <th className="px-3 py-2">MAKA Grind</th>
                <th className="px-3 py-2 text-right">α</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((f) => (
                <tr key={f.rule.id} className="border-t border-line align-top">
                  <td className="px-3 py-2 font-semibold">{f.rule.id}</td>
                  <td className="px-3 py-2 text-muted">
                    {INPUT_KEYS.map((k, i) => (
                      <span key={k}>
                        {i > 0 && <b className="text-ink"> ∧ </b>}
                        {kb.inputs[k].label.split(' ')[0]} <span className="text-ink">{termLabel(kb, k, f.rule.if[k])}</span>
                        <span className="tabular text-xs"> ({fmtNum(f.degrees[k], 2)})</span>
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{termLabel(kb, 'grind', f.rule.then)}</td>
                  <td className="tabular px-3 py-2 text-right font-bold">{fmtNum(f.alpha, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.fired.length > 6 && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Tampilkan lebih sedikit' : `Tampilkan semua ${result.fired.length} aturan`}
          </Button>
        )}
      </Step>

      <Step n={3} title="Implikasi MIN & komposisi MAX">
        <div className="flex flex-wrap gap-2">
          {kb.output.terms.map((t, i) => {
            const clip = result.clips[t.key] ?? 0;
            return (
              <span
                key={t.key}
                className={cx('tabular rounded-xl border px-3 py-1.5 text-sm font-semibold', clip > 0 ? 'border-transparent text-white' : 'border-line text-muted')}
                style={clip > 0 ? { background: termColor('grind', i) } : undefined}
              >
                {t.label}: {fmtNum(clip, 2)}
              </span>
            );
          })}
        </div>
      </Step>

      <Step n={4} title="Defuzzifikasi — Centroid (Center of Area)">
        <div className="rounded-2xl border border-line p-3">
          <MembershipChart variable={kb.output} curve={result.curve} centroid={result.crisp} height={200} />
        </div>
        <p className="tabular mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-[15px]">
          z* = Σ z·μ(z) / Σ μ(z) = {fmtNum(result.numerator, 3)} / {fmtNum(result.denominator, 3)} ={' '}
          <b>{result.crisp === null ? '–' : `${fmtNum(result.crisp, 3)} step`}</b>
        </p>
      </Step>
    </div>
  );
}
