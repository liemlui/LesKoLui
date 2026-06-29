/**
 * DEV-ONLY dummy data seeder.
 * Wired in main.tsx behind `import.meta.env.DEV`. Auto-runs once when the DB is
 * empty, and is also exposed as `window.seedDummy()` / `window.clearDummy()`.
 * Safe to delete this file (and its import in main.tsx) when no longer needed.
 */
import {
  createStudent, createSession, scheduleSession, scheduleBatch, closeMonth,
  markPaymentTransferred, updatePaymentAmount, createExpense, saveSettings, getSettings, listStudents,
  createHomework, createFollowUp, upsertRaporGrade, createIaEeProject,
  upsertPayment, cancelSession, listSessionsByStudentMonth, upsertReport,
} from "../db/repos";
import { hashPin } from "../lib/crypto";
import type { ExpenseCategory, EngagementLog } from "../db/types";

// ── Pembuat gambar dummy (canvas → Blob) untuk foto sesi, tanda tangan, logo ──
function makePhoto(label: string, hue: number): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = 320; c.height = 240;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 320, 240);
  g.addColorStop(0, `hsl(${hue},58%,55%)`);
  g.addColorStop(1, `hsl(${(hue + 40) % 360},58%,38%)`);
  x.fillStyle = g; x.fillRect(0, 0, 320, 240);
  x.fillStyle = "rgba(255,255,255,.94)";
  x.textAlign = "center"; x.font = "bold 26px system-ui, sans-serif";
  x.fillText(label, 160, 116);
  x.font = "13px system-ui, sans-serif";
  x.fillText("foto sesi (dummy)", 160, 144);
  return new Promise((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.8));
}

function makeSignature(name: string): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = 240; c.height = 90;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff"; x.fillRect(0, 0, 240, 90);
  x.strokeStyle = "#1a2a4a"; x.lineWidth = 2.4; x.lineCap = "round";
  x.beginPath(); x.moveTo(18, 58);
  for (let px = 18; px <= 222; px += 7) x.lineTo(px, 52 + Math.sin(px / 13) * 16 * (0.4 + Math.random() * 0.6));
  x.stroke();
  x.font = "italic 13px cursive"; x.fillStyle = "#555"; x.textAlign = "left";
  x.fillText(name, 22, 82);
  return new Promise((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.85));
}

function makeLogo(): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = 120; c.height = 120;
  const x = c.getContext("2d")!;
  x.fillStyle = "#2563eb"; x.beginPath(); x.arc(60, 60, 56, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#fff"; x.font = "bold 52px system-ui, sans-serif";
  x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("KL", 60, 66);
  return new Promise((res) => c.toBlob((b) => res(b!), "image/png", 0.9));
}

type S = { date: string; dur: number; note: string };

async function addDone(studentId: string, subjects: string[], rows: S[], eng?: number) {
  for (const r of rows) {
    await createSession({
      studentId,
      date: r.date,
      durationHours: r.dur,
      subjects,
      shortNote: r.note,
      status: "DONE",
      ...(eng ? { engagement: { score: eng } } : {}),
    });
  }
}

type RichS = {
  date: string; dur: number; note: string;
  mood?: string; topic?: string; needsWork?: string; predictedGrade?: string;
  narrative?: string; behaviorTags?: string[]; responseTag?: string;
  engagement?: EngagementLog; photo?: Blob; signature?: Blob;
};

async function addRichDone(studentId: string, subjects: string[], rows: RichS[]) {
  for (const r of rows) {
    await createSession({
      studentId,
      date: r.date,
      durationHours: r.dur,
      subjects,
      shortNote: r.note,
      status: "DONE",
      mood: r.mood,
      topic: r.topic,
      needsWork: r.needsWork,
      predictedGrade: r.predictedGrade,
      narrative: r.narrative,
      behaviorTags: r.behaviorTags,
      responseTag: r.responseTag,
      engagement: r.engagement,
      photo: r.photo,
      signature: r.signature,
    });
  }
}

let _seeding = false;

