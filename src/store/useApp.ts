import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_GRINDER, type GrinderConfig } from '../fuzzy/advice';
import { createDefaultKnowledgeBase } from '../fuzzy/defaultKb';
import type { KnowledgeBase } from '../fuzzy/types';
import { hashPassword, randomHex, uid } from '../lib/auth';
import { seedRecipes } from './seedRecipes';
import { RECIPE_CATEGORIES } from './types';
import type { CalibrationDraft, CalibrationSession, Recipe, Role, Shot, SusResponse, ThemePref, User } from './types';

export const DEFAULT_DRAFT: CalibrationDraft = { dose: 18, yield: 36, time: 0, taste: null, grindSetting: null };

interface Data {
  users: User[];
  currentUserId: string | null;
  recipes: Recipe[];
  kb: KnowledgeBase;
  grinder: GrinderConfig;
  sessions: CalibrationSession[];
  activeSessionId: string | null;
  draft: CalibrationDraft;
  theme: ThemePref;
  susResponses: SusResponse[];
}

interface Actions {
  createUser: (input: { name: string; email: string; password: string; role: Role }) => User;
  setCurrentUser: (id: string | null) => void;
  updateUser: (id: string, patch: Partial<Pick<User, 'name' | 'email' | 'role'>>) => void;
  setPassword: (id: string, password: string) => void;
  removeUser: (id: string) => void;

  saveRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;

  saveKb: (kb: KnowledgeBase) => void;
  resetKb: () => void;
  saveGrinder: (g: GrinderConfig) => void;

  setDraft: (patch: Partial<CalibrationDraft>) => void;
  startSession: (beanName: string) => string;
  renameSession: (id: string, beanName: string) => void;
  /** Tambah shot ke sesi aktif, atau ganti bila id sama (analisis ulang shot yang sama). */
  upsertShot: (shot: Shot) => void;
  finishSession: () => void;
  setExpertDecision: (sessionId: string, shotId: string, decision: Shot['expertDecision'], amount: number | null) => void;
  addSusResponse: (r: Omit<SusResponse, 'id' | 'createdAt' | 'createdBy'>) => void;
  deleteSusResponse: (id: string) => void;
  deleteSession: (id: string) => void;

  setTheme: (t: ThemePref) => void;
  importData: (data: unknown) => void;
  resetAll: () => void;
}

export type AppState = Data & Actions;

const initialData = (): Data => ({
  users: [],
  currentUserId: null,
  recipes: seedRecipes(),
  kb: createDefaultKnowledgeBase(),
  grinder: { ...DEFAULT_GRINDER },
  sessions: [],
  activeSessionId: null,
  draft: { ...DEFAULT_DRAFT },
  theme: 'system',
  susResponses: [],
});

