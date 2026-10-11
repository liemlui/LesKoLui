/**
 * Kata sandi enkripsi backup: kata acak, batas minimum, dan estimasi kekuatan.
 *
 * Diekstrak dari `screens/Settings.tsx` (G3-09) supaya batas minimum dan
 * ambang kekuatannya bisa dites tanpa DOM. **Tidak ada perubahan perilaku** pada
 * rumus kekuatan, panjang minimum, maupun isi daftar kata.
 *
 * Istilah antarmuka yang berlaku: **kata sandi enkripsi** (glosarium G3-08),
 * bukan "passphrase" dan bukan "kunci".
 */

/** Daftar kata untuk pembangkit kata sandi yang mudah dibaca dan diingat. */
export const WORDLIST = [
  "apel", "baju", "cabe", "dadu", "elang", "fajar", "gula", "harap", "ikan", "jalan",
  "kapal", "lampu", "meja", "nasi", "obat", "pagi", "rasa", "sapi", "tahu", "ular",
  "voli", "waktu", "xenon", "yakin", "zaman", "angin", "bunga", "coklat", "daun", "ember",
];

/**
 * Panjang minimum kata sandi enkripsi backup. 4 karakter terlalu lemah untuk
 * melindungi file backup yang berisi seluruh data murid & keuangan; 8 minimum,
 * dan tombol "Generate" tetap disarankan (6 kata acak ≈ sangat kuat).
 */
export const MIN_PASS = 8;

/** Jumlah kata pada kata sandi yang dibangkitkan (6 kata ≈ sangat kuat). */
export const GENERATED_WORD_COUNT = 6;

export interface PassStrength {
  label: string;
  color: string;
  pct: number;
}

/** Estimasi kekuatan kasar kata sandi backup untuk umpan balik visual. */
export function passStrength(p: string): PassStrength {
  if (!p) return { label: "", color: "", pct: 0 };
  let score = 0;
  if (p.length >= MIN_PASS) score++;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z0-9]/.test(p)) score++;
  if (/[^a-zA-Z0-9]/.test(p) || p.includes("-")) score++;
  if (p.length < MIN_PASS) return { label: "Sangat lemah", color: "#dc2626", pct: 20 };
  if (score <= 1) return { label: "Lemah", color: "#f59e0b", pct: 40 };
  if (score === 2) return { label: "Cukup", color: "#eab308", pct: 60 };
  if (score === 3) return { label: "Baik", color: "#22c55e", pct: 80 };
  return { label: "Kuat", color: "#16a34a", pct: 100 };
}

/**
 * Bangkitkan kata sandi dari kata acak yang mudah dibaca.
 *
 * `randomBytes` disuntikkan supaya fungsinya bisa dites tanpa `crypto`
 * peramban — pemanggil di layar Pengaturan meneruskan `crypto.getRandomValues`.
 */
export function generatePassphrase(randomBytes: Uint8Array): string {
  return Array.from(randomBytes)
    .map((b) => WORDLIST[b % WORDLIST.length])
    .join("-");
}

/** Apakah kata sandi sudah memenuhi batas minimum untuk backup. */
export function isPassphraseUsable(p: string): boolean {
  return p.length >= MIN_PASS;
}
