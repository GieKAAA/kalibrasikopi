import { useState } from 'react';
import { HOLD_THRESHOLD, type GrinderConfig, type Recommendation } from '../fuzzy/advice';
import { INPUT_KEYS } from '../fuzzy/engine';
import { membershipCase } from '../fuzzy/membership';
import type { CentroidSegment, FuzzyTerm, FuzzyVariable, InferenceResult, KnowledgeBase } from '../fuzzy/types';
import { fmtMath, fmtSub } from '../lib/format';
import { MembershipChart } from './charts/MembershipChart';
import { termColor } from './charts/colors';
import { Button, cx } from './ui';

const m = (x: number) => fmtMath(x, 3);
const pts = (t: FuzzyTerm) => `(${t.points.map((p) => fmtMath(p, 2)).join('; ')})`;

function termLabel(kb: KnowledgeBase, key: keyof KnowledgeBase['inputs'] | 'grind', term: string) {
  const v = key === 'grind' ? kb.output : kb.inputs[key];
  return v.terms.find((t) => t.key === term)?.label ?? term;
}

/** Penulisan substitusi derajat keanggotaan trapesium untuk satu himpunan. */
export function membershipWorking(x: number, t: FuzzyTerm): string {
  const [a, b, c, d] = t.points;
  const X = fmtSub(x, 2);
  switch (membershipCase(x, t.points)) {
    case 'outside':
      return x < a ? `x = ${fmtMath(x, 2)} < a = ${fmtMath(a, 2)} → μ = 0` : `x = ${fmtMath(x, 2)} > d = ${fmtMath(d, 2)} → μ = 0`;
    case 'plateau':
      return `b ≤ x ≤ c (${fmtMath(b, 2)} ≤ ${fmtMath(x, 2)} ≤ ${fmtMath(c, 2)}) → μ = 1`;
    case 'rise':
      return `(x − a)/(b − a) = (${X} − ${fmtSub(a, 2)})/(${fmtSub(b, 2)} − ${fmtSub(a, 2)}) = ${fmtMath(x - a, 2)}/${fmtMath(b - a, 2)} = ${m((x - a) / (b - a))}`;
    case 'fall':
      return `(d − x)/(d − c) = (${fmtSub(d, 2)} − ${X})/(${fmtSub(d, 2)} − ${fmtSub(c, 2)}) = ${fmtMath(d - x, 2)}/${fmtMath(d - c, 2)} = ${m((d - x) / (d - c))}`;
  }
}

