// Backup ke Google Drive lewat OAuth (scope drive.file — hanya file buatan app).
// Menimpa 1 file tetap (Drive simpan revision history). Butuh env VITE_GOOGLE_CLIENT_ID.
// Google Identity Services (GIS) dimuat on-demand; tak ada dependency npm tambahan.

import { exportBackup } from "./backup";
import { getSettings, saveSettings } from "../db/repos";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const FILE_NAME = "leskolui-backup.jles";

/** Fitur hanya aktif kalau OAuth Client ID sudah dikonfigurasi. */
export function isDriveConfigured(): boolean {
  return typeof CLIENT_ID === "string" && CLIENT_ID.length > 0;
}

// ── Google Identity Services (GIS) ──────────────────────────────────
type TokenResponse = { access_token?: string; expires_in?: number; error?: string };
interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
            error_callback?: (err: { type?: string }) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

let gisPromise: Promise<void> | undefined;
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gisPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { gisPromise = undefined; reject(new Error("Gagal memuat Google Identity Services (cek koneksi).")); };
    document.head.appendChild(s);
  });
  return gisPromise;
}

// Token akses Google (cache di memori, expire ~1 jam). Dipakai relay & GIS.
let cachedToken: { value: string; expiresAt: number } | undefined;

// ── Backend token-relay (opsional) ──────────────────────────────────
// Bila dikonfigurasi, app dapat access-token TANPA popup Google (silent),
// memungkinkan backup tanpa tap saat app dibuka & sudah waktunya. Server
// hanya menukar refresh→access; data backup tetap dibuat di perangkat.
const RELAY_SECRET_KEY = "leskolui_relay_secret";

/** True kalau secret relay sudah diisi (di Settings) → mode silent aktif. */
export function isRelayConfigured(): boolean {
  try { return !!localStorage.getItem(RELAY_SECRET_KEY); } catch { return false; }
}

async function getRelayToken(): Promise<string> {
  const secret = (() => { try { return localStorage.getItem(RELAY_SECRET_KEY) || ""; } catch { return ""; } })();
  const res = await fetch(`${location.origin}/api/drive/token`, {
    method: "POST",
    headers: { "x-backup-secret": secret },
  });
  if (!res.ok) {
    const msg = res.status === 503 ? "Relay backup belum dikonfigurasi di server (env)."
      : res.status === 401 ? "Secret relay salah."
      : `Relay backup gagal (${res.status}).`;
    throw new Error(msg);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Relay tidak mengembalikan token.");
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

function getToken(forceNew = false): Promise<string> {
  if (!forceNew && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return Promise.resolve(cachedToken.value);
  }
  if (forceNew) cachedToken = undefined;
  // Mode silent via backend relay (tanpa popup) bila dikonfigurasi.
  if (isRelayConfigured()) return getRelayToken();
  if (!CLIENT_ID) return Promise.reject(new Error("VITE_GOOGLE_CLIENT_ID belum diset."));
  return loadGis().then(
    () =>
      new Promise<string>((resolve, reject) => {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPE,
          callback: (resp) => {
            if (resp.error || !resp.access_token) {
              reject(new Error(resp.error || "Gagal mendapat token Google."));
              return;
            }
            cachedToken = { value: resp.access_token, expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000 };
            resolve(resp.access_token);
          },
          error_callback: (err) => reject(new Error(err?.type === "popup_closed" ? "Otorisasi Google dibatalkan." : "Otorisasi Google gagal.")),
        });
        // prompt:'' → konsensus hanya pada akses pertama, lalu silent untuk berikutnya.
        client.requestAccessToken({ prompt: "" });
      }),
  );
}

// ── Drive REST helpers ──────────────────────────────────────────────
class DriveNotFound extends Error {}

