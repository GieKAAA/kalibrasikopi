import {
  ArrowLeft,
  BookOpen,
  Coffee,
  Droplets,
  Flame,
  Gauge,
  Leaf,
  Milk,
  Pencil,
  Play,
  Plus,
  Search,
  Snowflake,
  Sparkles,
  Timer,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, ConfirmDialog, cx, EmptyState, LinkButton, PageHeader, SectionTitle, TextInput } from '../components/ui';
import { fmtDateTime, fmtNum } from '../lib/format';
import { RECIPE_CATEGORIES, type Recipe, type RecipeCategory } from '../store/types';
import { useApp, useIsHead } from '../store/useApp';

export const CATEGORY_STYLE: Record<RecipeCategory, { icon: typeof Coffee; color: string }> = {
  Espresso: { icon: Coffee, color: '#6b4226' },
  'Kopi Susu': { icon: Milk, color: '#a0703f' },
  Signature: { icon: Sparkles, color: '#c27a2e' },
  'Manual Brew': { icon: Droplets, color: '#2f6f8f' },
  'Non-Kopi': { icon: Leaf, color: '#3f7f4f' },
};

export function RecipesPage() {
  const { id } = useParams();
  const recipes = useApp((s) => s.recipes);
  const isHead = useIsHead();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<RecipeCategory | 'Semua'>('Semua');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes
      .filter((r) => category === 'Semua' || r.category === category)
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q)))
      .sort((a, b) => RECIPE_CATEGORIES.indexOf(a.category) - RECIPE_CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name));
  }, [recipes, query, category]);

  const selected = recipes.find((r) => r.id === id) ?? null;

  return (
    <div className="lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-8">
      <div className={cx('lg:sticky lg:top-0 lg:-my-7 lg:max-h-dvh lg:overflow-y-auto lg:py-7 lg:pr-2', selected && 'hidden lg:block')}>
        <PageHeader
          title="Resep"
          subtitle="Buku resep standar kedai"
          actions={
            isHead && (
              <LinkButton to="/resep/baru">
                <Plus className="size-5" /> Resep baru
              </LinkButton>
            )
          }
        />
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari menu atau bahan…" className="pl-11" aria-label="Cari resep" />
        </div>
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {(['Semua', ...RECIPE_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cx(
                'h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition',
                category === c ? 'bg-ink text-bg' : 'bg-surface-2 text-muted hover:text-ink',
              )}
            >
              {c}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<BookOpen className="size-7" />} title="Resep tidak ditemukan">
            Coba kata kunci lain atau pilih kategori Semua.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {filtered.map((r) => (
              <li key={r.id}>
                <RecipeListItem recipe={r} active={r.id === id} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cx(!selected && 'hidden lg:block')}>
        {selected ? (
          <RecipeDetail recipe={selected} />
        ) : id ? (
          <EmptyState icon={<BookOpen className="size-7" />} title="Resep tidak ditemukan" action={<LinkButton to="/resep" variant="secondary">Kembali</LinkButton>} />
        ) : (
          <div className="sticky top-7 mt-[88px]">
            <EmptyState icon={<BookOpen className="size-7" />} title="Pilih resep">
              Pilih menu di sebelah kiri untuk melihat takaran, urutan pembuatan, dan catatan penyajian.
            </EmptyState>
          </div>
        )}
      </div>
    </div>
  );
}

function RecipeListItem({ recipe, active }: { recipe: Recipe; active: boolean }) {
  const style = CATEGORY_STYLE[recipe.category];
  const Icon = style.icon;
  return (
    <Link
      to={`/resep/${recipe.id}`}
      className={cx(
        'flex items-center gap-4 rounded-2xl border p-3 transition',
        active ? 'border-brand bg-brand-soft/60' : 'border-line bg-surface hover:border-brand/50',
      )}
    >
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: style.color }}>
        <Icon className="size-7" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px] font-semibold">{recipe.name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-sm text-muted">
          <span>{recipe.category}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            {recipe.temperature === 'Dingin' ? <Snowflake className="size-3.5" /> : <Flame className="size-3.5" />}
            {recipe.temperature}
          </span>
          {recipe.espresso && (
            <>
              <span>·</span>
              <span className="tabular">
                {fmtNum(recipe.espresso.dose)}→{fmtNum(recipe.espresso.yield)} g
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const navigate = useNavigate();
  const isHead = useIsHead();
  const deleteRecipe = useApp((s) => s.deleteRecipe);
  const setDraft = useApp((s) => s.setDraft);
  const [confirm, setConfirm] = useState(false);
  const style = CATEGORY_STYLE[recipe.category];
  const Icon = style.icon;

  return (
    <article className="space-y-4">
      <Link to="/resep" className="inline-flex h-11 items-center gap-2 rounded-xl pr-3 font-semibold text-muted hover:text-ink lg:hidden">
        <ArrowLeft className="size-5" /> Semua resep
      </Link>

      <div className="relative overflow-hidden rounded-3xl p-6 text-white md:p-8" style={{ background: `linear-gradient(135deg, ${style.color}, #2a1d15)` }}>
        <Icon aria-hidden className="absolute -right-6 -bottom-8 size-48 opacity-15" />
        <div className="relative">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">{recipe.category}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
              {recipe.temperature === 'Dingin' ? <Snowflake className="size-4" /> : <Flame className="size-4" />} {recipe.temperature}
            </span>
          </div>
          <h1 className="mt-3 font-display text-4xl font-semibold md:text-5xl">{recipe.name}</h1>
          {recipe.description && <p className="mt-2 max-w-2xl text-lg text-white/85">{recipe.description}</p>}
          <p className="mt-3 text-sm text-white/75">Penyajian: {recipe.vessel || '-'}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <LinkButton to={`/resep/${recipe.id}/seduh`} size="lg" className="bg-white !text-[#2a1d15]">
              <Play className="size-5" fill="currentColor" /> Mode Seduh
            </LinkButton>
            {isHead && (
              <>
                <LinkButton to={`/resep/${recipe.id}/edit`} size="lg" variant="ghost" className="!text-white hover:!bg-white/15">
                  <Pencil className="size-5" /> Ubah
                </LinkButton>
                <Button size="lg" variant="ghost" className="!text-white hover:!bg-white/15" onClick={() => setConfirm(true)}>
                  <Trash2 className="size-5" /> Hapus
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {recipe.espresso && (
        <Card className="flex flex-wrap items-center gap-x-8 gap-y-4">
          {[
            ['Dose', `${fmtNum(recipe.espresso.dose)} g`],
            ['Yield', `${fmtNum(recipe.espresso.yield)} g`],
            ['Waktu', `${recipe.espresso.timeMin}–${recipe.espresso.timeMax} s`],
            ['Rasio', `1:${fmtNum(recipe.espresso.yield / recipe.espresso.dose, 1)}`],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-xs font-semibold tracking-wide text-muted uppercase">{k}</div>
              <div className="tabular text-2xl font-bold">{v}</div>
            </div>
          ))}
          <Button
            variant="secondary"
            className="ml-auto"
            onClick={() => {
              setDraft({ dose: recipe.espresso!.dose, yield: recipe.espresso!.yield });
              navigate('/kalibrasi');
            }}
          >
            <Gauge className="size-5" /> Kalibrasi shot ini
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <SectionTitle>Komposisi &amp; takaran</SectionTitle>
          <ul className="divide-y divide-line">
            {recipe.ingredients.map((i) => (
              <li key={i.id} className="flex items-baseline justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-semibold">{i.name}</div>
                  {i.note && <div className="text-sm text-muted">{i.note}</div>}
                </div>
                <div className="tabular shrink-0 text-xl font-bold">
                  {i.amount !== null ? fmtNum(i.amount, 2) : ''} <span className="text-sm font-semibold text-muted">{i.unit}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionTitle>Urutan pembuatan (SOP)</SectionTitle>
          <ol className="space-y-3">
            {recipe.steps.map((s, idx) => (
              <li key={s.id} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-ink">{idx + 1}</span>
                <div className="pt-1.5">
                  <p className="text-[16px] leading-relaxed">{s.text}</p>
                  {s.durationSec ? (
                    <Badge className="mt-1">
                      <Timer className="size-3.5" /> {s.durationSec} detik
                    </Badge>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {recipe.notes && (
        <Card className="border-crema/40 bg-crema/10">
          <SectionTitle>Catatan penyajian</SectionTitle>
          <p className="leading-relaxed whitespace-pre-line">{recipe.notes}</p>
        </Card>
      )}
      <p className="text-sm text-muted">
        Diperbarui {recipe.updatedAt.startsWith('1970') ? 'bawaan sistem' : `${fmtDateTime(recipe.updatedAt)} oleh ${recipe.updatedBy}`}
      </p>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Hapus ${recipe.name}?`}
        message="Resep akan dihapus dari buku resep di perangkat ini."
        onConfirm={() => {
          deleteRecipe(recipe.id);
          navigate('/resep');
        }}
      />
    </article>
  );
}
