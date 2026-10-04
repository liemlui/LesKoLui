import { describe, it, expect } from "vitest";
import {
  buildWaMessage, topicLevelHint, draftStamp,
  mergeTopics, splitTopics, mergeTopicUnits, recentTopics,
  appendSituasi, hasSituasi, saveErrorMessage, feedbackTypeForResult, todayHeroLoadState,
  isStepSkippable, isStepComplete, incompleteSteps,
} from "../screens/captureSession/helpers";
import {
  DURATIONS, STEP_META, isValidStep, ENGAGEMENT_FLAG_META, SITUASI_CHIPS,
  SAVE_STEPS, canSaveFromStep,
} from "../screens/captureSession/constants";
import { PRIMARY_ENGAGEMENT_FLAGS, SECONDARY_ENGAGEMENT_FLAGS } from "../screens/captureSession/useEngagement";

/**
 * Test untuk logika murni yang diekstrak dari `screens/CaptureSession.tsx`
 * (audit utang teknis #3). Sebelum ekstraksi, aturan-aturan ini hanya bisa diuji
 * dengan merender seluruh layar 2.500 baris — atau tidak diuji sama sekali.
 */
describe("buildWaMessage", () => {
  const student = { name: "Andi" };
  const base = {
    date: "2026-06-18", subjects: ["Mathematics AA"], durationHours: 2,
    shortNote: "Latihan integral", topic: "Integral tertentu",
  };

  it("memuat identitas sesi dan salam tutor", () => {
    const msg = buildWaMessage(student, base, [], "Ko Lui");
    expect(msg).toContain("Sesi les *Andi*");
    expect(msg).toContain("*Mapel:* Mathematics AA");
    expect(msg).toContain("*Durasi:* 2 jam");
    expect(msg).toContain("*Catatan:* Latihan integral");
    expect(msg).toContain("*Topik:* Integral tertentu");
    expect(msg).toContain("Ko Lui");
  });

  it("memakai nama pengganti bila nama tutor kosong", () => {
    expect(buildWaMessage(student, base, [], "")).toContain("Ko Lui");
  });

  it("menambahkan daftar fokus sesi berikutnya", () => {
    const msg = buildWaMessage(student, base, ["Ulangi aturan rantai", "Latihan soal"], "Ko Lui");
    expect(msg).toContain("🎯 *Fokus sesi berikutnya:*");
    expect(msg).toContain("• Ulangi aturan rantai");
    expect(msg).toContain("• Latihan soal");
  });

  it("membuang baris kosong saat tidak ada mapel/catatan/topik", () => {
    const msg = buildWaMessage(student, { ...base, subjects: [], shortNote: "", topic: undefined }, [], "Ko Lui");
    expect(msg).not.toContain("*Mapel:*");
    expect(msg).not.toContain("*Catatan:*");
    expect(msg).not.toContain("*Topik:*");
    // Tidak ada baris kosong ganda akibat filter
    expect(msg).not.toMatch(/\n\n\n/);
  });

  it("TIDAK memuat situasi pribadi (privasi ke orang tua)", () => {
    // `situasiNote` sengaja tidak ada di ringkasan WA — ini informasi kekeluargaan.
    const msg = buildWaMessage(
      student,
      { ...base, ...({ situasiNote: "habis sakit" } as Record<string, unknown>) },
      [],
      "Ko Lui",
    );
    expect(msg).not.toContain("habis sakit");
  });
});

describe("topicLevelHint", () => {
  it("memakai label grade untuk IB MYP", () => {
    expect(topicLevelHint("IB MYP", "Grade 8", "MYP 3-4")).toBe("MYP 3-4 / Grade 8-9");
  });

  it("memakai 'Kelas N' untuk kurikulum Nasional", () => {
    expect(topicLevelHint("National", "XII", "SMA 12")).toBe("Kelas XII");
  });

  it("memakai level target untuk kurikulum lain", () => {
    expect(topicLevelHint("Cambridge IGCSE", "Grade 10", "IGCSE")).toBe("IGCSE");
  });

  it("mengembalikan null bila level target tidak diketahui", () => {
    expect(topicLevelHint("Custom", undefined, null)).toBeNull();
  });
});