/** Ubah status HTTP Drive jadi pesan Bahasa Indonesia yang jelas & actionable. */
function driveErrorMessage(action: string, status: number): string {
  if (status === 401) return `${action} gagal: sesi Google kedaluwarsa. Coba lagi (login ulang bila diminta).`;
  if (status === 403) return `${action} gagal: akses ditolak atau penyimpanan Google Drive penuh.`;
  if (status === 404) return `${action} gagal: file backup tidak ditemukan di Drive.`;
  if (status >= 500) return `${action} gagal: server Google sedang bermasalah. Coba lagi nanti.`;
  return `${action} gagal (kode ${status}).`;
}

/**
 * Fetch Drive dengan auth + retry SEKALI pada 401 (token GIS hanya ~1 jam, bisa
 * basi di tengah pemakaian). Token diambil ulang paksa lalu request diulang.
 */
async function driveFetch(url: string, init: RequestInit): Promise<Response> {
  let token = await getToken();
  let res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    token = await getToken(true); // paksa token baru, lalu ulangi sekali
    res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` } });
  }
  return res;
}

async function createFile(blob: Blob): Promise<string> {
  const metadata = { name: FILE_NAME, mimeType: "application/octet-stream" };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", blob);
  const res = await driveFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    { method: "POST", body: form },
  );
  if (!res.ok) throw new Error(driveErrorMessage("Backup ke Drive", res.status));
  const json = (await res.json()) as { id: string };
  return json.id;
}

async function updateFile(fileId: string, blob: Blob): Promise<void> {
  const res = await driveFetch(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`,
    { method: "PATCH", body: blob },
  );
  if (res.status === 404) throw new DriveNotFound();
  if (!res.ok) throw new Error(driveErrorMessage("Backup ke Drive", res.status));
}

/**
 * Upload backup ke Drive. Kalau `existingFileId` ada → overwrite file yang sama
 * (Drive simpan revisi). Kalau file sudah dihapus user (404) → buat ulang.
 * @returns fileId (disimpan caller untuk backup berikutnya).
 */
export async function uploadBackupToDrive(blob: Blob, existingFileId?: string): Promise<string> {
  if (existingFileId) {
    try {
      await updateFile(existingFileId, blob);
      return existingFileId;
    } catch (e) {
      if (!(e instanceof DriveNotFound)) throw e;
      // file hilang di Drive → lanjut buat baru
    }
  }
  return createFile(blob);
}

/** Cari file backup di Drive berdasar nama (untuk restore di HP baru tanpa fileId lokal). */
export async function findDriveBackup(): Promise<{ id: string; modifiedTime: string } | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc&pageSize=1`,
    { method: "GET" },
  );
  if (!res.ok) throw new Error(driveErrorMessage("Cari file di Drive", res.status));
  const json = (await res.json()) as { files?: { id: string; modifiedTime: string }[] };
  return json.files?.[0] ?? null;
}

/** Unduh isi file backup dari Drive (untuk restore). */
export async function downloadBackupFromDrive(fileId: string): Promise<Blob> {
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { method: "GET" },
  );
  if (!res.ok) throw new Error(driveErrorMessage("Unduh dari Drive", res.status));
  return res.blob();
}

/**
 * Backup penuh ke Drive: export terenkripsi → upload/overwrite → simpan fileId+waktu.
 * Token diambil lebih dulu agar popup OAuth dekat dengan gesture klik (anti popup-block).
 */
export async function performDriveBackup(passphrase: string): Promise<void> {
  await getToken();
  const blob = await exportBackup(passphrase);
  const settings = await getSettings();
  const fileId = await uploadBackupToDrive(blob, settings.driveBackup?.fileId);
  const now = new Date().toISOString();
  await saveSettings({ driveBackup: { fileId, backupAt: now }, lastBackupAt: now });
}

/** Tes konfigurasi relay: minta token baru lewat relay. Throw kalau gagal. */
export async function testRelay(): Promise<void> {
  if (!isRelayConfigured()) throw new Error("Secret relay belum diisi.");
  await getToken(true);
}

/** Muat GIS lebih awal (mis. saat prompt backup muncul) agar tap-nya responsif. */
export function preloadDrive(): void {
  if (!CLIENT_ID) return;
  void loadGis().catch(() => {});
}
