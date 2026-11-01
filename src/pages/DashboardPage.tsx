import { ArrowRight, BookOpen, BrainCircuit, ClipboardList, Gauge, History, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { directionColor } from '../components/charts/colors';
import { Badge, Card, PageHeader, SectionTitle } from '../components/ui';
import { fmtMath, fmtNum } from '../lib/format';
import { agreement, isDialedIn } from '../lib/stats';
import { useApp, useCurrentUser } from '../store/useApp';

/** Halaman utama setelah masuk: memilih modul Kalibrasi (Fuzzy Mamdani) atau Resep, sesuai alur Gambar III.1. */
export function DashboardPage() {
  const user = useCurrentUser();
  const sessions = useApp((s) => s.sessions);
  const recipes = useApp((s) => s.recipes);
  const activeSessionId = useApp((s) => s.activeSessionId);
  const grinder = useApp((s) => s.grinder);
  const sus = useApp((s) => s.susResponses);
  const active = sessions.find((s) => s.id === activeSessionId) ?? null;
  const allShots = sessions.flatMap((s) => s.shots.map((x) => ({ ...x, bean: s.beanName })));
  const last = [...allShots].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const agr = agreement(sessions);
  const dialed = allShots.filter(isDialedIn).length;
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <PageHeader
        title={`Halo, ${user?.name.split(' ')[0] ?? 'Barista'}`}
        subtitle={`${today} · ${user?.role === 'head' ? 'Head Barista' : 'Barista'}`}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ModuleCard
          to="/kalibrasi"
          icon={<Gauge className="size-8" />}
          tag="Modul 1"
          title="Kalibrasi Espresso"
          desc="Input dose, yield, waktu ekstraksi, dan profil rasa. Smart Assistant (Fuzzy Mamdani) merekomendasikan arah dan besar putaran grinder."
          meta={active ? `Sesi aktif: ${active.beanName} · ${active.shots.length} shot` : 'Belum ada sesi aktif'}
          accent="#6b4226"
        />
        <ModuleCard
          to="/resep"
          icon={<BookOpen className="size-8" />}
          tag="Modul 2"
          title="Resep Menu"
          desc="Komposisi, takaran gramasi, urutan pembuatan (SOP), dan Mode Seduh langkah demi langkah untuk menu kedai."
          meta={`${recipes.length} resep tersimpan`}
          accent="#c27a2e"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Shot terakhir">
          {last ? (
            <>
              <span className="rounded-full px-2.5 py-0.5 text-sm font-semibold text-white" style={{ background: directionColor(last.direction) }}>
                {last.direction === 'tetap' ? 'Tetap' : `${last.direction === 'halus' ? 'Perhalus' : 'Perkasar'} ${fmtNum(last.amount, 2)} ${grinder.unitLabel}`}
              </span>
              <div className="mt-1 text-sm text-muted">
                {last.bean} · {fmtMath(last.time, 1)} s{isDialedIn(last) ? ' · Terkalibrasi' : ''}
              </div>
            </>
          ) : (
            <span className="text-muted">Belum ada</span>
          )}
        </Stat>
        <Stat label="Setting grinder terakhir">
          <span className="tabular font-display text-2xl font-semibold">
            {last?.newSetting ?? last?.grindSetting ?? '–'} {last?.grindSetting !== null && last ? grinder.unitLabel : ''}
          </span>
          <div className="text-sm text-muted">{grinder.name}</div>
        </Stat>
        <Stat label="Shot terkalibrasi">
          <span className="tabular font-display text-2xl font-semibold">
            {allShots.length ? `${fmtMath((dialed / allShots.length) * 100, 1)}%` : '–'}
          </span>
          <div className="text-sm text-muted">
            {dialed} dari {allShots.length} shot
          </div>
        </Stat>
        <Stat label="Agreement rate">
          <span className="tabular font-display text-2xl font-semibold">{agr.rate === null ? '–' : `${fmtMath(agr.rate, 1)}%`}</span>
          <div className="text-sm text-muted">{agr.judged ? `${agr.agreed} / ${agr.judged} shot sesuai pakar` : 'Belum dinilai pakar'}</div>
        </Stat>
      </div>

      <Card className="mt-4">
        <SectionTitle>Menu lainnya</SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink to="/riwayat" icon={<History className="size-5" />} label="Riwayat Kalibrasi" />
          <QuickLink to="/pakar" icon={<BrainCircuit className="size-5" />} label="Basis Pengetahuan" />
          <QuickLink to="/sus" icon={<ClipboardList className="size-5" />} label="Kuesioner SUS" badge={sus.length ? `${sus.length} responden` : undefined} />
          <QuickLink to="/pengaturan" icon={<Settings className="size-5" />} label="Pengaturan" />
        </div>
      </Card>
    </>
  );
}

function ModuleCard({ to, icon, tag, title, desc, meta, accent }: { to: string; icon: React.ReactNode; tag: string; title: string; desc: string; meta: string; accent: string }) {
  return (
    <Link
      to={to}
      className="group relative flex flex-col overflow-hidden rounded-3xl p-6 text-white transition hover:brightness-110 md:p-7"
      style={{ background: `linear-gradient(135deg, ${accent}, #2a1d15)` }}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15">{icon}</span>
        <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">{tag}</span>
      </div>
      <h2 className="mt-4 font-display text-3xl font-semibold">{title}</h2>
      <p className="mt-2 text-white/85">{desc}</p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-sm text-white/75">{meta}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#2a1d15]">
          Buka <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-4">
      <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">{label}</div>
      {children}
    </div>
  );
}

function QuickLink({ to, icon, label, badge }: { to: string; icon: React.ReactNode; label: string; badge?: string }) {
  return (
    <Link to={to} className="flex h-14 items-center gap-3 rounded-2xl border border-line px-4 font-semibold transition hover:border-brand/50 hover:bg-surface-2">
      <span className="text-muted">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && <Badge>{badge}</Badge>}
    </Link>
  );
}