describe("draftStamp", () => {
  it("memformat waktu tersimpan", () => {
    expect(draftStamp("2026-09-12T20:14:00")).toMatch(/12/);
    expect(draftStamp("2026-09-12T20:14:00")).toMatch(/20[.:]14/);
  });

  it("mengembalikan string kosong untuk tanggal rusak", () => {
    // `toLocaleString` TIDAK melempar untuk tanggal rusak — ia mengembalikan
    // "Invalid Date" (bug yang ditemukan test ini).
    expect(draftStamp("bukan-tanggal")).toBe("");
    expect(draftStamp("")).toBe("");
    expect(draftStamp(undefined as unknown as string)).toBe("");
  });
});

describe("mergeTopics / splitTopics", () => {
  it("menggabungkan topik terpilih + ketikan yang belum di-commit tanpa duplikat", () => {
    expect(mergeTopics(["Integral"], "Turunan; Integral")).toBe("Integral; Turunan");
  });

  it("mengabaikan bagian kosong dan spasi berlebih", () => {
    expect(mergeTopics([], "  A ;; B  ")).toBe("A; B");
    expect(mergeTopics([], "")).toBe("");
  });

  it("bolak-balik tetap konsisten", () => {
    const merged = mergeTopics(["A", "B"], "C; A");
    expect(splitTopics(merged)).toEqual(["A", "B", "C"]);
  });

  it("splitTopics aman untuk nilai kosong", () => {
    expect(splitTopics(undefined)).toEqual([]);
    expect(splitTopics("")).toEqual([]);
  });
});

describe("mergeTopicUnits", () => {
  it("menggabungkan bab unik sesuai urutan topik", () => {
    expect(mergeTopicUnits(["A", "B", "C"], { A: "Bab 1", B: "Bab 1", C: "Bab 2" })).toBe("Bab 1; Bab 2");
  });

  it("mengabaikan topik bebas yang tidak punya bab", () => {
    expect(mergeTopicUnits(["Bebas", "A"], { A: "Bab 5" })).toBe("Bab 5");
    expect(mergeTopicUnits(["Bebas"], {})).toBe("");
  });
});

describe("recentTopics", () => {
  const sessions = [
    { topic: "Integral; Turunan" },
    { topic: "Turunan; Limit" },
    { topic: undefined },
    { topic: "Limit" },
  ];

  it("mengambil topik unik dari sesi terbaru lebih dulu", () => {
    expect(recentTopics(sessions)).toEqual(["Integral", "Turunan", "Limit"]);
  });

  it("menghormati batas jumlah", () => {
    expect(recentTopics(sessions, 2)).toEqual(["Integral", "Turunan"]);
  });

  it("mengembalikan array kosong bila tidak ada topik", () => {
    expect(recentTopics([{}, { topic: "" }])).toEqual([]);
  });
});

describe("appendSituasi / hasSituasi", () => {
  it("menambahkan frasa dengan pemisah koma", () => {
    expect(appendSituasi("", "Habis sakit")).toBe("Habis sakit");
    expect(appendSituasi("Kurang tidur", "Habis sakit")).toBe("Kurang tidur, Habis sakit");
  });

  it("tidak menambahkan frasa yang sudah ada", () => {
    expect(appendSituasi("Habis sakit", "Habis sakit")).toBe("Habis sakit");
    expect(appendSituasi("Habis sakit, Kurang tidur", "Habis sakit")).toBe("Habis sakit, Kurang tidur");
  });

  it("hasSituasi mengenali frasa di posisi mana pun", () => {
    expect(hasSituasi("A, Habis sakit, B", "Habis sakit")).toBe(true);
    expect(hasSituasi("A, B", "Habis sakit")).toBe(false);
    expect(hasSituasi("", "Habis sakit")).toBe(false);
  });

  it("tahan spasi berlebih", () => {
    expect(hasSituasi("  Habis sakit  ,  Kurang tidur ", "Kurang tidur")).toBe(true);
  });
});

