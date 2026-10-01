/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

// Ditulis langsung (bukan lewat vite-plugin-pwa/client) agar terbaca juga oleh TypeScript versi lama di editor.
declare module 'virtual:pwa-register' {
  export function registerSW(options?: { immediate?: boolean }): (reloadPage?: boolean) => Promise<void>;
}