/** Rumus μ(z) pada satu segmen daerah agregasi. */
function segmentFormula(s: CentroidSegment, output: FuzzyVariable): string {
  const t = output.terms.find((x) => x.key === s.termKey)!;
  const [a, b, c, d] = t.points;
  if (s.piece === 'clip') return `${m(s.clip)} (konstan)`;
  if (s.piece === 'rise') return `(z − ${fmtSub(a, 2)})/(${fmtSub(b, 2)} − ${fmtSub(a, 2)})`;
  return `(${fmtSub(d, 2)} − z)/(${fmtSub(d, 2)} − ${fmtSub(c, 2)})`;
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

function Formula({ children }: { children: React.ReactNode }) {
  return <div className="tabular rounded-2xl bg-surface-2 px-4 py-3 text-[15px] leading-relaxed">{children}</div>;
}

const th = 'px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted uppercase';
const td = 'px-3 py-2 align-top';

/**
 * Jejak perhitungan Mamdani lengkap: setiap angka ditulis beserta rumus dan substitusinya,
 * sehingga dapat disalin ke naskah dan diverifikasi ulang secara manual.
 */
export function FuzzyTrace({
  kb,
  result,
  rec,
  grinder,
}: {
  kb: KnowledgeBase;
  result: InferenceResult;
  rec: Recommendation | null;
  grinder: GrinderConfig;
}) {
  const [showAll, setShowAll] = useState(false);
  const rules = showAll ? result.fired : result.fired.slice(0, 6);
  const activeTerms = kb.output.terms.filter((t) => (result.clips[t.key] ?? 0) > 0);

  return (
    <div className="space-y-8">
      <Step n={1} title="Fuzzifikasi — nilai tegas → derajat keanggotaan μ">
        <p className="mb-3 text-sm text-muted">
          Fungsi trapesium (a; b; c; d): μ = 0 bila x &lt; a atau x &gt; d; μ = (x − a)/(b − a) bila a ≤ x &lt; b; μ = 1 bila b ≤ x ≤ c; μ = (d − x)/(d − c) bila c &lt; x ≤ d.
        </p>
        <div className="space-y-3">
          {INPUT_KEYS.map((key) => {
            const v = kb.inputs[key];
            const x = result.inputs[key];
            return (
              <div key={key} className="rounded-2xl border border-line p-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">{v.label}</span>
                  <span className="tabular font-bold">
                    x = {fmtMath(x, 2)} {v.unit}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <MembershipChart variable={v} value={x} height={170} compact />
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[380px] text-sm">
                      <thead>
                        <tr>
                          <th className={th}>Himpunan (a; b; c; d)</th>
                          <th className={th}>Substitusi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.terms.map((t, i) => {
                          const mu = result.fuzzified[key][t.key] ?? 0;
                          return (
                            <tr key={t.key} className={cx('border-t border-line', mu === 0 && 'text-muted')}>
                              <td className={td}>
                                <span className="font-semibold" style={{ color: termColor(key, i) }}>
                                  {t.label}
                                </span>
                                <div className="tabular text-xs text-muted">{pts(t)}</div>
                              </td>
                              <td className={cx(td, 'tabular')}>
                                μ<sub>{t.label}</sub>({fmtMath(x, 2)}): {membershipWorking(x, t)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Step>

      <Step n={2} title={`Evaluasi aturan — ${result.fired.length} dari ${kb.rules.length} aturan aktif, α-predikat = MIN`}>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className={th}>Aturan</th>
                <th className={th}>JIKA … MAKA …</th>
                <th className={th}>α-predikat</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((f) => (
                <tr key={f.rule.id} className="border-t border-line">
                  <td className={cx(td, 'font-semibold')}>{f.rule.id}</td>
                  <td className={cx(td, 'text-muted')}>
                    <b className="text-ink">JIKA</b>{' '}
                    {INPUT_KEYS.map((k, i) => (
                      <span key={k}>
                        {i > 0 && <b className="text-ink"> DAN </b>}
                        {kb.inputs[k].label} <span className="text-ink">{termLabel(kb, k, f.rule.if[k])}</span>
                      </span>
                    ))}{' '}
                    <b className="text-ink">MAKA</b> Grind <span className="font-semibold text-ink">{termLabel(kb, 'grind', f.rule.then)}</span>
                  </td>
                  <td className={cx(td, 'tabular whitespace-nowrap')}>
                    α<sub>{f.rule.id.slice(1)}</sub> = min({INPUT_KEYS.map((k) => m(f.degrees[k])).join('; ')}) = <b>{m(f.alpha)}</b>
                  </td>
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
        <p className="mt-2 text-sm text-muted">Aturan lain bernilai α = 0 karena minimal satu premisnya berderajat keanggotaan 0.</p>
      </Step>

      <Step n={3} title="Implikasi MIN & komposisi MAX">
        <Formula>
          {activeTerms.map((t) => {
            const alphas = result.fired.filter((f) => f.rule.then === t.key);
            return (
              <div key={t.key}>
                α<sub>{t.label}</sub> = {alphas.length > 1 ? `max(${alphas.map((f) => m(f.alpha)).join('; ')}) = ` : ''}
                <b>{m(result.clips[t.key])}</b>
                <span className="text-muted"> ({alphas.map((f) => f.rule.id).join(', ')})</span>
              </div>
            );
          })}
          <div className="mt-2 text-muted">
            μ<sub>agr</sub>(z) = max{'{'}
            {activeTerms.map((t) => `min(${m(result.clips[t.key])}; μ_${t.label}(z))`).join(', ')}
            {'}'}
          </div>
        </Formula>
      </Step>

      <Step n={4} title="Defuzzifikasi — Centroid (Center of Area)">
        <div className="mb-3 max-w-3xl rounded-2xl border border-line p-3">
          <MembershipChart variable={kb.output} curve={result.curve} centroid={result.crisp} height={200} />
        </div>
        <Formula>
          z* = ∫ z·μ(z) dz / ∫ μ(z) dz = Σ Mᵢ / Σ Aᵢ
          <div className="text-sm text-muted">
            Tiap segmen linear: Aᵢ = ½(μ₀ + μ₁)(z₁ − z₀), Mᵢ = (z₁ − z₀)/6 · [z₀(2μ₀ + μ₁) + z₁(μ₀ + 2μ₁)]
          </div>
        </Formula>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className={th}>Daerah</th>
                <th className={th}>Rentang z</th>
                <th className={th}>μ(z)</th>
                <th className={cx(th, 'text-right')}>Luas A</th>
                <th className={cx(th, 'text-right')}>Momen M</th>
              </tr>
            </thead>
            <tbody>
              {result.segments.map((s, i) => (
                <tr key={i} className="border-t border-line">
                  <td className={td}>
                    {i + 1}. {termLabel(kb, 'grind', s.termKey)}
                  </td>
                  <td className={cx(td, 'tabular whitespace-nowrap')}>
                    {m(s.z0)} ≤ z ≤ {m(s.z1)}
                  </td>
                  <td className={cx(td, 'tabular')}>{segmentFormula(s, kb.output)}</td>
                  <td className={cx(td, 'tabular text-right')}>{fmtMath(s.area, 4)}</td>
                  <td className={cx(td, 'tabular text-right')}>{fmtMath(s.moment, 4)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-line font-semibold">
                <td className={td} colSpan={3}>
                  Jumlah
                </td>
                <td className={cx(td, 'tabular text-right')}>{fmtMath(result.denominator, 4)}</td>
                <td className={cx(td, 'tabular text-right')}>{fmtMath(result.numerator, 4)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Formula>
          z* = {fmtMath(result.numerator, 4)} / {fmtMath(result.denominator, 4)} = <b>{result.crisp === null ? '–' : `${m(result.crisp)} step`}</b>
        </Formula>
      </Step>

      {rec && result.crisp !== null && (
        <Step n={5} title="Interpretasi keluaran → instruksi grinder">
          <Formula>
            {Math.abs(result.crisp) < HOLD_THRESHOLD ? (
              <>
                |z*| = {m(Math.abs(result.crisp))} &lt; {fmtMath(HOLD_THRESHOLD, 2)} → <b>{rec.headline}</b>
              </>
            ) : (
              <>
                |z*| × skala grinder = {m(Math.abs(result.crisp))} × {fmtMath(grinder.unitsPerStep, 2)} = {m(Math.abs(result.crisp) * grinder.unitsPerStep)}{' '}
                {grinder.unitLabel}, dibulatkan ke kelipatan {fmtMath(grinder.resolution, 2)} = <b>{fmtMath(rec.amount, 2)} {grinder.unitLabel}</b>
                {Math.round((Math.abs(result.crisp) * grinder.unitsPerStep) / grinder.resolution) * grinder.resolution < rec.amount && (
                  <span className="text-muted"> (minimal satu langkah dial karena |z*| ≥ {fmtMath(HOLD_THRESHOLD, 2)})</span>
                )}
                <div>
                  z* {result.crisp < 0 ? '< 0 → arah halus' : '> 0 → arah kasar'} → <b>{rec.headline}</b> {fmtMath(rec.amount, 2)} {grinder.unitLabel}
                </div>
              </>
            )}
          </Formula>
        </Step>
      )}
    </div>
  );
}