describe("saveErrorMessage (audit C-11)", () => {
  it("menjelaskan penyimpanan penuh + langkah pemulihannya untuk QuotaExceededError", () => {
    const e = new Error("The quota has been exceeded.");
    e.name = "QuotaExceededError";
    const msg = saveErrorMessage(e);
    expect(msg).toContain("Penyimpanan perangkat penuh");
    expect(msg).toContain("backup");
    // Pesan mentah browser tidak boleh bocor ke tutor.
    expect(msg).not.toContain("quota has been exceeded");
  });

  it("mengenali kegagalan tulis localStorage dari pesannya", () => {
    const msg = saveErrorMessage(new Error("Failed to execute 'setItem' on 'Storage': quota exceeded"));
    expect(msg).toContain("Perangkat menolak menyimpan data");
    expect(msg).toContain("belum tersimpan");
  });

  it("mengenali SecurityError (penyimpanan diblokir)", () => {
    const e = new Error("The operation is insecure.");
    e.name = "SecurityError";
    expect(saveErrorMessage(e)).toContain("Perangkat menolak menyimpan data");
  });

  it("memakai kalimat generik + pesan asli untuk error lain", () => {
    expect(saveErrorMessage(new Error("AbortError: transaksi dibatalkan"))).toBe(
      "Simpan gagal: AbortError: transaksi dibatalkan",
    );
  });

  it("tidak menampilkan 'undefined' untuk error kosong, non-Error, atau undefined", () => {
    const fallback = "Simpan gagal: terjadi kesalahan.";
    expect(saveErrorMessage(new Error(""))).toBe(fallback);
    expect(saveErrorMessage("gagal total")).toBe("Simpan gagal: gagal total");
    expect(saveErrorMessage(undefined)).toBe(fallback);
    expect(saveErrorMessage(null)).toBe(fallback);
    expect(saveErrorMessage(undefined as unknown as Error)).not.toContain("undefined");
  });
});

describe("feedbackTypeForResult (audit L-08)", () => {
  it("menandai kegagalan sebagai error (awalan Gagal/Pilih)", () => {
    expect(feedbackTypeForResult("Gagal: QuotaExceededError")).toBe("error");
    expect(feedbackTypeForResult("Gagal: transaksi dibatalkan")).toBe("error");
    expect(feedbackTypeForResult("Pilih murid dulu.")).toBe("error");
  });

  it("mengenali 'Gagal:' di tengah kalimat", () => {
    expect(feedbackTypeForResult("Pengeluaran Gagal: koneksi putus")).toBe("error");
  });

  it("hasil yang berhasil (termasuk yang tidak berbunyi ✓) tetap success", () => {
    expect(feedbackTypeForResult("Jadwal ditambahkan ✓")).toBe("success");
    expect(feedbackTypeForResult("3 jadwal dibuat ✓")).toBe("success");
    expect(feedbackTypeForResult("Jadwal diperbarui ✓")).toBe("success");
    expect(feedbackTypeForResult("Sesi dijadwalkan ulang ✓")).toBe("success");
    expect(feedbackTypeForResult("Tidak hadir ditandai — tetap ditagihkan.")).toBe("success");
    expect(feedbackTypeForResult("Tandai selesai ✓")).toBe("success");
  });

  it("tahan spasi berlebih di awal pesan", () => {
    expect(feedbackTypeForResult("  Pilih murid dulu.  ")).toBe("error");
  });

  it("pesan dari saveErrorMessage juga terbaca sebagai kegagalan", () => {
    // Kontrak silang: pesan mapper (dipakai banner Catat Sesi) TIDAK boleh lolos
    // sebagai keberhasilan bila kelak dikirim lewat toast.
    const quota = new Error("x");
    quota.name = "QuotaExceededError";
    expect(feedbackTypeForResult(saveErrorMessage(quota))).toBe("error");
    expect(feedbackTypeForResult(saveErrorMessage(new Error("setItem on 'Storage' gagal")))).toBe("error");
    expect(feedbackTypeForResult(saveErrorMessage(new Error("AbortError")))).toBe("error");
  });
});

describe("todayHeroLoadState (audit B-01)", () => {
  it("belum siap selama salah satu query belum mengembalikan nilai", () => {
    expect(todayHeroLoadState(undefined, [])).toBe("loading");
    expect(todayHeroLoadState([], undefined)).toBe("loading");
    expect(todayHeroLoadState(undefined, undefined)).toBe("loading");
  });

  it("siap begitu keduanya sudah mengembalikan nilai — termasuk daftar kosong", () => {
    // Daftar kosong yang SUDAH dimuat tetap "ready": empty state-nya sah.
    expect(todayHeroLoadState([], [])).toBe("ready");
    expect(todayHeroLoadState([{ id: "s1" }], [{ id: "m1" }])).toBe("ready");
  });
});