const now = () => new Date().toISOString();

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      createUser: ({ name, email, password, role }) => {
        const salt = randomHex();
        const user: User = {
          id: uid(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          salt,
          passwordHash: hashPassword(password, salt),
          createdAt: now(),
        };
        set((s) => ({ users: [...s.users, user] }));
        return user;
      },
      setCurrentUser: (id) => set({ currentUserId: id }),
      updateUser: (id, patch) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id === id ? { ...u, ...patch, email: (patch.email ?? u.email).trim().toLowerCase() } : u,
          ),
        })),
      setPassword: (id, password) =>
        set((s) => ({
          users: s.users.map((u) => {
            if (u.id !== id) return u;
            const salt = randomHex();
            return { ...u, salt, passwordHash: hashPassword(password, salt) };
          }),
        })),
      removeUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),

      saveRecipe: (recipe) =>
        set((s) => {
          const exists = s.recipes.some((r) => r.id === recipe.id);
          return { recipes: exists ? s.recipes.map((r) => (r.id === recipe.id ? recipe : r)) : [...s.recipes, recipe] };
        }),
      deleteRecipe: (id) => set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),

      saveKb: (kb) => set({ kb }),
      resetKb: () => set({ kb: createDefaultKnowledgeBase(currentUserName(get())) }),
      saveGrinder: (grinder) => set({ grinder }),

      setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      startSession: (beanName) => {
        const s = get();
        const user = s.users.find((u) => u.id === s.currentUserId);
        const session: CalibrationSession = {
          id: uid(),
          beanName: beanName.trim() || 'House Blend',
          grinderName: s.grinder.name,
          baristaId: user?.id ?? '',
          baristaName: user?.name ?? '-',
          startedAt: now(),
          finishedAt: null,
          shots: [],
        };
        // Sesi aktif sebelumnya: simpan bila berisi shot, buang bila kosong.
        const sessions = s.sessions
          .filter((x) => !(x.id === s.activeSessionId && x.shots.length === 0))
          .map((x) => (x.id === s.activeSessionId ? { ...x, finishedAt: x.finishedAt ?? now() } : x));
        set({ sessions: [session, ...sessions], activeSessionId: session.id });
        return session.id;
      },
      renameSession: (id, beanName) =>
        set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, beanName } : x)) })),
      upsertShot: (shot) =>
        set((s) => ({
          sessions: s.sessions.map((x) => {
            if (x.id !== s.activeSessionId) return x;
            const exists = x.shots.some((y) => y.id === shot.id);
            return { ...x, shots: exists ? x.shots.map((y) => (y.id === shot.id ? shot : y)) : [...x.shots, shot] };
          }),
        })),
      finishSession: () =>
        set((s) => ({
          sessions: s.sessions
            .filter((x) => !(x.id === s.activeSessionId && x.shots.length === 0))
            .map((x) => (x.id === s.activeSessionId ? { ...x, finishedAt: now() } : x)),
          activeSessionId: null,
          draft: { ...s.draft, time: 0, taste: null },
        })),
      setExpertDecision: (sessionId, shotId, decision, amount) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id !== sessionId
              ? x
              : { ...x, shots: x.shots.map((y) => (y.id === shotId ? { ...y, expertDecision: decision, expertAmount: decision ? amount : null } : y)) },
          ),
        })),
      addSusResponse: (r) =>
        set((s) => ({
          susResponses: [...s.susResponses, { ...r, id: uid(), createdAt: now(), createdBy: currentUserName(s) }],
        })),
      deleteSusResponse: (id) => set((s) => ({ susResponses: s.susResponses.filter((r) => r.id !== id) })),
      deleteSession: (id) =>
        set((s) => ({
          sessions: s.sessions.filter((x) => x.id !== id),
          activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
        })),

      setTheme: (theme) => set({ theme }),
      importData: (raw) => {
        const data = validateBackup(raw);
        const current = get();
        set({
          ...data,
          // Tetap masuk bila akun yang sedang dipakai ada di cadangan.
          currentUserId: data.users.some((u) => u.id === current.currentUserId) ? current.currentUserId : null,
        });
      },
      resetAll: () => set(initialData()),
    }),
    {
      name: 'kalibrasikopi:v1',
      version: 3,
      // v2: kategori Manual Brew dihapus (di luar ruang lingkup penelitian).
      // v3: satuan grinder bawaan menjadi "klik" (resolusi 1) dan modul kuesioner SUS.
      migrate: (persisted, version) => {
        const data = persisted as Data;
        if (version < 2 && Array.isArray(data?.recipes)) data.recipes = data.recipes.filter((r) => RECIPE_CATEGORIES.includes(r.category));
        if (version < 3 && data) {
          const g = data.grinder;
          if (g && g.unitLabel === 'angka' && g.resolution === 0.5 && g.unitsPerStep === 1) data.grinder = { ...g, unitLabel: 'klik', resolution: 1 };
          data.susResponses = data.susResponses ?? [];
        }
        return data;
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (s): Data => ({
        users: s.users,
        currentUserId: s.currentUserId,
        recipes: s.recipes,
        kb: s.kb,
        grinder: s.grinder,
        sessions: s.sessions,
        activeSessionId: s.activeSessionId,
        draft: s.draft,
        theme: s.theme,
        susResponses: s.susResponses,
      }),
    },
  ),
);

function currentUserName(s: Data): string {
  return s.users.find((u) => u.id === s.currentUserId)?.name ?? 'Head Barista';
}

export const BACKUP_KIND = 'kalibrasikopi-backup';

export function exportBackup(s: Data) {
  return {
    kind: BACKUP_KIND,
    version: 1,
    exportedAt: now(),
    data: {
      users: s.users,
      recipes: s.recipes,
      kb: s.kb,
      grinder: s.grinder,
      sessions: s.sessions,
      activeSessionId: s.activeSessionId,
      draft: s.draft,
      theme: s.theme,
      susResponses: s.susResponses,
    },
  };
}

function validateBackup(raw: unknown): Omit<Data, 'currentUserId'> {
  const obj = raw as { kind?: string; data?: Partial<Data> };
  if (!obj || obj.kind !== BACKUP_KIND || !obj.data) throw new Error('Berkas bukan cadangan Kalibrasi Kopi.');
  const d = obj.data;
  if (!Array.isArray(d.users) || !d.users.some((u) => u.role === 'head'))
    throw new Error('Cadangan tidak memiliki akun Head Barista.');
  if (!Array.isArray(d.recipes) || !Array.isArray(d.sessions)) throw new Error('Data resep/riwayat tidak valid.');
  if (!d.kb || !d.kb.inputs || !Array.isArray(d.kb.rules)) throw new Error('Basis pengetahuan tidak valid.');
  return {
    users: d.users,
    recipes: d.recipes.filter((r) => RECIPE_CATEGORIES.includes(r.category)),
    kb: d.kb,
    grinder: { ...DEFAULT_GRINDER, ...d.grinder },
    sessions: d.sessions,
    activeSessionId: d.activeSessionId ?? null,
    draft: { ...DEFAULT_DRAFT, ...d.draft },
    theme: d.theme ?? 'system',
    susResponses: Array.isArray(d.susResponses) ? d.susResponses : [],
  };
}

export function useCurrentUser(): User | null {
  return useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
}

export function useIsHead(): boolean {
  return useCurrentUser()?.role === 'head';
}
