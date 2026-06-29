/// <reference lib="webworker" />
// Custom Service Worker (injectManifest). Mempertahankan offline/precache + cache
// Google Fonts seperti sebelumnya, PLUS Periodic Background Sync (fase 2) untuk
// backup ke Drive saat app tertutup (Chrome/Android; best-effort, diatur browser).
import { clientsClaim } from "workbox-core";
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { db } from "./db/db";
import { exportBackup } from "./lib/backup";
import { relayAccessToken, uploadToDrive } from "./lib/driveSync";

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

self.skipWaiting();
clientsClaim();

// App shell (manifest disuntik vite-plugin-pwa saat build)
precacheAndRoute(self.__WB_MANIFEST);

// Google Fonts — CacheFirst (identik dgn konfigurasi generateSW sebelumnya)
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new CacheFirst({
    cacheName: "google-fonts-stylesheets",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

// ── Fase 2: Periodic Background Sync ────────────────────────────────
const BACKUP_TAG = "leskolui-backup";
const INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

self.addEventListener("periodicsync", (event) => {
  const e = event as ExtendableEvent & { tag?: string };
  if (e.tag === BACKUP_TAG) e.waitUntil(runBackgroundBackup());
});

async function runBackgroundBackup(): Promise<void> {
  try {
    const cfg = await db.swConfig.get("bg");
    if (!cfg?.enabled || !cfg.passphrase || !cfg.relaySecret) return;
    const settings = await db.settings.get("app");
    const lastMs = settings?.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : 0;
    if (Date.now() - lastMs < INTERVAL_MS) return; // belum waktunya
    const token = await relayAccessToken(cfg.relaySecret, self.location.origin);
    const blob = await exportBackup(cfg.passphrase);
    const fileId = await uploadToDrive(blob, token, settings?.driveBackup?.fileId);
    const now = new Date().toISOString();
    await db.settings.update("app", { driveBackup: { fileId, backupAt: now }, lastBackupAt: now });
  } catch {
    // best-effort; bila gagal, reminder & banner di app tetap menjaring.
  }
}
