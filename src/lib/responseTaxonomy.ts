// Student response taxonomy — from curriculum research data
// Used in CaptureSession for tagging behavioral observations & academic response quality

export interface BehaviorTag {
  id: string;
  icon: string;
  label: string;
  valence: "positive" | "neutral" | "negative";
  description: string; // what this behavior looks like
  prompt: string;      // suggested tutor response/intervention
}

export interface ResponseTag {
  id: string;
  icon: string;
  label: string;
  description: string; // definition for the teacher
  teacherNote: string; // implication / next action
}

// ── Affective & Behavioral Tags ──────────────────────────────────────────────
// These supplement (not replace) the engagement score flags.
// Multi-select, saved as session.behaviorTags[]

export const BEHAVIOR_TAGS: BehaviorTag[] = [
  // ── Positif ──────────────────────────────────────────────────────────────
  {
    id: "enthusiastic",
    icon: "🌟",
    label: "Antusias",
    valence: "positive",
    description: "Energi tinggi, tertarik, dan ingin mencoba hal baru tanpa diminta.",
    prompt: "Bagian mana yang paling membuatmu penasaran? Mari naikkan tingkat kesulitannya sedikit.",
  },
  {
    id: "diligent",
    icon: "📝",
    label: "Tekun",
    valence: "positive",
    description: "Sabar menyelesaikan langkah demi langkah, tidak menyerah di tengah jalan.",
    prompt: "Kerjamu rapi sekali. Sekarang kita cek apakah ada cara yang lebih efisien.",
  },
  {
    id: "self-correcting",
    icon: "🔍",
    label: "Self-check",
    valence: "positive",
    description: "Menemukan dan memperbaiki kesalahannya sendiri sebelum dikoreksi guru.",
    prompt: "Bagaimana kamu tahu langkah itu salah? Simpan strategi cek itu untuk ujian nanti.",
  },
  {
    id: "confident",
    icon: "💪",
    label: "Percaya diri",
    valence: "positive",
    description: "Berani menjawab dan mengambil risiko akademik walau belum 100% yakin.",
    prompt: "Bagus! Sekarang buktikan mengapa — bukan hanya apa jawabannya.",
  },
  {
    id: "reflective",
    icon: "🪞",
    label: "Reflektif",
    valence: "positive",
    description: "Mampu menilai kelemahan diri sendiri dan area yang perlu diperkuat.",
    prompt: "Kalau topik ini keluar lagi minggu depan, bagian mana yang menurutmu perlu diulang?",
  },
  {
    id: "collaborative",
    icon: "🤝",
    label: "Dialog aktif",
    valence: "positive",
    description: "Terbuka terhadap diskusi, mau berpikir bersama dan mempertimbangkan pendekatan lain.",
    prompt: "Ayo bandingkan dua pendekatan ini bersama. Mana yang menurutmu lebih efisien dan kenapa?",
  },

  // ── Netral ───────────────────────────────────────────────────────────────
  {
    id: "calm",
    icon: "🧘",
    label: "Tenang",
    valence: "neutral",
    description: "Tenang dan stabil secara emosi, tapi belum tentu aktif berpartisipasi.",
    prompt: "Sebelum lanjut ke soal berikutnya, coba rangkum inti konsep tadi dalam satu kalimat.",
  },
  {
    id: "slow-processing",
    icon: "⏳",
    label: "Proses lambat",
    valence: "neutral",
    description: "Butuh waktu lebih lama dari biasanya untuk memproses dan merespons informasi baru.",
    prompt: "Ambil 30 detik. Lingkari informasi penting di soal dulu sebelum mulai jawab.",
  },
  {
    id: "cautious",
    icon: "🤔",
    label: "Terlalu hati-hati",
    valence: "neutral",
    description: "Sangat berhati-hati dan enggan memberikan jawaban karena takut salah.",
    prompt: "Tidak apa-apa salah — berikan tebakan terbaikmu dulu, kita lihat sama-sama nanti.",
  },
  {
    id: "passive-responsive",
    icon: "💬",
    label: "Pasif-responsif",
    valence: "neutral",
    description: "Jarang berinisiatif sendiri tapi mau menjawab ketika dipancing atau ditanya.",
    prompt: "Coba kamu yang pilih soal berikutnya — nomor atau topik mana yang mau dicoba?",
  },
  {
    id: "exploratory",
    icon: "🔭",
    label: "Eksploratif",
    valence: "neutral",
    description: "Sedang mencoba pola atau strategi baru, meski belum tentu mengarah ke jawaban tepat.",
    prompt: "Jelaskan kenapa kamu memilih strategi itu. Apa yang sedang kamu pikirkan?",
  },

  // ── Negatif ──────────────────────────────────────────────────────────────
  {
    id: "frustrated",
    icon: "😤",
    label: "Frustrasi",
    valence: "negative",
    description: "Menunjukkan tanda jenuh atau emosi naik karena berulang kali menemui hambatan.",
    prompt: "Mari pecah jadi dua langkah lebih kecil. Bagian mana yang paling terasa macet?",
  },
  {
    id: "anxious",
    icon: "😰",
    label: "Cemas",
    valence: "negative",
    description: "Tegang atau takut salah, terutama menjelang penilaian atau ketika dipanggil menjawab.",
    prompt: "Kita lakukan low-stakes attempt dulu — ini latihan, belum dinilai, bebas salah.",
  },
  {
    id: "avoidant",
    icon: "👀",
    label: "Menghindar",
    valence: "negative",
    description: "Cenderung menunda, diam, atau mengalihkan topik untuk menghindari kesulitan.",
    prompt: "Pilih salah satu: saya contohkan satu soal, atau kamu mulai langkah pertama sendiri?",
  },
  {
    id: "rushed",
    icon: "💨",
    label: "Terburu-buru",
    valence: "negative",
    description: "Ingin cepat selesai, sering membuat careless error karena tidak membaca soal teliti.",
    prompt: "Berhenti 20 detik. Tandai dulu: data apa yang diberikan, operasi apa, satuan apa.",
  },
  {
    id: "low-confidence",
    icon: "🌧️",
    label: "Kurang PD",
    valence: "negative",
    description: "Merasa tidak mampu padahal sebenarnya sudah punya modal konsep yang cukup.",
    prompt: "Tunjukkan bagian yang paling kamu yakin dulu. Kita bangun dari fondasi yang sudah ada.",
  },
];

