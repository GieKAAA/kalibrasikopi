import { ArrowLeft, BookOpen, Gauge, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Card, ConfirmDialog, cx, EmptyState, LinkButton, PageHeader, SectionTitle, TextInput } from '../components/ui';
import { fmtDateTime, fmtNum } from '../lib/format';
import { RECIPE_CATEGORIES, type Recipe, type RecipeCategory } from '../store/types';
import { useApp, useIsHead } from '../store/useApp';

export function RecipesPage() {
  const { id } = useParams();
  const recipes = useApp((s) => s.recipes);
  const isHead = useIsHead();
  const [query, setQuery] = useState('');
  const [params] = useSearchParams();
  const initial = params.get('kategori') as RecipeCategory | null;
  const [category, setCategory] = useState<RecipeCategory | 'Semua'>(initial && RECIPE_CATEGORIES.includes(initial) ? initial : 'Semua');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes
      .filter((r) => category === 'Semua' || r.category === category)
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q)))
      .sort((a, b) => RECIPE_CATEGORIES.indexOf(a.category) - RECIPE_CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name));
  }, [recipes, query, category]);

  const selected = recipes.find((r) => r.id === id) ?? null;

  return (
    <div className="lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8">
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
        <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {(['Semua', ...RECIPE_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cx(
                'h-10 shrink-0 rounded-lg border px-3.5 text-sm font-semibold transition',
                category === c ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-muted hover:text-ink',
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
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
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
          <div className="sticky top-7 mt-[76px]">
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
  return (
    <Link
      to={`/resep/${recipe.id}`}
      aria-current={active ? 'page' : undefined}
      className={cx('relative flex items-center gap-3 px-4 py-3.5 transition', active ? 'bg-surface-2' : 'hover:bg-surface-2/60')}
    >
      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-ink" />}
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold">{recipe.name}</div>
        <div className="mt-0.5 text-sm text-muted">
          {recipe.category} · {recipe.temperature}
        </div>
      </div>
      {recipe.espresso && (
        <span className="tabular shrink-0 text-sm text-muted">
          {fmtNum(recipe.espresso.dose)}→{fmtNum(recipe.espresso.yield)} g
        </span>
      )}
    </Link>
  );
}

function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const navigate = useNavigate();
  const isHead = useIsHead();
  const deleteRecipe = useApp((s) => s.deleteRecipe);
  const setDraft = useApp((s) => s.setDraft);
  const [confirm, setConfirm] = useState(false);
  return (
    <article className="space-y-4">
      <Link to="/resep" className="inline-flex h-11 items-center gap-2 rounded-xl pr-3 font-semibold text-muted hover:text-ink lg:hidden">
        <ArrowLeft className="size-5" /> Semua resep
      </Link>

      <header className="border-b border-line pb-5">
        <div className="text-sm font-medium text-muted">
          {recipe.category} · {recipe.temperature} · {recipe.vessel || 'penyajian bebas'}
        </div>
        <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight md:text-[34px]">{recipe.name}</h1>
        {recipe.description && <p className="mt-2 max-w-2xl text-[17px] leading-relaxed text-muted">{recipe.description}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton to={`/resep/${recipe.id}/seduh`} size="lg">
            <Play className="size-5" fill="currentColor" /> Mode Seduh
          </LinkButton>
          {isHead && (
            <>
              <LinkButton to={`/resep/${recipe.id}/edit`} size="lg" variant="outline">
                <Pencil className="size-5" /> Ubah
              </LinkButton>
              <Button size="lg" variant="ghost" className="text-danger" onClick={() => setConfirm(true)}>
                <Trash2 className="size-5" /> Hapus
              </Button>
            </>
          )}
        </div>
      </header>

      {recipe.espresso && (
        <Card className="flex flex-wrap items-center gap-x-8 gap-y-4">
          {[
            ['Dose', `${fmtNum(recipe.espresso.dose)} g`],
            ['Yield', `${fmtNum(recipe.espresso.yield)} g`],
            ['Waktu', `${recipe.espresso.timeMin}–${recipe.espresso.timeMax} s`],
            ['Rasio', `1:${fmtNum(recipe.espresso.yield / recipe.espresso.dose, 1)}`],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-sm text-muted">{k}</div>
              <div className="readout mt-1 text-2xl">{v}</div>
            </div>
          ))}
          <Button
            variant="outline"
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
                <div className="tabular shrink-0 text-lg font-semibold">
                  {i.amount !== null ? fmtNum(i.amount, 2) : ''} <span className="text-sm font-semibold text-muted">{i.unit}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionTitle>Urutan pembuatan (SOP)</SectionTitle>
          <ol className="divide-y divide-line">
            {recipe.steps.map((s, idx) => (
              <li key={s.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                <span className="tabular w-6 shrink-0 pt-px text-[15px] font-semibold text-muted">{idx + 1}.</span>
                <div className="min-w-0 flex-1">
                  <p className="text-base leading-relaxed">{s.text}</p>
                  {s.durationSec ? <p className="mt-0.5 text-sm text-muted">± {s.durationSec} detik</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {recipe.notes && (
        <Card>
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
