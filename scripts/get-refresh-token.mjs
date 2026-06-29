// Bootstrap OAuth sekali untuk mendapatkan GOOGLE_REFRESH_TOKEN (zero-touch backup).
// Jalankan DI KOMPUTER kamu (bukan di server):
//
//   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-refresh-token.mjs
//
// Syarat di Google Cloud Console (OAuth client tipe "Web application"):
//   - Authorized redirect URI berisi:  http://localhost:4567/callback
//   - Scope yang diminta:              https://www.googleapis.com/auth/drive.file
//
// Skrip akan mencetak URL untuk dibuka di browser. Setelah kamu mengizinkan,
// refresh-token tercetak di terminal → salin ke Vercel env GOOGLE_REFRESH_TOKEN.

import http from "node:http";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 4567;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = "https://www.googleapis.com/auth/drive.file";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET dulu (lihat komentar di atas).");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent", // pastikan refresh_token dikembalikan
  }).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/callback") { res.writeHead(404).end(); return; }

  const code = url.searchParams.get("code");
  if (!code) { res.writeHead(400).end("Tidak ada authorization code."); return; }

  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const data = await r.json();
    if (!data.refresh_token) {
      res.writeHead(500).end("Tidak ada refresh_token. Pastikan prompt=consent & coba cabut akses lama di myaccount.google.com.");
      console.error("Respons:", data);
      process.exit(1);
    }
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Berhasil! Refresh token tercetak di terminal. Tutup tab ini.");
    console.log("\n✅ GOOGLE_REFRESH_TOKEN:\n" + data.refresh_token + "\n");
    console.log("Salin nilai itu ke Vercel → Environment Variables → GOOGLE_REFRESH_TOKEN.");
    server.close();
    process.exit(0);
  } catch (e) {
    res.writeHead(500).end("Gagal menukar token.");
    console.error(e);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log("\nBuka URL ini di browser, lalu izinkan akses:\n\n" + authUrl + "\n");
  console.log(`Menunggu callback di ${REDIRECT_URI} ...`);
});