// ── Academic Response Quality Tags ───────────────────────────────────────────
// Single-select, saved as session.responseTag
// Describes how the student responded academically this session overall

export const RESPONSE_TAGS: ResponseTag[] = [
  {
    id: "correct-independent",
    icon: "⭐",
    label: "Benar mandiri",
    description: "Jawaban benar tanpa bantuan atau petunjuk berarti dari guru.",
    teacherNote: "Siap naik ke soal aplikasi atau transfer ke konteks baru.",
  },
  {
    id: "correct-with-prompt",
    icon: "✅",
    label: "Benar + petunjuk",
    description: "Mampu menjawab benar setelah diberi petunjuk kecil atau scaffolding dari guru.",
    teacherNote: "Konsep ada tapi retrieval belum stabil — perlu latihan mandiri lebih banyak.",
  },
  {
    id: "partial-correct",
    icon: "🟡",
    label: "Sebagian benar",
    description: "Sebagian struktur jawaban benar, tapi masih ada langkah atau konsep yang hilang.",
    teacherNote: "Cocok untuk targeted reteach — tentukan bagian spesifik yang perlu diisi.",
  },
  {
    id: "misconception",
    icon: "🔴",
    label: "Miskonsepsi",
    description: "Jawaban salah yang berasal dari model mental keliru, bukan sekadar tidak tahu.",
    teacherNote: "Perlu koreksi konsep aktif, bukan hanya menambah latihan soal.",
  },
  {
    id: "guessing",
    icon: "🎲",
    label: "Menebak",
    description: "Jawaban diberikan tanpa alasan atau justifikasi yang bisa diandalkan.",
    teacherNote: "Minta siswa jelaskan setiap langkah — buat proses berpikir terlihat.",
  },
  {
    id: "can-explain-orally",
    icon: "🗣️",
    label: "Paham lisan",
    description: "Bisa menjelaskan konsep secara lisan dengan baik, tapi lemah saat menulis atau soal tertulis.",
    teacherNote: "Butuh response frame tertulis — berikan template struktur jawaban.",
  },
  {
    id: "can-do-procedurally",
    icon: "🔧",
    label: "Hafal prosedur",
    description: "Bisa mengikuti algoritma/langkah-langkah, tapi belum paham konsep di baliknya.",
    teacherNote: "Tambahkan why-question setelah setiap langkah dan visualisasi konsep.",
  },
  {
    id: "transfer-attempt",
    icon: "🚀",
    label: "Coba transfer",
    description: "Berusaha menerapkan konsep yang baru dipelajari ke konteks atau soal yang berbeda.",
    teacherNote: "Sinyal pemahaman mendalam! Dukung dan perkuat dengan soal transfer lebih lanjut.",
  },
  {
    id: "prerequisite-gap",
    icon: "⛔",
    label: "Gap prasyarat",
    description: "Hambatan utama bukan di topik sekarang, tapi di konsep prasyarat yang belum dikuasai.",
    teacherNote: "Jadwalkan sesi backfill untuk prasyarat — lanjut topik ini setelah gap diisi.",
  },
  {
    id: "metacognitive",
    icon: "🧠",
    label: "Sadar strategi",
    description: "Siswa menunjukkan kesadaran terhadap cara berpikirnya sendiri dan kekurangannya.",
    teacherNote: "Catat dan gunakan untuk merekomendasikan strategi review yang lebih personal.",
  },
];

// Helper: get full tag object by id
export function getBehaviorTag(id: string): BehaviorTag | undefined {
  return BEHAVIOR_TAGS.find(t => t.id === id);
}

export function getResponseTag(id: string): ResponseTag | undefined {
  return RESPONSE_TAGS.find(t => t.id === id);
}
