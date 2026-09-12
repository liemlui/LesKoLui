import type { CaptureDraft, CaptureDraftForm } from "../db/types";

/**
 * Sidik jari isi draf — dipakai untuk memutuskan apakah draf perlu ditulis.
 *
 * Alasan modul ini ada: `draftForm` di `CaptureSession` dibangun sebagai objek
 * literal pada setiap render, sehingga identitas objeknya selalu berubah.
 * Sebelumnya efek debounce di `useCaptureDraft` memakai identitas itu sebagai
 * dependensi → timer 500 ms ter-arm ulang setiap render → tulis IndexedDB
 * berulang tanpa perubahan data (audit C-17: ~108 tulis/menit, layar berkedip
 * 2×/detik). Perbandingan berbasis isi ini kebal terhadap churn identitas.
 */

/** Urutan tetap agar sidik jari stabil apa pun urutan kunci objeknya. */
const FLAG_KEYS = [
  "prepared", "focused", "activeAsking", "quickLearner",
  "drowsy", "playingPhone", "needsRepetition", "hwMissed",
  "late", "bathroomBreaks", "restless", "offTask",
] as const;

const SEP = "\u0001";

/** Blob tidak bisa di-serialize; cukup ukuran + tipe sebagai penanda. */
function blobKey(blob?: Blob): string {
  return blob ? `${blob.size}:${blob.type}` : "-";
}

function flagBits(flags: Partial<Record<(typeof FLAG_KEYS)[number], boolean>> | undefined): string {
  if (!flags) return "";
  return FLAG_KEYS.map((key) => (flags[key] ? "1" : "0")).join("");
}

/** Sidik jari seluruh isi form yang ikut tersimpan ke draf. */
export function captureDraftDigest(form: CaptureDraftForm): string {
  const closeout = form.closeout;
  return [
    form.step,
    form.date,
    form.durationHours,
    form.subjects.join("|"),
    form.topic,
    form.topicSearch,
    form.shortNote,
    form.needsWork,
    form.predictedGrade,
    form.mood ?? "",
    flagBits(form.engagementFlags),
    form.behaviorTags.join("|"),
    form.responseTag ?? "",
    form.situasiNote,
    form.sessionType ?? "",
    blobKey(form.photo),
    blobKey(form.signature),
    closeout ? `${closeout.session.id}:${closeout.followUps.map((f) => f.text).join("|")}:${closeout.followUpText}` : "",
  ].join(SEP);
}

/**
 * Kunci persistensi = isi form + fase + sesi tersimpan. Perubahan fase
 * (`editing` → `closeout`) juga harus tertulis walau isi form sama.
 */
export function captureDraftPersistKey(
  form: CaptureDraftForm,
  phase: CaptureDraft["phase"],
  savedSessionId?: string,
): string {
  return [phase, savedSessionId ?? "", captureDraftDigest(form)].join(SEP);
}

/** Kunci persistensi dari draf yang sudah tersimpan. */
export function captureDraftPersistKeyOf(draft: CaptureDraft): string {
  return captureDraftPersistKey(draft.form, draft.phase, draft.savedSessionId);
}

/**
 * Boleh dijadwalkan menulis? Hanya bila scope sudah ter-hidrasi **dan** isinya
 * benar-benar berbeda dari penulisan terakhir. Inilah penjaga anti-loop C-17:
 * dengan isi yang sama, tidak ada jadwal tulis → tidak ada perubahan status →
 * tidak ada render tambahan.
 */
export function shouldPersistDraft(
  hydrated: boolean,
  lastPersistedKey: string | null,
  nextKey: string,
): boolean {
  return hydrated && lastPersistedKey !== nextKey;
}
