import '@fontsource-variable/inter';
import './index.css';
import { Capacitor } from '@capacitor/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (Capacitor.isNativePlatform()) {
  // Tombol Kembali Android: mundur satu halaman; di halaman awal aplikasi diminimalkan, bukan ditutup paksa.
  import('@capacitor/app')
    .then(({ App }) =>
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else App.minimizeApp();
      }),
    )
    .catch(() => undefined);
} else {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true })).catch(() => undefined);
}