describe("konstanta wizard", () => {
  it("memuat 6 langkah berurutan dengan id 1..6", () => {
    expect(STEP_META.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(STEP_META.every((s) => s.label && s.desc && s.icon)).toBe(true);
  });

  it("isValidStep menolak nilai di luar rentang dan bukan bilangan bulat", () => {
    expect(isValidStep(1)).toBe(true);
    expect(isValidStep(6)).toBe(true);
    expect(isValidStep(0)).toBe(false);
    expect(isValidStep(7)).toBe(false);
    expect(isValidStep(2.5)).toBe(false);
    expect(isValidStep("3")).toBe(false);
    expect(isValidStep(undefined)).toBe(false);
  });

  /**
   * Q2 (L7): sesi boleh disimpan dari langkah 5 **dan** 6.
   *
   * Kenapa dijaga tes: sebelum 2026-10-05 aturan ini hanya hidup di dokumen,
   * sedangkan `goNext()` menyimpan **hanya** di langkah 6 — jadi tutor yang tidak
   * butuh Bukti tetap dipaksa melewati langkah 6. Tes ini mengunci aturannya,
   * bukan sekadar bentuk tombolnya.
   */
  it("canSaveFromStep: simpan boleh dari langkah 5 dan 6 saja (Q2)", () => {
    expect(canSaveFromStep(5)).toBe(true);
    expect(canSaveFromStep(6)).toBe(true);
    for (const step of [1, 2, 3, 4]) {
      expect(canSaveFromStep(step), `langkah ${step} belum lengkap — jangan boleh disimpan`).toBe(false);
    }
    expect(canSaveFromStep(0)).toBe(false);
    expect(canSaveFromStep(7)).toBe(false);
    expect([...SAVE_STEPS]).toEqual([5, 6]);
  });

  /** Q2 tetap **bukan** pengurangan langkah: keenam langkah masih ada dan langkah
   *  6 (Bukti) masih opsional — bukan langkah mati yang dilewati semua orang. */
  it("Q2 tidak mengurangi langkah: STEP_META tetap 6 dan Bukti tetap opsional", () => {
    expect(STEP_META).toHaveLength(6);
    expect(STEP_META.find((s) => s.id === 5)?.label).toBe("Catatan");
    expect(STEP_META.find((s) => s.id === 6)?.label).toBe("Bukti");
    expect(STEP_META.find((s) => s.id === 6)?.optional).toBe(true);
  });

  /**
   * C-08 (2026-10-05). Sebelum ini "Lewati" hanya muncul di langkah yang
   * `optional: true` — akibatnya murid yang profilnya belum berisi mapel tetap
   * melihat langkah Materi tanpa jalan keluar yang terlihat, padahal label
   * kolomnya sendiri sudah berbunyi "(opsional)". Aturan barunya diuji di sini
   * supaya ia tidak menghapus C-09 (langkah Bukti = satu tombol simpan).
   */
  it("isStepSkippable: C-08 menambah langkah Materi, C-09 tetap menahan langkah Bukti", () => {
    const OPT = STEP_META.map((s) => s.optional);
    // Langkah opsional tetap boleh dilewati.
    expect(isStepSkippable(3, OPT[2], false)).toBe(true);
    expect(isStepSkippable(4, OPT[3], false)).toBe(true);
    // C-09: langkah Bukti tidak pernah punya "Lewati".
    expect(isStepSkippable(6, true, false)).toBe(false);
    expect(isStepSkippable(6, true, true)).toBe(false);
    // C-08: langkah Materi boleh dilewati HANYA bila murid tanpa mapel profil.
    expect(isStepSkippable(2, OPT[1], false)).toBe(true);
    expect(isStepSkippable(2, OPT[1], true)).toBe(false);
    // Langkah wajib lain tidak pernah bisa dilewati.
    expect(isStepSkippable(1, OPT[0], false)).toBe(false);
    expect(isStepSkippable(5, OPT[4], false)).toBe(false);
    // Dan STEP_META memang tidak diubah untuk keperluan C-08:
    expect(OPT[1]).toBe(false);
  });

  /**
   * C-04 (2026-10-05): badge "!" di stepper untuk langkah wajib yang belum
   * lengkap. Yang dijaga: aturannya **mencerminkan validasi "Lanjut →"**, jadi
   * badge tidak boleh menyala di langkah yang sebenarnya sudah boleh ditinggalkan
   * (mis. Materi bagi murid tanpa mapel — lihat C-08), dan sebaliknya tidak boleh
   * diam di langkah yang pasti ditolak.
   */
  it("incompleteSteps: menandai langkah wajib yang belum lengkap, sesuai validasi Lanjut", () => {
    const kosong = { studentId: "", subjects: [], profileSubjects: [], shortNote: "" };
    const lengkap = { studentId: "s-1", subjects: ["Math"], profileSubjects: ["Math"], shortNote: "catatan" };

    // Form kosong: langkah 1 & 5 memang wajib → ditandai; langkah 2 tidak, karena
    // murid ini belum punya mapel profil.
    expect(incompleteSteps(kosong, 1)).toEqual([1]);
    expect(incompleteSteps(kosong, 2)).toEqual([1]);
    expect(incompleteSteps(kosong, 5)).toEqual([1, 5]);
    expect(incompleteSteps(lengkap, 6)).toEqual([]);

    // Murid yang punya mapel profil: langkah 2 jadi wajib sampai ada pilihan.
    expect(isStepComplete(2, { ...kosong, profileSubjects: ["Math"] })).toBe(false);
    expect(isStepComplete(2, { ...kosong, profileSubjects: ["Math"], subjects: ["Math"] })).toBe(true);
    // ...dan opsional bagi murid tanpa mapel profil (C-08).
    expect(isStepComplete(2, kosong)).toBe(true);

    // Langkah opsional (3, 4, 6) selalu dianggap lengkap.
    for (const step of [3, 4, 6]) expect(isStepComplete(step, kosong)).toBe(true);

    // Hanya langkah yang sudah dijalani yang ditandai: wizard yang baru dibuka
    // tidak boleh langsung penuh tanda.
    expect(incompleteSteps(lengkap, 1)).toEqual([]);
    expect(incompleteSteps({ ...lengkap, shortNote: "" }, 4)).toEqual([]);   // langkah 5 belum dibuka
    expect(incompleteSteps({ ...lengkap, shortNote: "" }, 5)).toEqual([5]);
    // Spasi saja tidak dianggap terisi (sama seperti `shortNote.trim()` di layar).
    expect(incompleteSteps({ ...lengkap, shortNote: "   " }, 6)).toEqual([5]);
  });

  it("durasi menaik dan mencakup nilai minimum aplikasi", () => {
    expect([...DURATIONS]).toEqual([...DURATIONS].sort((a, b) => a - b));
    expect(DURATIONS[0]).toBe(1);
  });

  it("setiap indikator punya ikon, label, dan bobot — tanpa ikon kembar di dalamnya", () => {
    const entries = Object.entries(ENGAGEMENT_FLAG_META);
    expect(entries).toHaveLength(12);
    for (const [key, meta] of entries) {
      expect(meta.icon, `${key} tanpa ikon`).toBeTruthy();
      expect(meta.label, `${key} tanpa label`).toBeTruthy();
      expect(meta.delta).toMatch(/^[+−]\d$/);
    }
  });

  it("ikon indikator tidak bertabrakan dengan ikon mood (audit P2 #15)", () => {
    // Sebelumnya 🌟 dipakai mood "Semangat" DAN tag "Antusias"; 😴 dipakai mood
    // "Lelah" DAN indikator "Mengantuk".
    const moodIcons = new Set(["🔥", "📌", "🌤️", "🌙", "🧩"]);
    const collisions = Object.entries(ENGAGEMENT_FLAG_META)
      .filter(([, meta]) => moodIcons.has(meta.icon))
      .map(([key]) => key);
    expect(collisions).toEqual([]);
  });

  it("chip situasi punya label unik", () => {
    const labels = SITUASI_CHIPS.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("pembagian indikator terdepan vs sisanya", () => {
  it("enam terdepan + sisanya menutup ke-12 indikator tanpa tumpang tindih", () => {
    expect(PRIMARY_ENGAGEMENT_FLAGS).toHaveLength(6);
    expect(SECONDARY_ENGAGEMENT_FLAGS).toHaveLength(6);
    const all = [...PRIMARY_ENGAGEMENT_FLAGS, ...SECONDARY_ENGAGEMENT_FLAGS];
    expect(new Set(all).size).toBe(12);
    for (const key of all) expect(ENGAGEMENT_FLAG_META[key]).toBeDefined();
  });
});
