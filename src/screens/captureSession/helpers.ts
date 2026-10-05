/**
 * Fungsi murni layar "Catat Sesi".
 *
 * Dipisah dari `screens/CaptureSession.tsx` supaya bisa diuji tanpa merender
 * layar (audit: toolchain ini belum punya React Testing Library, jadi logika
 * yang bisa diuji HARUS berada di luar komponen).
 */
import type { Student } from "../../db/types";
import { dayLabel } from "../../lib/format";
import { getStudentGradeLabel } from "../../lib/ibTopics";
import { STEP_MAX } from "./constants";

/** Bagian sesi yang dipakai untuk menyusun pesan WhatsApp ke orang tua. */
export interface WaSessionSummary {
  date: string;
  subjects: string[];
  durationHours: number;
  shortNote: string;
  topic?: string;
}

/**
 * Susun pesan WhatsApp ke orang tua.
 *
 * Sengaja TIDAK memuat `situasiNote` (konteks pribadi/kekeluargaan) maupun
 * `needsWork` — pesan ke orang tua adalah ringkasan sesi, bukan catatan guru.
 */
export function buildWaMessage(
  student: Pick<Student, "name">,
  session: WaSessionSummary,
  followUps: string[],
  tutorName: string,
): string {
  const lines: string[] = [
    `Sesi les *${student.name}* (${dayLabel(session.date)}) sudah selesai. 📚`,
    ``,
    session.subjects.length > 0 ? `*Mapel:* ${session.subjects.join(", ")}` : "",
    `*Durasi:* ${session.durationHours} jam`,
    session.shortNote ? `*Catatan:* ${session.shortNote}` : "",
    session.topic ? `*Topik:* ${session.topic}` : "",
  ].filter((l) => l !== "");

  if (followUps.length > 0) {
    lines.push(``, `🎯 *Fokus sesi berikutnya:*`);
    followUps.forEach((f) => lines.push(`• ${f}`));
  }

  lines.push(``, `Terima kasih, salam 🙏`, tutorName || "Ko Lui");
  return lines.join("\n");
}

/**
 * Label jenjang yang sedang diprioritaskan pada pencarian topik (audit P0).
 * Dipakai agar tutor tahu MENGAPA daftar topiknya terbatas — sebelumnya
 * pembatasan ini tidak terlihat sama sekali.
 */
export function topicLevelHint(
  curriculum: string | undefined,
  grade: string | undefined,
  targetLevel: string | null,
): string | null {
  if (!targetLevel) return null;
  if (curriculum === "IB MYP") return getStudentGradeLabel(grade) ?? targetLevel;
  if (curriculum === "National") return grade ? `Kelas ${grade}` : targetLevel;
  return targetLevel;
}

/**
 * "12 Sep 20.14" — penanda waktu draf terakhir disimpan.
 *
 * Mengembalikan string KOSONG bila tanggalnya tidak bisa dibaca. Penting: versi
 * lama hanya memasang `try/catch`, padahal `toLocaleString` TIDAK melempar untuk
 * tanggal rusak — ia mengembalikan "Invalid Date", sehingga spanduk draf bisa
 * berbunyi "Draf ini tersimpan di perangkat pada Invalid Date". Ditemukan oleh
 * test `captureSessionHelpers.test.ts`.
 */