export async function seedDummyData(force = false): Promise<void> {
  if (_seeding) return; // cegah pemanggilan ganda berbarengan (double seed)
  _seeding = true;
  try {
    await seedInner(force);
  } finally {
    _seeding = false;
  }
}

async function seedInner(force: boolean): Promise<void> {
  const existing = await listStudents();
  if (existing.length > 0 && !force) {
    console.warn("[seedDummy] Sudah ada data murid — seed dilewati. Jalankan seedDummy(true) untuk memaksa, atau clearDummy() untuk reset.");
    return;
  }

  // ── Settings: tutor + rekening + PIN keuangan (123456) ──
  const s = await getSettings();
  await saveSettings({
    tutorProfile: {
      name:  s.tutorProfile?.name  || "Ko Lui",
      phone: s.tutorProfile?.phone || "081100000000",
    },
    bankAccounts: {
      ...s.bankAccounts,
      bca: s.bankAccounts?.bca || "1234567890",
      accountName: s.bankAccounts?.accountName || "Liem Lui",
    },
    ...(s.logo ? {} : { logo: await makeLogo() }),
    ...(s.financialPin ? {} : { financialPin: await hashPin("123456") }),
  });

  // ── Murid ──
  const andi = await createStudent({
    name: "Andi Pratama", level: "IBDP", curriculum: "IB DP", grade: "Grade 11",
    subjects: ["Mathematics AA", "Physics"],
    parentContact: { name: "Bpk. Pratama", phone: "081234567801" },
    studentPhone: "081299900001", school: "Jakarta Intercultural School",
    hourlyRate: 250000, active: true, enrolledAt: "2026-01-10",
    photo: await makePhoto("Andi", 210),
    notes: "Target nilai 7 di Math AA. Suka contoh aplikatif.",
  });
  const bella = await createStudent({
    name: "Bella Sari", level: "IBDP", curriculum: "IB DP", grade: "Grade 12",
    subjects: ["Physics", "Chemistry"],
    parentContact: { name: "Ibu Sari", phone: "081234567802" },
    hourlyRate: 300000, active: true, enrolledAt: "2025-09-01",
    photo: await makePhoto("Bella", 330),
  });
  const citra = await createStudent({
    name: "Citra Dewanti", level: "MYP", curriculum: "IB MYP", grade: "Grade 10",
    subjects: ["Economics"],
    parentContact: { name: "Bpk. Dewanti", phone: "081234567803" },
    hourlyRate: 200000, active: true, enrolledAt: "2026-02-15",
  });
  const dewi = await createStudent({
    name: "Dewi Anggraini", level: "IBDP", curriculum: "IB DP", grade: "Grade 11",
    subjects: ["Biology"],
    parentContact: { name: "Ibu Anggraini", phone: "081234567804" },
    hourlyRate: 275000, active: true, enrolledAt: "2025-11-20",
  });

  // ── Murid kurikulum lain ──
  const eko = await createStudent({
    name: "Eko Firmansyah", level: "MYP", curriculum: "Cambridge IGCSE", grade: "Grade 10",
    subjects: ["Economics", "Business Studies"],
    parentContact: { name: "Bpk. Firmansyah", phone: "081234567805" },
    hourlyRate: 225000, active: true, enrolledAt: "2026-03-01",
    school: "Global Cambridge School",
  });
  const fani = await createStudent({
    name: "Fani Hartono", level: "IBDP", curriculum: "AP", grade: "Grade 11",
    subjects: ["Calculus AB", "Physics 1"],
    parentContact: { name: "Ibu Hartono", phone: "081234567806" },
    hourlyRate: 325000, active: true, enrolledAt: "2025-08-15",
    school: "Springfield International Academy",
  });
  await createStudent({
    name: "Galih Pratomo", level: "IBDP", curriculum: "National", grade: "Grade 12",
    subjects: ["Mathematics", "Physics"],
    parentContact: { name: "Bpk. Pratomo", phone: "081234567807" },
    hourlyRate: 175000, active: false, enrolledAt: "2025-01-05",
    notes: "Sudah tidak aktif sejak Juni 2026 — lulus.",
  });

  // ── Sesi DONE (pemasukan fluktuatif bulan ke bulan) ──
  // Maret — bulan ringan
  await addDone(andi, ["Mathematics AA"], [{ date: "2026-03-05", dur: 2, note: "Kalkulus dasar" }, { date: "2026-03-19", dur: 2, note: "Limit & turunan" }], 8);
  await addDone(bella, ["Physics"],       [{ date: "2026-03-12", dur: 1.5, note: "Kinematika" }], 7);
  await addDone(citra, ["Economics"],     [{ date: "2026-03-08", dur: 2, note: "Demand & supply" }, { date: "2026-03-22", dur: 2, note: "Elastisitas" }], 6);

  // April — bulan ramai
  await addDone(andi, ["Mathematics AA"], [{ date: "2026-04-02", dur: 2, note: "Integral" }, { date: "2026-04-09", dur: 2, note: "Integral lanjutan" }, { date: "2026-04-16", dur: 2, note: "Aplikasi integral" }, { date: "2026-04-23", dur: 2, note: "Latihan soal" }], 9);
  await addDone(bella, ["Chemistry"],     [{ date: "2026-04-05", dur: 1.5, note: "Stoikiometri" }, { date: "2026-04-19", dur: 1.5, note: "Termokimia" }], 8);
  await addDone(citra, ["Economics"],     [{ date: "2026-04-12", dur: 2, note: "Market structure" }, { date: "2026-04-26", dur: 2, note: "Monopoli" }], 7);
  await addDone(dewi,  ["Biology"],       [{ date: "2026-04-15", dur: 2, note: "Sel & organel" }, { date: "2026-04-29", dur: 2, note: "Genetika" }], 8);

  // Mei — sedang
  await addDone(andi, ["Physics"],        [{ date: "2026-05-07", dur: 2, note: "Hukum Newton" }, { date: "2026-05-21", dur: 2, note: "Momentum" }], 8);
  await addDone(bella, ["Physics"],       [{ date: "2026-05-10", dur: 2, note: "Gelombang" }, { date: "2026-05-24", dur: 1.5, note: "Optik" }], 7);
  await addDone(citra, ["Economics"],     [{ date: "2026-05-17", dur: 2, note: "Makroekonomi" }], 6);
  await addDone(dewi,  ["Biology"],       [{ date: "2026-05-13", dur: 2, note: "Fotosintesis" }, { date: "2026-05-27", dur: 2, note: "Respirasi sel" }], 9);

  // Juni — bulan berjalan (belum ditutup)
  await addDone(andi, ["Mathematics AA"], [{ date: "2026-06-04", dur: 2, note: "Statistik" }, { date: "2026-06-18", dur: 2, note: "Probabilitas" }], 8);
  await addDone(bella, ["Chemistry"],     [{ date: "2026-06-11", dur: 2, note: "Kesetimbangan kimia" }], 7);
  await addDone(citra, ["Economics"],     [{ date: "2026-06-09", dur: 2, note: "Perdagangan internasional" }, { date: "2026-06-23", dur: 2, note: "Nilai tukar" }], 7);
  await addDone(dewi,  ["Biology"],       [{ date: "2026-06-16", dur: 2, note: "Evolusi" }], 8);
  // Sesi murid baru
  await addDone(eko,   ["Economics"],     [{ date: "2026-06-05", dur: 2, note: "Scarcity & opportunity cost" }], 7);
  await addDone(fani,  ["Calculus AB"],   [{ date: "2026-06-10", dur: 2, note: "Derivatives intro" }, { date: "2026-06-24", dur: 2, note: "Chain rule" }], 8);

  // ── Sesi dengan engagement + taxonomy lengkap ──
  await addRichDone(andi, ["Mathematics AA"], [
    {
      date: "2026-06-18", dur: 2, note: "Probabilitas — latihan soal",
      mood: "Fokus", topic: "Conditional probability", needsWork: "Bayes theorem application",
      predictedGrade: "6", narrative: "Andi sudah paham konsep dasar tapi masih perlu latihan soal cerita. Mampu mengerjakan 80% soal mandiri.",
      behaviorTags: ["diligent", "self-correcting"],
      responseTag: "correct-independent",
      engagement: { prepared: true, focused: true, activeAsking: true, quickLearner: false, score: 8 },
    },
  ]);
  await addRichDone(bella, ["Physics"], [
    {
      date: "2026-06-11", dur: 2, note: "Kesetimbangan kimia — review",
      mood: "Lelah", topic: "Le Chatelier's principle", needsWork: "Kalkulasi Kc & Kp",
      predictedGrade: "5", narrative: "Bella terlihat lelah setelah ujian sekolah. Tetap bisa menyelesaikan soal dasar tapi kesulitan di perhitungan kompleks.",
      behaviorTags: ["passive-responsive", "cautious"],
      responseTag: "correct-with-prompt",
      engagement: { drowsy: true, focused: false, needsRepetition: true, score: 5 },
    },
  ]);
  await addRichDone(dewi, ["Biology"], [
    {
      date: "2026-06-16", dur: 2, note: "Evolusi — seleksi alam",
      mood: "Antusias", topic: "Natural selection mechanisms", needsWork: "Genetic drift vs gene flow",
      predictedGrade: "7", narrative: "Dewi sangat antusias. Mampu menjelaskan kembali mekanisme seleksi alam dengan contoh yang tepat.",
      behaviorTags: ["enthusiastic", "reflective", "collaborative"],
      responseTag: "can-explain-orally",
      engagement: { prepared: true, focused: true, activeAsking: true, quickLearner: true, score: 9 },
    },
  ]);

  // ── Sesi CANCELLED ──
  const c1 = await scheduleSession({ studentId: bella, date: "2026-05-03", time: "15:00", durationHours: 1.5 });
  await cancelSession(c1);
  const c2 = await scheduleSession({ studentId: citra, date: "2026-06-14", time: "09:00", durationHours: 2 });
  await cancelSession(c2);
  const c3 = await scheduleSession({ studentId: fani,  date: "2026-06-21", time: "14:00", durationHours: 2 });
  await cancelSession(c3);

  // ── Sesi SCHEDULED overdue (tanggal lewat belum selesai) ──
  await scheduleSession({ studentId: andi,  date: "2026-06-25", time: "10:00", durationHours: 2 });
  await scheduleSession({ studentId: dewi,  date: "2026-06-28", time: "13:00", durationHours: 2 });

  // ── Sesi terjadwal Juli (untuk prediksi) ──
  await scheduleSession({ studentId: andi, date: "2026-07-02", time: "10:00", durationHours: 2 });
  await scheduleSession({ studentId: andi, date: "2026-07-16", time: "10:00", durationHours: 2 });
  await scheduleSession({ studentId: bella, date: "2026-07-09", time: "15:00", durationHours: 1.5 });
  await scheduleSession({ studentId: dewi,  date: "2026-07-14", time: "13:00", durationHours: 2 });

  // ── Tutup bulan + status transfer (untuk Realisasi & Piutang) ──
  await closeMonth("2026-03");                       // semua lunas
  await markPaymentTransferred(andi,  "2026-03");
  await markPaymentTransferred(bella, "2026-03");
  await markPaymentTransferred(citra, "2026-03");

  await closeMonth("2026-04");                       // sebagian lunas → ada piutang
  await markPaymentTransferred(andi,  "2026-04");

  await closeMonth("2026-05");                       // baru 1 lunas → piutang lebih besar
  await markPaymentTransferred(citra, "2026-05");
  // Juni sengaja dibiarkan terbuka agar bisa dites manual.

  // ── Pengeluaran ──
  const exp = (date: string, category: ExpenseCategory, description: string, amount: number) =>
    createExpense({ date, category, description, amount });
  await exp("2026-03-10", "transport", "Isi bensin", 140000);
  await exp("2026-04-15", "transport", "Isi bensin", 150000);
  await exp("2026-04-20", "alat",      "Beli ATK (spidol, kertas)", 85000);
  await exp("2026-05-05", "platform",  "Langganan AI (Claude)", 300000);
  await exp("2026-05-18", "transport", "Service mobil rutin", 750000);
  await exp("2026-06-03", "platform",  "Langganan AI (Claude)", 300000);
  await exp("2026-06-12", "transport", "Isi bensin", 145000);
  // Kategori tambahan
  await exp("2026-04-02", "buku",     "Beli buku latihan Cambridge IGCSE Economics", 210000);
  await exp("2026-05-22", "lainnya",  "Print & jilid materi", 45000);
  await exp("2026-06-08", "buku",     "Beli buku AP Calculus review", 195000);

  // ── PR / Homework (semua status) ──
  // assigned + future due
  await createHomework({ studentId: andi, subject: "Mathematics AA", title: "Latihan soal integral", instructions: "Kerjakan 10 soal di halaman 45-47.", assignedAt: "2026-06-18", dueAt: "2026-07-02", status: "assigned" });
  await createHomework({ studentId: bella, subject: "Physics", title: "Rangkum bab gelombang", instructions: "Tulis rangkuman 1 halaman A4.", assignedAt: "2026-06-11", dueAt: "2026-07-05", status: "assigned" });
  await createHomework({ studentId: eko, subject: "Economics", title: "Market failure essay", instructions: "Tulis esai 500 kata tentang eksternalitas.", assignedAt: "2026-06-05", dueAt: "2026-06-30", status: "assigned" });
  // assigned + past due → akan otomatis tampil overdue
  await createHomework({ studentId: andi, subject: "Physics", title: "Latihan Hukum Newton", instructions: "Kerjakan worksheet yang diberikan.", assignedAt: "2026-05-21", dueAt: "2026-06-10", status: "assigned" });
  await createHomework({ studentId: citra, subject: "Economics", title: "Analisis pasar monopoli", instructions: "Cari contoh perusahaan monopoli di Indonesia.", assignedAt: "2026-04-26", dueAt: "2026-05-20", status: "assigned" });
  await createHomework({ studentId: dewi, subject: "Biology", title: "Gambar siklus Krebs", instructions: "Gambar + jelaskan setiap tahap.", assignedAt: "2026-05-27", dueAt: "2026-06-15", status: "assigned" });
  // done
  await createHomework({ studentId: andi, subject: "Mathematics AA", title: "Latihan turunan", instructions: "Soal 1-20 halaman 30.", assignedAt: "2026-04-02", dueAt: "2026-04-16", status: "done", tutorFeedback: "Bagus! Hanya 1 soal salah." });
  await createHomework({ studentId: bella, subject: "Chemistry", title: "Stoikiometri worksheet", instructions: "Worksheet dari sesi.", assignedAt: "2026-04-05", dueAt: "2026-04-19", status: "done", tutorFeedback: "Lengkap dan rapi." });
  await createHomework({ studentId: fani, subject: "Calculus AB", title: "Derivative practice set", instructions: "AP-style FRQ problems.", assignedAt: "2026-06-10", dueAt: "2026-06-24", status: "done" });
  // not_done
  await createHomework({ studentId: citra, subject: "Economics", title: "Elastisitas studi kasus", instructions: "Cari data harga BBM 2025.", assignedAt: "2026-03-22", dueAt: "2026-04-05", status: "not_done", tutorFeedback: "Belum dikerjakan — perlu diulang." });
  // cancelled
  await createHomework({ studentId: dewi, subject: "Biology", title: "Presentasi sel", instructions: "Buat slide 5 halaman.", assignedAt: "2026-04-15", dueAt: "2026-04-29", status: "cancelled" });

  // ── Follow-up items (semua tipe) ──
  await createFollowUp({ studentId: andi,  type: "continue-topic", text: "Lanjutkan Bayesian inference — masih belum tuntas." });
  await createFollowUp({ studentId: bella, type: "misconception", text: "Koreksi miskonsepsi: Kc berubah hanya dengan suhu, bukan konsentrasi." });
  await createFollowUp({ studentId: citra, type: "send-resource", text: "Kirim video Khan Academy tentang market structures." });
  await createFollowUp({ studentId: dewi,  type: "check-homework", text: "Cek PR gambar siklus Krebs — deadline 15 Juni." });
  await createFollowUp({ studentId: fani,  type: "other", text: "Tanyakan progres aplikasi universitas." });
  await createFollowUp({ studentId: eko,   type: "continue-topic", text: "Lanjutkan ke price elasticity of demand." });
  await createFollowUp({ studentId: bella, type: "send-resource", text: "Kirim past paper Physics HL 2024." });

  // ── Rapor / nilai semester ──
  await upsertRaporGrade({ studentId: andi, semester: "2025/2026-S1", grades: [{ subject: "Mathematics AA", grade: "6" }, { subject: "Physics", grade: "5" }], notes: "Perlu tingkatkan Physics." });
  await upsertRaporGrade({ studentId: andi, semester: "2025/2026-S2", grades: [{ subject: "Mathematics AA", grade: "7" }, { subject: "Physics", grade: "6" }], notes: "Progress baik di Math." });
  await upsertRaporGrade({ studentId: bella, semester: "2025/2026-S1", grades: [{ subject: "Physics", grade: "5" }, { subject: "Chemistry", grade: "5" }] });
  await upsertRaporGrade({ studentId: bella, semester: "2025/2026-S2", grades: [{ subject: "Physics", grade: "5" }, { subject: "Chemistry", grade: "6" }], notes: "Chemistry mulai membaik." });
  await upsertRaporGrade({ studentId: citra, semester: "2025/2026-S1", grades: [{ subject: "Economics", grade: "6" }] });
  await upsertRaporGrade({ studentId: citra, semester: "2025/2026-S2", grades: [{ subject: "Economics", grade: "7" }], notes: "Konsisten naik." });
  await upsertRaporGrade({ studentId: dewi, semester: "2025/2026-S1", grades: [{ subject: "Biology", grade: "6" }] });
  await upsertRaporGrade({ studentId: dewi, semester: "2025/2026-S2", grades: [{ subject: "Biology", grade: "7" }], notes: "Sangat baik — pertimbangkan HL." });

  // ── IA / EE Projects (dengan milestone) ──
  await createIaEeProject({
    studentId: andi, type: "IA", subject: "Mathematics AA",
    title: "Modelling population growth with differential equations",
    deadline: "2026-09-15",
    milestones: [
      { id: crypto.randomUUID(), title: "Research question & outline", dueAt: "2026-04-01", status: "done", completedAt: "2026-03-28" },
      { id: crypto.randomUUID(), title: "Data collection", dueAt: "2026-05-15", status: "done", completedAt: "2026-05-10" },
      { id: crypto.randomUUID(), title: "First draft", dueAt: "2026-07-01", status: "in_progress" },
      { id: crypto.randomUUID(), title: "Final submission", dueAt: "2026-09-15", status: "pending" },
    ],
    notes: "Topik menarik — pastikan data dari source kredibel.",
  });
  await createIaEeProject({
    studentId: bella, type: "EE", subject: "Physics",
    title: "Investigating the efficiency of solar panels at different angles",
    deadline: "2026-10-01",
    milestones: [
      { id: crypto.randomUUID(), title: "Proposal & hypothesis", dueAt: "2026-05-01", status: "done", completedAt: "2026-04-20" },
      { id: crypto.randomUUID(), title: "Experiment design & setup", dueAt: "2026-07-01", status: "in_progress" },
      { id: crypto.randomUUID(), title: "Data analysis & final draft", dueAt: "2026-10-01", status: "pending" },
    ],
  });
  await createIaEeProject({
    studentId: dewi, type: "IA", subject: "Biology",
    title: "Effect of light intensity on photosynthesis rate in Elodea",
    deadline: "2026-09-01",
    milestones: [
      { id: crypto.randomUUID(), title: "Background research", dueAt: "2026-06-01", status: "done", completedAt: "2026-05-25" },
      { id: crypto.randomUUID(), title: "Lab experiment", dueAt: "2026-07-15", status: "in_progress" },
    ],
    notes: "Pastikan kontrol variabel suhu.",
  });

  // ── Pembayaran manual ──
  await upsertPayment({ studentId: eko, month: "2026-06", totalCost: 450000, status: "PAID", source: "manual", paidAt: "2026-06-06", method: "cash" });

  // ── Tagihan diedit sebelum kirim (April Bella didiskon dari nilai auto) ──
  await updatePaymentAmount(bella, "2026-04", 480000);

  // ── Sesi lama 2025 dengan foto (uji "Hapus foto sesi > 6 bulan" + riwayat panjang) ──
  await addRichDone(andi, ["Mathematics AA"], [
    { date: "2025-10-14", dur: 2, note: "Aljabar dasar", narrative: "Sesi fondasi aljabar — membangun dasar manipulasi persamaan.", engagement: { score: 7 }, photo: await makePhoto("Okt 2025", 205) },
    { date: "2025-11-25", dur: 2, note: "Fungsi & grafik", narrative: "Pengenalan fungsi kuadrat dan transformasi grafik.", engagement: { score: 7 }, photo: await makePhoto("Nov 2025", 195) },
  ]);
  await addRichDone(bella, ["Physics"], [
    { date: "2025-10-20", dur: 1.5, note: "Pengukuran & ketidakpastian", narrative: "Dasar IB Physics: propagasi ketidakpastian.", engagement: { score: 6 }, photo: await makePhoto("Okt 2025", 325) },
  ]);

  // ── Showcase: Andi Juni — sesi kaya (foto + tanda tangan + narasi) ──
  // Membuat Juni Andi total ~8 sesi → uji pagination laporan, galeri foto, rekap TTD.
  const andiSig = await makeSignature("Andi Pratama");
  await addRichDone(andi, ["Mathematics AA"], [
    { date: "2026-06-02", dur: 2, note: "Vektor — dot & cross product", topic: "Vectors", needsWork: "Cross product geometri 3D", predictedGrade: "6",
      narrative: "Andi cepat menangkap dot product; cross product masih perlu visualisasi 3D. Latihan terbimbing 70% benar.",
      behaviorTags: ["diligent", "exploratory"], responseTag: "correct-with-prompt",
      engagement: { prepared: true, focused: true, score: 8 }, photo: await makePhoto("Vektor", 210), signature: andiSig },
    { date: "2026-06-06", dur: 1.5, note: "Trigonometri identitas", topic: "Trig identities", predictedGrade: "6",
      narrative: "Pembuktian identitas dikerjakan rapi. Sempat keliru tanda, langsung mengoreksi sendiri.",
      behaviorTags: ["self-correcting", "confident"], responseTag: "correct-independent",
      engagement: { focused: true, quickLearner: true, score: 9 }, photo: await makePhoto("Trig", 35), signature: andiSig },
  ]);
  await addRichDone(andi, ["Physics"], [
    { date: "2026-06-13", dur: 2, note: "Dinamika — gaya gesek", topic: "Friction", needsWork: "Soal bidang miring", predictedGrade: "5",
      narrative: "Gaya gesek statis vs kinetis sudah jelas; soal bidang miring masih perlu pendampingan.",
      behaviorTags: ["cautious", "passive-responsive"], responseTag: "partial-correct",
      engagement: { needsRepetition: true, score: 6 }, signature: andiSig },
    { date: "2026-06-20", dur: 2, note: "Energi & usaha", topic: "Work-energy theorem", predictedGrade: "6",
      narrative: "Antusias mengaitkan teorema usaha-energi dengan contoh roller coaster. Bisa menjelaskan ulang.",
      behaviorTags: ["enthusiastic", "reflective"], responseTag: "can-explain-orally",
      engagement: { prepared: true, focused: true, activeAsking: true, score: 8 }, photo: await makePhoto("Energi", 150), signature: andiSig },
    { date: "2026-06-27", dur: 2, note: "Review & kuis gabungan", topic: "Mixed review", predictedGrade: "6",
      narrative: "Kuis 12 soal: 9 benar. Kelemahan tersisa di kombinasi vektor-dinamika.",
      behaviorTags: ["diligent"], responseTag: "correct-independent",
      engagement: { focused: true, score: 7 }, photo: await makePhoto("Kuis", 270), signature: andiSig },
  ]);

  // ── Seri sesi berulang (uji batch jadwal + mode batal seri 🔁) ──
  await scheduleBatch([
    { studentId: bella, date: "2026-07-07", time: "15:00", durationHours: 1.5 },
    { studentId: bella, date: "2026-07-14", time: "15:00", durationHours: 1.5 },
    { studentId: bella, date: "2026-07-21", time: "15:00", durationHours: 1.5 },
    { studentId: bella, date: "2026-07-28", time: "15:00", durationHours: 1.5 },
  ]);

  // ── Laporan ter-generate (langsung bisa dibuka & diekspor) ──
  // 1) Andi Juni — layout baru "Infografis Expert" + tema Executive.
  const andiJun = (await listSessionsByStudentMonth(andi, "2026-06")).filter((x) => x.status === "DONE");
  await upsertReport({
    id: crypto.randomUUID(), studentId: andi, month: "2026-06",
    sessionIds: andiJun.map((x) => x.id),
    templateKey: { themeId: "executive", layoutId: "infographic" },
    summaryText: "Juni jadi bulan paling produktif Andi: 8 sesi lintas Matematika AA & Fisika dengan rata-rata fokus tinggi. Kekuatan di pembuktian & koreksi diri; fokus berikutnya merapikan aplikasi vektor 3D dan soal kombinasi vektor–dinamika.",
    quote: "Teruslah penasaran, Andi — setiap koreksi kecil hari ini adalah lompatan nilai bulan depan.",
    teacherNote: "Pertumbuhan signifikan bulan ini. Bulan depan: drilling soal HL terapan + 1 mock paper.",
    totalHours: andiJun.reduce((a, x) => a + x.durationHours, 0),
    totalCost: andiJun.reduce((a, x) => a + x.cost, 0),
  });
  // 2) Bella Juni — layout klasik "Analitik" + tema Ocean (pembanding gaya).
  const bellaJun = (await listSessionsByStudentMonth(bella, "2026-06")).filter((x) => x.status === "DONE");
  await upsertReport({
    id: crypto.randomUUID(), studentId: bella, month: "2026-06",
    sessionIds: bellaJun.map((x) => x.id),
    templateKey: { themeId: "ocean", layoutId: "analytics" },
    summaryText: "Bella konsisten di Fisika & Kimia meski jadwal padat ujian sekolah. Perlu penguatan di perhitungan kesetimbangan (Kc/Kp).",
    quote: "Lelah itu wajar, Bella — yang luar biasa adalah kamu tetap maju selangkah tiap sesi.",
    totalHours: bellaJun.reduce((a, x) => a + x.durationHours, 0),
    totalCost: bellaJun.reduce((a, x) => a + x.cost, 0),
  });

  console.info("%c[seedDummy] Data dummy berhasil dimasukkan ✓", "color:#10B981;font-weight:bold");
  console.info("[seedDummy] PIN Rekap Keuangan: 123456 · Buka /report → tab Rekap Keuangan.");
  console.info("[seedDummy] Laporan siap: Andi (Jun) = Infografis Expert, Bella (Jun) = Analitik. Foto/TTD & seri 🔁 tersedia.");
}

/** Wipe the IndexedDB and reload — handy for re-seeding. */
export function clearDummy(): void {
  indexedDB.deleteDatabase("jurnalles");
  console.info("[seedDummy] DB dihapus. Reload halaman untuk seed ulang.");
  setTimeout(() => location.reload(), 300);
}
