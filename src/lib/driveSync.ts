// SW-safe: ambil access-token via relay + upload backup ke Drive.
// TIDAK menyentuh window/localStorage/document — bisa dipakai di Service Worker
// (fase 2 background sync) maupun konteks biasa. Auth eksplisit via argumen.

const FILE_NAME = "leskolui-backup.jles";

/** Ambil access-token lewat backend relay (butuh secret). */
export async function relayAccessToken(secret: string, origin: string): Promise<string> {
  const res = await fetch(`${origin}/api/drive/token`, {
    method: "POST",
    headers: { "x-backup-secret": secret },
  });
  if (!res.ok) throw new Error(`Relay token gagal (${res.status}).`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Relay tidak mengembalikan token.");
  return data.access_token;
}

async function createFile(blob: Blob, token: string): Promise<string> {
  const metadata = { name: FILE_NAME, mimeType: "application/octet-stream" };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", blob);
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form },
  );
  if (!res.ok) throw new Error(`Drive create gagal (${res.status}).`);
  const json = (await res.json()) as { id: string };
  return json.id;
}

/**
 * Upload/overwrite backup ke Drive dengan token eksplisit.
 * @returns fileId untuk backup berikutnya.
 */
export async function uploadToDrive(blob: Blob, token: string, existingFileId?: string): Promise<string> {
  if (existingFileId) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existingFileId)}?uploadType=media`,
      { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: blob },
    );
    if (res.ok) return existingFileId;
    if (res.status !== 404) throw new Error(`Drive update gagal (${res.status}).`);
    // 404 → file dihapus user, buat ulang
  }
  return createFile(blob, token);
}
