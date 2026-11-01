import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { HeadOnly } from '../components/HeadOnly';
import { Card, LinkButton, PageHeader, SectionTitle } from '../components/ui';
import { fmtDateTime, fmtNum } from '../lib/format';
import { agreement } from '../lib/stats';
import { scoreSus, susCategory } from '../lib/sus';
import { useApp } from '../store/useApp';
import { DataCard, GrinderCard, UsersCard } from './SettingsPage';

/**
 * Menu Head Barista: semua yang hanya boleh diatur pakar dikumpulkan di satu tempat —
 * penilaian shot (agreement), basis pengetahuan, kuesioner SUS, grinder, akun barista, dan cadangan data.
 */
export function HeadBaristaPage() {
  return (
    <HeadOnly>
      <HeadBaristaContent />
    </HeadOnly>
  );
}

function HeadBaristaContent() {
  const sessions = useApp((s) => s.sessions);
  const kb = useApp((s) => s.kb);
  const sus = useApp((s) => s.susResponses);
  const withShots = sessions.filter((s) => s.shots.length > 0);
  const agr = agreement(withShots);
  const pending = withShots
    .map((s) => ({ s, n: s.shots.filter((x) => !x.expertDecision).length }))
    .filter((x) => x.n > 0)
    .slice(0, 4);
  const totalPending = withShots.reduce((n, s) => n + s.shots.filter((x) => !x.expertDecision).length, 0);
  const susMean = sus.length ? sus.reduce((t, r) => t + scoreSus(r.answers).score, 0) / sus.length : null;

  return (
    <>
      <PageHeader title="Head Barista" subtitle="Penilaian pakar dan pengaturan kedai. Menu ini hanya terlihat oleh akun Head Barista." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="flex flex-col">
          <SectionTitle description="Isi keputusan Anda (arah dan jumlah klik) untuk setiap shot, tanpa melihat saran sistem.">Penilaian shot</SectionTitle>
          <div className="grid grid-cols-2 gap-4 border-t border-line pt-4">
            <Figure label="Kesesuaian sistem" value={agr.rate === null ? '–' : `${fmtNum(agr.rate, 1)}%`} note={agr.judged ? `${agr.agreed} dari ${agr.judged} shot` : 'Belum ada penilaian'} />
            <Figure label="Belum dinilai" value={String(totalPending)} note="shot" />
          </div>
          {pending.length > 0 && (
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {pending.map(({ s, n }) => (
                <li key={s.id}>
                  <Link to={`/riwayat/${s.id}`} className="flex h-11 items-center justify-between gap-3 text-[15px]">
                    <span className="truncate font-medium">{s.beanName}</span>
                    <span className="shrink-0 text-sm text-muted">{n} shot · {fmtDateTime(s.startedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto pt-4">
            <LinkButton to="/riwayat" variant="outline" className="w-full">
              Nilai shot di Riwayat <ArrowRight className="size-5" />
            </LinkButton>
          </div>
        </Card>

        <Card className="flex flex-col">
          <SectionTitle description="Himpunan fuzzy dan aturan JIKA–MAKA yang dipakai sistem untuk memberi saran.">Basis pengetahuan</SectionTitle>
          <div className="grid grid-cols-2 gap-4 border-t border-line pt-4">
            <Figure label="Aturan" value={String(kb.rules.length)} note="kombinasi input" />
            <Figure label="Terakhir diubah" value={fmtDateTime(kb.updatedAt).split(',')[0]} note={kb.updatedBy} small />
          </div>
          <div className="mt-auto pt-4">
            <LinkButton to="/pakar" variant="outline" className="w-full">
              Buka basis pengetahuan <ArrowRight className="size-5" />
            </LinkButton>
          </div>
        </Card>

        <Card className="flex flex-col">
          <SectionTitle description="Kuesioner System Usability Scale untuk responden setelah mencoba aplikasi.">Kuesioner SUS</SectionTitle>
          <div className="grid grid-cols-2 gap-4 border-t border-line pt-4">
            <Figure label="Responden" value={String(sus.length)} note="orang" />
            <Figure label="Skor rata-rata" value={susMean === null ? '–' : fmtNum(susMean, 2)} note={susMean === null ? '' : susCategory(susMean)} />
          </div>
          <div className="mt-auto pt-4">
            <LinkButton to="/sus" variant="outline" className="w-full">
              Buka kuesioner <ArrowRight className="size-5" />
            </LinkButton>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <GrinderCard editable />
          <DataCard isHead />
        </div>
        <UsersCard />
      </div>
    </>
  );
}

function Figure({ label, value, note, small }: { label: string; value: ReactNode; note?: string; small?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-sm text-muted">{label}</div>
      <div className={small ? 'mt-1 truncate text-lg font-semibold' : 'readout mt-1 text-[28px]'}>{value}</div>
      {note && <div className="mt-1 truncate text-sm text-muted">{note}</div>}
    </div>
  );
}
