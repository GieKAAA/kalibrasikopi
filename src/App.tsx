import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthPage } from './pages/AuthPage';
import { BrewModePage } from './pages/BrewModePage';
import { CalibrationPage } from './pages/CalibrationPage';
import { DashboardPage } from './pages/DashboardPage';
import { HeadBaristaPage } from './pages/HeadBaristaPage';
import { HistoryPage } from './pages/HistoryPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { RecipeEditorPage } from './pages/RecipeEditorPage';
import { RecipesPage } from './pages/RecipesPage';
import { SettingsPage } from './pages/SettingsPage';
import { SusPage } from './pages/SusPage';
import { useApp, useCurrentUser } from './store/useApp';

function useThemeClass() {
  const theme = useApp((s) => s.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121110' : '#f4f3ef');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

export default function App() {
  useThemeClass();
  const user = useCurrentUser();
  if (!user) return <AuthPage />;
  return (
    <HashRouter>
      <Routes>
        <Route path="/resep/:id/seduh" element={<BrewModePage />} />
        <Route
          path="*"
          element={
            <AppShell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/kalibrasi" element={<CalibrationPage />} />
                <Route path="/resep" element={<RecipesPage />} />
                <Route path="/resep/baru" element={<RecipeEditorPage />} />
                <Route path="/resep/:id" element={<RecipesPage />} />
                <Route path="/resep/:id/edit" element={<RecipeEditorPage />} />
                <Route path="/riwayat" element={<HistoryPage />} />
                <Route path="/riwayat/:id" element={<HistoryPage />} />
                <Route path="/head-barista" element={<HeadBaristaPage />} />
                <Route path="/pakar" element={<KnowledgeBasePage />} />
                <Route path="/pengaturan" element={<SettingsPage />} />
                <Route path="/sus" element={<SusPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          }
        />
      </Routes>
    </HashRouter>
  );
}
