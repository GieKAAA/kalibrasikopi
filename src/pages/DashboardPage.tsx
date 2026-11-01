import { ArrowRight, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { directionColor } from '../components/charts/colors';
import { Card, LinkButton, PageHeader, SectionTitle } from '../components/ui';
import { tasteLabel } from '../fuzzy/advice';
import { fmtDateTime, fmtNum } from '../lib/format';
import { agreement, isDialedIn } from '../lib/stats';
import { RECIPE_CATEGORIES } from '../store/types';
import { useApp, useCurrentUser, useIsHead } from '../store/useApp';

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/** Halaman utama setelah masuk: Modul 1 (Kalibrasi) dan Modul 2 (Resep), sesuai alur Gambar III.1. */
export function DashboardPage() {
  const user = useCurrentUser();
  const isHead = useIsHead();
  const sessions = useApp((s) => s.sessions);
  const recipes = useApp((s) => s.recipes);
  const activeSessionId = useApp((s) => s.activeSessionId);
  const grinder = useApp((s) => s.grinder);
  const draft = useApp((s) => s.draft);
  const kb = useApp((s) => s.kb);
  const sus = useApp((s) => s.susResponses);
  const active = sessions.find((s) => s.id === activeSessionId) ?? null;
  const shots = sessions
    .flatMap((s) => s.shots.map((x) => ({ ...x, bean: s.beanName })))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const last = shots[0];
  const unjudged = shots.filter((s) => !s.expertDecision).length;
  const agr = agreement(sessions);
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const unit = grinder.unitLabel;
  const setting = draft.grindSetting;
  const dirText = (d: (typeof shots)[number]) =>
    isDialedIn(d) ? 'Terkalibrasi' : d.direction === 'tetap' ? 'Tetap' : `${d.direction === 'halus' ? 'Perhalus' : 'Perkasar'} ${fmtNum(d.amount, 2)} ${unit}`;

  return (
    <>
      <PageHeader title={`${greeting()}, ${user?.name.split(' ')[0] ?? 'Barista'}`} subtitle={`${today} · ${user?.role === 'head' ? 'Head Barista' : 'Barista'}`} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="flex flex-col">
          <div className="text-sm font-medium text-muted">Modul 1</div>
          <h2 className="mt-0.5 text-xl font-semibold">Kalibrasi espresso</h2>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-3">
            <Readout label="Sesi berjalan">{active ? active.beanName : 'Tidak ada'}</Readout>
            <Readout label="Setting grinder sekarang">
              {setting === null ? '–' : (
                <>
                  <span className="tabular">{fmtNum(setting, 2)}</span> <span className="text-base font-medium text-muted">{unit}</span>
                </>
              )}
            </Readout>
            <Readout label="Shot terakhir">
              {last ? <span style={{ color: directionColor(last.direction) }}>{dirText(last)}</span> : '–'}
            </Readout>
          </div>
          <div className="mt-auto pt-5">
            <LinkButton to="/kalibrasi" size="lg" className="w-full sm:w-auto">
              {active ? `Lanjutkan sesi (${active.shots.length} shot)` : 'Mulai kalibrasi'} <ArrowRight className="size-5" />
            </LinkButton>
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="text-sm font-medium text-muted">Modul 2</div>
          <h2 className="mt-0.5 text-xl font-semibold">Resep menu</h2>
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {RECIPE_CATEGORIES.map((c) => (
              <li key={c}>
                <Link to={`/resep?kategori=${encodeURIComponent(c)}`} className="flex h-12 items-center justify-between gap-3 text-[15px] hover:text-ink">
                  <span className="font-medium">{c}</span>
                  <span className="flex items-center gap-1 text-muted">
                    {recipes.filter((r) => r.category === c).length} resep <ChevronRight className="size-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-4">
            <LinkButton to="/resep" size="lg" variant="outline" className="w-full sm:w-auto">
              Buka buku resep <ArrowRight className="size-5" />
            </LinkButton>
          </div>
        </Card>
      </div>

      {shots.length > 0 && (
        <Card className="mt-5">
          <SectionTitle
            action={
              <Link to="/riwayat" className="text-sm font-semibold text-muted hover:text-ink">
                Semua riwayat
              </Link>
            }
          >
            Shot terakhir
          </SectionTitle>
          <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            <table className="tabular w-full min-w-[560px] text-[15px]">
              <thead className="text-left text-sm text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3 font-medium">Waktu catat</th>
                  <th className="py-2 pr-3 font-medium">Biji</th>
                  <th className="py-2 pr-3 font-medium">Shot</th>
                  <th className="py-2 pr-3 font-medium">Rasa</th>
                  <th className="py-2 font-medium">Saran</th>
                </tr>
              </thead>
              <tbody>
                {shots.slice(0, 5).map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="py-2.5 pr-3 text-muted">{fmtDateTime(s.createdAt)}</td>
                    <td className="py-2.5 pr-3">{s.bean}</td>
                    <td className="py-2.5 pr-3">
                      {fmtNum(s.dose)}→{fmtNum(s.yield)} g · {fmtNum(s.time)} s
                    </td>
                    <td className="py-2.5 pr-3">{tasteLabel(s.taste)}</td>
                    <td className="py-2.5 font-semibold" style={{ color: directionColor(s.direction) }}>
                      {dirText(s)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {isHead && (
        <Card className="mt-5">
          <SectionTitle
            action={
              <Link to="/head-barista" className="text-sm font-semibold text-muted hover:text-ink">
                Buka menu Head Barista
              </Link>
            }
          >
            Tugas Head Barista
          </SectionTitle>
          <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <TaskRow to="/riwayat" label="Nilai shot barista" value={unjudged ? `${unjudged} belum dinilai` : agr.judged ? `Kesesuaian ${fmtNum(agr.rate, 1)}%` : 'Belum ada shot'} />
            <TaskRow to="/pakar" label="Basis pengetahuan" value={`${kb.rules.length} aturan`} />
            <TaskRow to="/sus" label="Kuesioner SUS" value={`${sus.length} responden`} />
            <TaskRow to="/head-barista" label="Grinder & akun barista" value={grinder.name} />
          </ul>
        </Card>
      )}
    </>
  );
}

function Readout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold">{children}</div>
    </div>
  );
}

function TaskRow({ to, label, value }: { to: string; label: string; value: string }) {
  return (
    <li className="border-b border-line last:border-0 sm:[&:nth-last-child(2)]:border-0">
      <Link to={to} className="flex h-12 items-center justify-between gap-3 text-[15px]">
        <span className="font-medium">{label}</span>
        <span className="flex items-center gap-1 text-muted">
          {value} <ChevronRight className="size-4" />
        </span>
      </Link>
    </li>
  );
}
