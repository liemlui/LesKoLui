/**
 * Kebalikan dari operasi hapus di wizard Catat Sesi (G3-01 fitur #7 — C-13).
 *
 * **Kenapa fungsi murni.** Toolchain ini belum punya React Testing Library
 * (lihat catatan di `helpers.ts`), jadi perilaku yang bisa diuji HARUS berada di
 * luar komponen. Yang diuji di sini adalah **aturan pemulihan**: item kembali ke
 * **posisi semula**, bukan ditambahkan di ujung daftar.
 *
 * **Kenapa posisi itu penting.** Chip topik punya urutan karena urutan itu ikut
 * tersimpan ke sesi (`mergeTopics`) dan muncul di pesan WhatsApp ke orang tua.
 * "Urungkan" yang menaruh topik di ujung akan mengubah urutan yang sudah
 * disusun tutor — itu bukan undo, itu penyisipan baru.
 *
 * Kedua fungsi tidak pernah menggandakan item dan tidak melakukan apa pun bila
 * itemnya sudah ada (mis. tutor memilih ulang topik yang sama sebelum sempat
 * menekan "Urungkan").
 */

/** Geser posisi ke dalam rentang daftar; posisi rusak = taruh di ujung. */
function clampIndex(index: number, length: number): number {
  if (!Number.isFinite(index)) return length;
  return Math.min(Math.max(Math.trunc(index), 0), length);
}

/**
 * Kembalikan satu topik yang dihapus — bersama bab katalognya, pada posisi asal.
 *
 * `unit` diisi hanya bila topik itu memang punya bab (topik yang diketik bebas
 * tidak punya). `topicUnits` tidak pernah menyimpan nilai kosong, jadi `unit`
 * yang kosong sengaja tidak ditulis.
 */
export function withTopicRestored(
  topics: readonly string[],
  topicUnits: Record<string, string>,
  topicName: string,
  unit: string | undefined,
  index: number,
): { topics: string[]; topicUnits: Record<string, string> } {
  if (topics.includes(topicName)) return { topics: [...topics], topicUnits: { ...topicUnits } };

  const nextTopics = [...topics];
  nextTopics.splice(clampIndex(index, nextTopics.length), 0, topicName);

  const nextUnits = { ...topicUnits };
  if (unit && !nextUnits[topicName]) nextUnits[topicName] = unit;

  return { topics: nextTopics, topicUnits: nextUnits };
}

/** Kembalikan satu tindak lanjut (fokus sesi berikutnya) pada posisi asal. */
export function withFollowUpRestored<T extends { id: string }>(
  list: readonly T[],
  item: T,
  index: number,
): T[] {
  if (list.some((existing) => existing.id === item.id)) return [...list];

  const next = [...list];
  next.splice(clampIndex(index, next.length), 0, item);
  return next;
}
