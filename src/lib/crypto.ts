const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const saltBuf = new Uint8Array(salt).buffer as ArrayBuffer;
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuf, iterations: 150_000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptJson(obj: unknown, passphrase: string): Promise<Blob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const data = enc.encode(JSON.stringify(obj));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  const out = new Uint8Array(16 + 12 + ct.length);
  out.set(salt, 0); out.set(iv, 16); out.set(ct, 28);
  return new Blob([out], { type: "application/octet-stream" });
}

export async function decryptJson(file: Blob, passphrase: string): Promise<unknown> {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf.length < 29) throw new Error("File backup tidak valid atau rusak.");
  const salt = buf.slice(0, 16), iv = buf.slice(16, 28), ct = buf.slice(28);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(dec.decode(pt));
}
