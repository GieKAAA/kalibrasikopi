import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HeadOnly } from '../components/HeadOnly';
import { Button, Card, cx, Field, IconButton, PageHeader, Segmented, Select, SectionTitle, Switch, TextArea, TextInput } from '../components/ui';
import { uid } from '../lib/auth';
import { parseDecimal } from '../lib/format';
import { RECIPE_CATEGORIES, type Recipe } from '../store/types';
import { useApp, useCurrentUser } from '../store/useApp';

function emptyRecipe(): Recipe {
  return {
    id: uid(),
    name: '',
    category: 'Signature',
    description: '',
    vessel: '',
    temperature: 'Dingin',
    ingredients: [{ id: uid(), name: '', amount: null, unit: 'g', note: '' }],
    steps: [{ id: uid(), text: '', durationSec: null }],
    notes: '',
    espresso: null,
    updatedAt: '',
    updatedBy: '',
  };
}

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const out = [...arr];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

const numOrNull = (s: string) => {
  if (s.trim() === '') return null;
  const v = parseDecimal(s);
  return Number.isFinite(v) ? v : null;
};

export function RecipeEditorPage() {
  return (
    <HeadOnly>
      <Editor />
    </HeadOnly>
  );
}

function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const existing = useApp((s) => s.recipes.find((r) => r.id === id));
  const saveRecipe = useApp((s) => s.saveRecipe);
  const user = useCurrentUser();
  const [r, setR] = useState<Recipe>(() => (existing ? structuredClone(existing) : emptyRecipe()));
  const [errors, setErrors] = useState<string[]>([]);
  const patch = (p: Partial<Recipe>) => setR((x) => ({ ...x, ...p }));

  const save = () => {
    const errs: string[] = [];
    if (!r.name.trim()) errs.push('Nama menu wajib diisi.');
    const ingredients = r.ingredients.filter((i) => i.name.trim());
    const steps = r.steps.filter((s) => s.text.trim());
    if (!ingredients.length) errs.push('Minimal satu bahan.');
    if (!steps.length) errs.push('Minimal satu langkah pembuatan.');
    if (r.espresso) {
      const e = r.espresso;
      if (!(e.dose > 0 && e.yield > 0)) errs.push('Dose dan yield espresso harus lebih dari 0.');
      if (!(e.timeMin > 0 && e.timeMax >= e.timeMin)) errs.push('Rentang waktu espresso tidak valid.');
    }
    setErrors(errs);
    if (errs.length) return;
    saveRecipe({
      ...r,
      name: r.name.trim(),
      ingredients,
      steps,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.name ?? '-',
    });
    navigate(`/resep/${r.id}`);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={existing ? `Ubah ${existing.name}` : 'Resep baru'}
        subtitle="Takaran dan urutan yang tertulis di sini menjadi standar seluruh barista."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Batal
            </Button>
            <Button onClick={save}>
              <Save className="size-5" /> Simpan
            </Button>
          </>
        }
      />
      {errors.length > 0 && (
        <div className="mb-4 rounded-2xl bg-danger/10 px-4 py-3 text-danger">
          {errors.map((e) => (
            <div key={e}>• {e}</div>
          ))}
        </div>
      )}
      <div className="space-y-4">
        <Card className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nama menu">
            <TextInput value={r.name} onChange={(e) => patch({ name: e.target.value })} placeholder="mis. Es Kopi Susu Gula Aren" />
          </Field>
          <Field label="Kategori">
            <Select value={r.category} onChange={(e) => patch({ category: e.target.value as Recipe['category'] })}>
              {RECIPE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Wadah penyajian">
            <TextInput value={r.vessel} onChange={(e) => patch({ vessel: e.target.value })} placeholder="mis. Gelas 14 oz" />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-medium">Suhu sajian</span>
            <Segmented
              value={r.temperature}
              onChange={(v) => patch({ temperature: v })}
              options={[
                { value: 'Panas', label: 'Panas' },
                { value: 'Dingin', label: 'Dingin' },
              ]}
              className="w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <Field label="Deskripsi singkat">
              <TextArea rows={2} value={r.description} onChange={(e) => patch({ description: e.target.value })} />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Menggunakan espresso</div>
              <div className="text-sm text-muted">Tampilkan spesifikasi shot &amp; tombol kalibrasi pada resep ini.</div>
            </div>
            <Switch
              label="Menggunakan espresso"
              checked={r.espresso !== null}
              onChange={(v) => patch({ espresso: v ? { dose: 18, yield: 36, timeMin: 25, timeMax: 30 } : null })}
            />
          </div>
          {r.espresso && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ['dose', 'Dose (g)'],
                  ['yield', 'Yield (g)'],
                  ['timeMin', 'Waktu min (s)'],
                  ['timeMax', 'Waktu maks (s)'],
                ] as const
              ).map(([k, label]) => (
                <Field key={k} label={label}>
                  <TextInput
                    inputMode="decimal"
                    defaultValue={String(r.espresso![k]).replace('.', ',')}
                    onChange={(e) => patch({ espresso: { ...r.espresso!, [k]: numOrNull(e.target.value) ?? 0 } })}
                  />
                </Field>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle
            action={
              <Button size="sm" variant="secondary" onClick={() => patch({ ingredients: [...r.ingredients, { id: uid(), name: '', amount: null, unit: 'g', note: '' }] })}>
                <Plus className="size-4" /> Bahan
              </Button>
            }
          >
            Komposisi &amp; takaran
          </SectionTitle>
          <div className="space-y-3">
            {r.ingredients.map((ing, i) => {
              const set = (p: Partial<typeof ing>) => patch({ ingredients: r.ingredients.map((x) => (x.id === ing.id ? { ...x, ...p } : x)) });
              return (
                <div key={ing.id} className="grid grid-cols-[1fr_88px_80px] gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[2fr_100px_90px_2fr_auto]">
                  <TextInput aria-label="Nama bahan" placeholder="Nama bahan" value={ing.name} onChange={(e) => set({ name: e.target.value })} />
                  <TextInput aria-label="Jumlah" inputMode="decimal" placeholder="Jumlah" defaultValue={ing.amount === null ? '' : String(ing.amount).replace('.', ',')} onChange={(e) => set({ amount: numOrNull(e.target.value) })} />
                  <TextInput aria-label="Satuan" placeholder="g/ml" value={ing.unit} onChange={(e) => set({ unit: e.target.value })} />
                  <TextInput aria-label="Catatan bahan" placeholder="Catatan (opsional)" value={ing.note} onChange={(e) => set({ note: e.target.value })} className="col-span-2 sm:col-span-1" />
                  <div className="flex justify-end">
                    <RowActions
                      onUp={() => patch({ ingredients: move(r.ingredients, i, -1) })}
                      onDown={() => patch({ ingredients: move(r.ingredients, i, 1) })}
                      onRemove={() => patch({ ingredients: r.ingredients.filter((x) => x.id !== ing.id) })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle
            action={
              <Button size="sm" variant="secondary" onClick={() => patch({ steps: [...r.steps, { id: uid(), text: '', durationSec: null }] })}>
                <Plus className="size-4" /> Langkah
              </Button>
            }
          >
            Urutan pembuatan
          </SectionTitle>
          <div className="space-y-3">
            {r.steps.map((st, i) => {
              const set = (p: Partial<typeof st>) => patch({ steps: r.steps.map((x) => (x.id === st.id ? { ...x, ...p } : x)) });
              return (
                <div key={st.id} className="flex gap-3 rounded-2xl border border-line p-3">
                  <span className="mt-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-ink">{i + 1}</span>
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_140px]">
                    <TextArea aria-label={`Langkah ${i + 1}`} rows={2} className="min-h-12" value={st.text} onChange={(e) => set({ text: e.target.value })} placeholder="Tuliskan instruksi…" />
                    <TextInput
                      aria-label="Durasi timer (detik)"
                      inputMode="numeric"
                      placeholder="Timer (detik)"
                      defaultValue={st.durationSec ?? ''}
                      onChange={(e) => set({ durationSec: numOrNull(e.target.value) })}
                    />
                  </div>
                  <RowActions
                    vertical
                    onUp={() => patch({ steps: move(r.steps, i, -1) })}
                    onDown={() => patch({ steps: move(r.steps, i, 1) })}
                    onRemove={() => patch({ steps: r.steps.filter((x) => x.id !== st.id) })}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <Field label="Catatan penyajian" hint="Tips, cara membuat bahan dasar (sirup), atau standar kualitas.">
            <TextArea rows={4} value={r.notes} onChange={(e) => patch({ notes: e.target.value })} />
          </Field>
        </Card>

        <div className="flex justify-end gap-2 pb-6">
          <Button variant="secondary" size="lg" onClick={() => navigate(-1)}>
            Batal
          </Button>
          <Button size="lg" onClick={save}>
            <Save className="size-5" /> Simpan resep
          </Button>
        </div>
      </div>
    </div>
  );
}

function RowActions({ onUp, onDown, onRemove, vertical }: { onUp: () => void; onDown: () => void; onRemove: () => void; vertical?: boolean }) {
  return (
    <div className={cx('flex shrink-0', vertical ? 'flex-col' : 'flex-row')}>
      <IconButton label="Naikkan" onClick={onUp} className="size-10">
        <ArrowUp className="size-4" />
      </IconButton>
      <IconButton label="Turunkan" onClick={onDown} className="size-10">
        <ArrowDown className="size-4" />
      </IconButton>
      <IconButton label="Hapus" onClick={onRemove} className="size-10 text-danger">
        <Trash2 className="size-4" />
      </IconButton>
    </div>
  );
}
