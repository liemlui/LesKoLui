// Vercel serverless function: relay refresh-token → access-token Google Drive.
//
// Tujuan: memungkinkan app mendapat access-token TANPA popup Google, sehingga
// backup bisa SENYAP (tanpa tap) saat app dibuka & sudah waktunya. Data backup
// tetap dibuat DI PERANGKAT (server tak pernah melihat data murid) — endpoint ini
// HANYA menukar token.
//
// Aman-default: kalau env belum lengkap → 503 (fitur mati, tak ada efek).
// Proteksi: header `x-backup-secret` harus cocok dgn env BACKUP_API_SECRET
// (CORS browser tak cukup karena pemanggil non-browser bisa baca respons).
//
// Env yang dibutuhkan (set di Vercel → Project → Settings → Environment Variables):
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, BACKUP_API_SECRET
// Lihat docs/ZERO-TOUCH-BACKUP.md untuk cara mendapatkan GOOGLE_REFRESH_TOKEN.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN,
    BACKUP_API_SECRET,
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !BACKUP_API_SECRET) {
    res.status(503).json({ error: "Backup relay belum dikonfigurasi di server." });
    return;
  }

  if (req.headers["x-backup-secret"] !== BACKUP_API_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const body = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    });
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await r.json();
    if (!r.ok || !data.access_token) {
      res.status(502).json({ error: "Gagal menukar token", detail: data.error_description || data.error || r.status });
      return;
    }
    // Hanya kembalikan access-token & masa berlaku — JANGAN bocorkan refresh-token.
    res.status(200).json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (e) {
    res.status(500).json({ error: "Kesalahan server", detail: String((e && e.message) || e) });
  }
}
