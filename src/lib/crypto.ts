const enc = new TextEncoder();
const dec = new TextDecoder();

// Format file v2 menyimpan parameter KDF di header. File v1 dan format tanpa
// magic tetap dapat dibuka dengan 150k iterasi agar semua backup lama aman.
const LEGACY_PBKDF2_ITERATIONS = 150_000;
const CURRENT_PBKDF2_ITERATIONS = 600_000;
const CRYPTO_FORMAT_V1 = 1;
const CRYPTO_FORMAT_V2 = 2;
const MAGIC = new Uint8Array([0x4C, 0x4B, 0x55, 0x49]); // "LKUI"

async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const saltBuf = new Uint8Array(salt).buffer as ArrayBuffer;
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuf, iterations, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptJson(obj: unknown, passphrase: string): Promise<Blob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, CURRENT_PBKDF2_ITERATIONS);
  const data = enc.encode(JSON.stringify(obj));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  // Format v2: magic(4) | version(2) | PBKDF2 iterations(4) | salt(16) |
  //            iv(12) | ciphertext. Parameter ikut dalam header agar dapat
  // dinaikkan lagi tanpa membuat file lama tidak bisa dibuka.
  const out = new Uint8Array(4 + 2 + 4 + 16 + 12 + ct.length);
  out.set(MAGIC, 0);
  out[4] = 0x00; out[5] = CRYPTO_FORMAT_V2;
  new DataView(out.buffer).setUint32(6, CURRENT_PBKDF2_ITERATIONS, false);
  out.set(salt, 10); out.set(iv, 26); out.set(ct, 38);
  return new Blob([out], { type: "application/octet-stream" });
}

export async function decryptJson(file: Blob, passphrase: string): Promise<unknown> {
  const buf = new Uint8Array(await file.arrayBuffer());
  // Detect format by magic bytes "LKUI"
  const isNew = buf[0] === 0x4C && buf[1] === 0x4B && buf[2] === 0x55 && buf[3] === 0x49;
  let salt: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>, ct: Uint8Array<ArrayBuffer>;
  let iterations: number;
  if (isNew) {
    const version = (buf[4] << 8) | buf[5];
    if (version === CRYPTO_FORMAT_V1) {
      if (buf.length < 35) throw new Error("File backup tidak valid atau rusak.");
      salt = buf.slice(6, 22) as Uint8Array<ArrayBuffer>;
      iv = buf.slice(22, 34) as Uint8Array<ArrayBuffer>;
      ct = buf.slice(34) as Uint8Array<ArrayBuffer>;
      iterations = LEGACY_PBKDF2_ITERATIONS;
    } else if (version === CRYPTO_FORMAT_V2) {
      if (buf.length < 39) throw new Error("File backup tidak valid atau rusak.");
      iterations = new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(6, false);
      if (!Number.isInteger(iterations) || iterations < LEGACY_PBKDF2_ITERATIONS || iterations > 2_000_000) {
        throw new Error("File backup tidak valid: parameter enkripsi tidak didukung.");
      }
      salt = buf.slice(10, 26) as Uint8Array<ArrayBuffer>;
      iv = buf.slice(26, 38) as Uint8Array<ArrayBuffer>;
      ct = buf.slice(38) as Uint8Array<ArrayBuffer>;
    } else {
      throw new Error("Versi enkripsi backup tidak didukung. Perbarui aplikasi sebelum restore.");
    }
  } else {
    // Legacy format: salt(16) | iv(12) | ciphertext
    if (buf.length < 29) throw new Error("File backup tidak valid atau rusak.");
    salt = buf.slice(0, 16) as Uint8Array<ArrayBuffer>;
    iv = buf.slice(16, 28) as Uint8Array<ArrayBuffer>;
    ct = buf.slice(28) as Uint8Array<ArrayBuffer>;
    iterations = LEGACY_PBKDF2_ITERATIONS;
  }
  const key = await deriveKey(passphrase, salt, iterations);
  let pt: ArrayBuffer;
  try {
    pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  } catch {
    // AES-GCM melempar DOMException ber-message kosong saat tag/kunci tak cocok
    throw new Error("Kata sandi salah atau file backup rusak.");
  }
  try {
    return JSON.parse(dec.decode(pt));
  } catch {
    throw new Error("File backup tidak valid (gagal dibaca setelah dekripsi).");
  }
}

// ── PIN hashing — PBKDF2 + random salt ─────────────────────────────────────

async function pbkdf2Hash(pin: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" },
    keyMaterial, 256,
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hash a PIN using PBKDF2 with a fresh random salt. Returns "pbkdf2v2:<salthex>:<hashex>". */
export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hash = await pbkdf2Hash(pin, salt);
  return `pbkdf2v2:${saltHex}:${hash}`;
}

/** Verify a PIN against a stored hash (handles both legacy SHA-256 and new PBKDF2 format). */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (stored.startsWith("pbkdf2v2:")) {
    const [, saltHex, hashHex] = stored.split(":");
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
    const candidate = await pbkdf2Hash(pin, salt);
    return candidate === hashHex;
  }
  // Legacy SHA-256 (static salt) — used for migration verification only
  const data = enc.encode("leskolui-pin-salt-v1:" + pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === stored;
}

export function isHashedPin(value?: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value ?? "") || /^pbkdf2v2:[a-f0-9]{32}:[a-f0-9]{64}$/.test(value ?? "");
}