export function draftStamp(iso: string): string {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return "";
  return new Date(time).toLocaleString("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/**
 * Gabungkan topik terpilih (chip) + teks pencarian yang belum di-commit, lalu
 * buang duplikat. Topik disimpan sebagai satu string dipisah `"; "` — inilah
 * satu-satunya tempat aturan itu ditentukan, supaya pemulihan draf dan
 * penyimpanan sesi tidak pernah berbeda tafsir.
 */
export function mergeTopics(selected: readonly string[], pendingInput: string): string {
  const out = [...selected];
  for (const part of pendingInput.split(";").map((p) => p.trim()).filter(Boolean)) {
    if (!out.includes(part)) out.push(part);
  }
  return out.join("; ");
}

/** Kebalikan `mergeTopics` — dipakai saat memulihkan draf. */
export function splitTopics(topic: string | undefined): string[] {
  return (topic ?? "").split(";").map((t) => t.trim()).filter(Boolean);
}

/**
 * Bab untuk sebuah sesi: gabungan bab topik terpilih, tanpa duplikat, urut
 * kemunculan. Topik yang diketik bebas tidak punya bab → tidak menyumbang apa pun.
 */
export function mergeTopicUnits(topics: readonly string[], unitsByTopic: Record<string, string>): string {
  const units: string[] = [];
  for (const t of topics) {
    const u = unitsByTopic[t];
    if (u && !units.includes(u)) units.push(u);
  }
  return units.join("; ");
}

/**
 * Topik unik dari beberapa sesi terakhir, untuk chip "Topik sesi lalu"
 * (audit P1 #8). Sesi dianggap terurut dari yang terbaru.
 */
export function recentTopics(
  sessions: ReadonlyArray<{ topic?: string }>,
  limit = 6,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of sessions) {
    for (const t of splitTopics(s.topic)) {
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(t);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/**
 * Tambahkan frasa chip situasi ke kolom bebas tanpa menduplikasi.
 * Dipisah koma karena kolom itu memang dibaca sebagai daftar frasa.
 */
export function appendSituasi(current: string, label: string): string {
  const parts = current.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.includes(label)) return current;
  return [...parts, label].join(", ");
}

/** Apakah sebuah chip situasi sudah aktif di kolom bebas? */
export function hasSituasi(current: string, label: string): boolean {
  return current.split(",").map((s) => s.trim()).includes(label);
}

/**
 * Apa yang harus ditampilkan blok "sesi hari ini" di Beranda (audit B-01).
 *
 * `useLiveQuery` mengembalikan `undefined` selama query pertama berjalan. Sebelum
 * pemisahan ini, keadaan "belum siap" tidak bisa dibedakan dari "memang tidak ada
 * sesi", sehingga Beranda sempat berkata "Tidak ada sesi hari ini" padahal datanya
 * belum datang. Fungsi murni supaya aturan ini bisa diuji tanpa merender layar.
 */
export function todayHeroLoadState(
  todaySessions: readonly unknown[] | undefined,
  students: readonly unknown[] | undefined,
): "loading" | "ready" {
  return todaySessions === undefined || students === undefined ? "loading" : "ready";
}

/**
 * Kata kunci yang menandai kalimat sebagai kegagalan. Dipakai bersama oleh
 * `feedbackTypeForResult` dan (sebagai kontrak) oleh pesan yang dihasilkan
 * `saveErrorMessage` — inilah sebabnya dua fungsi itu tinggal serumah.
 */
const KATA_GAGAL = /^(Gagal|Pilih)\b|Gagal:|^Penyimpanan perangkat penuh|^Perangkat menolak menyimpan/i;

/**
 * Jenis umpan balik untuk hasil sebuah aksi (audit L-08).
 *
 * Sebelumnya seluruh hasil dikirim lewat `toast.info` sehingga
 * "Jadwal ditambahkan ✓" dan "Gagal: …" tampak sama. Aturannya berdasarkan pesan
 * karena di Beranda pesan itu datang dari empat modal berbeda dan tidak seragam:
 * `AddScheduleModal`/`ResolveMissedSessionModal`/`EditSessionModal` memakai
 * awalan "Gagal: …" atau "Pilih …", sedangkan "tidak hadir ditandai" adalah hasil
 * yang BERHASIL.
 *
 * Dua kata kunci terakhir menjaga pesan dari `saveErrorMessage` (layar Catat Sesi)
 * tetap terbaca sebagai kegagalan bila kelak ditampilkan sebagai toast — tanpa itu,
 * pesan "Penyimpanan perangkat penuh…" akan lolos sebagai keberhasilan.
 */
export function feedbackTypeForResult(text: string): "success" | "error" {
  const t = text.trim();
  return KATA_GAGAL.test(t) ? "error" : "success";
}

/**
 * Terjemahkan kegagalan simpan sesi ke bahasa manusia (audit C-11).
 *
 * Sebelumnya banner menampilkan `e.message` MENTAH — tutor melihat
 * "QuotaExceededError: ..." atau "AbortError ..." yang tidak memberi tahu apa
 * yang harus dilakukan, lalu menekan Simpan berulang.
 *
 * Sengaja HANYA memetakan dua sebab yang benar-benar bisa dipastikan dari nilai
 * error-nya (nama `QuotaExceededError` dan pesan kegagalan tulis `localStorage`).
 * Sebab lain tetap ditampilkan apa adanya sebagai "Simpan gagal: <pesan>" —
 * menerka-nerka arti nama error lain akan menghasilkan instruksi pemulihan yang
 * belum pernah diuji.
 */
export function saveErrorMessage(e: unknown, fallback = "terjadi kesalahan."): string {
  const name = typeof e === "object" && e !== null
    ? String((e as { name?: unknown }).name ?? "")
    : "";
  const raw = e instanceof Error ? e.message : String(e ?? "");
  const text = raw.trim() || fallback;

  if (name === "QuotaExceededError") {
    return "Penyimpanan perangkat penuh. Unduh backup dari Pengaturan lalu hapus foto sesi lama — sesi ini belum tersimpan.";
  }
  // Catatan pola: alternasi diperiksa berurutan, jadi `storage is not` HARUS
  // berada setelah `storage` — kalau didahulukan, pesan DOM yang hanya memuat
  // "Storage" tidak akan cocok (bug yang ditemukan test ini).
  if (name === "SecurityError" || /storage|penyimpanan/i.test(text)) {
    return "Perangkat menolak menyimpan data (penyimpanan diblokir atau penuh). Sesi ini belum tersimpan.";
  }
  return `Simpan gagal: ${text}`;
}

/**
 * Langkah "Materi" (mapel & topik). Angkanya ditulis di sini — bukan diambil dari
 * `STEP_META` — karena C-08 secara eksplisit tidak boleh mengubah `constants.ts`;
 * kalau urutan langkah kelak bergeser, tes `isStepSkippable` akan menangkapnya.
 */
const MATERI_STEP = 2;

/**
 * Apakah bilah aksi menawarkan "Lewati" di langkah ini?
 *
 * Dua aturan yang bertemu di sini:
 *
 * - **C-09 (sudah berlaku sebelumnya):** langkah Bukti (6) **tidak** punya
 *   "Lewati". Langkah itu optsional tetapi hanya boleh punya satu tombol simpan —
 *   dulu ada tiga tombol berbeda untuk satu aksi yang sama.
 * - **C-08 (2026-10-05):** langkah Materi (2) tidak wajib bagi murid yang
 *   profilnya belum berisi mapel. Label kolomnya sudah berbunyi "(opsional)"
 *   untuk murid itu, tetapi bilah aksi tetap hanya menawarkan "Lanjut →" —
 *   tutor harus menebak bahwa langkah itu boleh dilewati. Kini tombolnya ikut
 *   muncul, jadi label dan tombolnya mengatakan hal yang sama.
 *
 * `STEP_META` tidak disentuh oleh aturan ini: langkah tetap 6, dan langkah 2
 * tetap bertanda tidak opsional (karena bagi murid yang sudah punya mapel ia
 * memang wajib).
 */
export function isStepSkippable(step: number, stepOptional: boolean, hasProfileSubjects: boolean): boolean {
  if (step === STEP_MAX) return false;      // C-09
  if (stepOptional) return true;
  return step === MATERI_STEP && !hasProfileSubjects; // C-08
}

/** Nomor langkah wajib lain yang diperiksa stepper (C-04). */
const JADWAL_STEP = 1;
const CATATAN_STEP = 5;

/** Isi wizard yang menentukan apakah sebuah langkah wajib sudah lengkap. */
export interface StepFillState {
  studentId: string;
  /** Mapel yang dipilih tutor di langkah ini. */
  subjects: readonly string[];
  /** Mapel dari profil murid; kosong = langkah Materi tidak wajib (C-08). */
  profileSubjects: readonly string[];
  shortNote: string;
}

/**
 * Apakah syarat wajib satu langkah sudah terpenuhi?
 *
 * Sengaja mencerminkan `validateCurrentStep()` di layar Catat Sesi supaya badge
 * dan pesan galat tidak pernah berbeda pendapat. Yang **tidak** diperiksa di sini:
 * bentrok jadwal (`scheduleCaptureMismatch`) — itu bukan "belum diisi", melainkan
 * "tidak cocok dengan jadwal", dan pesannya sudah punya jalur sendiri.
 */
export function isStepComplete(step: number, fill: StepFillState): boolean {
  if (step === JADWAL_STEP)  return fill.studentId.trim().length > 0;
  if (step === MATERI_STEP)  return fill.profileSubjects.length === 0 || fill.subjects.length > 0;
  if (step === CATATAN_STEP) return fill.shortNote.trim().length > 0;
  return true; // langkah opsional selalu "lengkap"
}

/**
 * Langkah wajib yang **belum lengkap** dan sudah dijalani/dilewati tutor —
 * dasar badge `!` di stepper (C-04).
 *
 * Kenapa hanya langkah yang `<= currentStep`: badge ini menjawab "apa yang
 * tertinggal di belakang?", bukan "apa yang belum saya buka di depan?". Kalau
 * langkah di depan ikut ditandai, wizard yang baru dibuka langsung penuh tanda
 * dan tandanya berhenti bermakna.
 */
export function incompleteSteps(fill: StepFillState, currentStep: number): number[] {
  const missing: number[] = [];
  for (const step of [JADWAL_STEP, MATERI_STEP, CATATAN_STEP]) {
    if (step > currentStep) continue;
    if (!isStepComplete(step, fill)) missing.push(step);
  }
  return missing;
}

/**
 * Perpindahan pilihan di dalam `radiogroup` saat tombol navigasi ditekan
 * (**C-03 opsi c2**, keputusan pemilik 2026-10-05).
 *
 * Mengembalikan **indeks tujuan** (0-based), atau `null` bila tombolnya bukan
 * tombol navigasi grup radio — penting: `null` berarti "jangan sentuh apa pun",
 * sehingga Tab/Enter/ketikan tetap berperilaku bawaan.
 *
 * Aturan pola WAI-ARIA: panah ↓/→ maju, ↑/← mundur, keduanya **membungkus**
 * (dari pilihan terakhir kembali ke pertama), `Home`/`End` lompat ke ujung.
 * Pilihan yang belum ada (`currentIndex < 0`) diperlakukan sebagai "sebelum
 * yang pertama", jadi panah maju masuk ke pilihan pertama dan panah mundur ke
 * yang terakhir.
 */
export function nextRadioIndex(key: string, currentIndex: number, count: number): number | null {
  if (count <= 0) return null;
  const last = count - 1;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return currentIndex < 0 ? 0 : (currentIndex + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return currentIndex < 0 ? last : (currentIndex - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}
