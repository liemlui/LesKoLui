export const APP_VERSION = "v1.27.1";

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "v1.27.1",
    date: "2026-07-19",
    title: "Keuangan Dipindahkan dari Dashboard + Sort Kalender Bulanan",
    items: [
      "Pendapatan harian & mingguan dipindahkan dari dashboard ke tab Ringkasan halaman Keuangan (💰) — semua info uang kini di satu tempat",
      "Tombol 💸 Catat di dashboard header — pencatatan pengeluaran cepat tanpa harus masuk PIN Keuangan",
      "Kalender bulanan kini mengurutkan sesi berdasarkan jam (paling awal di atas) — konsisten dengan tampilan mingguan & harian",
      "Backup/restore kini tervalidasi penuh, memakai snapshot konsisten, dan tetap kompatibel dengan file backup lama",
      "Kata sandi backup disembunyikan secara default; verifikasi backup Drive memeriksa struktur data secara penuh",
    ],
  },
  {
    version: "v1.27.0",
    date: "2026-07-17",
    title: "UI Overhaul — Dashboard, Analitik & Navigasi Baru",
    items: [
      "Dashboard Home baru: gauge sesi, bar chart mingguan, progress bar, & glance pendapatan harian/mingguan",
      "Inbox Perlu Perhatian kini tabbed (Sesi | PR Telat | PR Segera | Follow-up) dengan badge count",
      "Halaman Analitik baru (📊) — 3 tab: Keuangan (grafik batang, tren, donat pengeluaran, forecast), Murid (kontribusi pendapatan, engagement), Operasional (gauge, no-show rate, PR completion)",
      "Breadcrumb otomatis di semua halaman dalam (Murid, Catat Sesi, Tugas, Laporan, Keuangan)",
      "Detail Murid kini pakai tab (Ringkasan | Sesi & Jadwal | Nilai | IA/EE)",
      "RatingIndicator visual (dot/star/bar) menggantikan angka mentah engagement",
      "Skeleton loader shimmer — pengganti teks 'Memuat...' di semua halaman",
      "12 komponen UI baru murni SVG/Tailwind: BarChart, LineChart, DonutChart, Gauge, ProgressBar, RatingIndicator, Badge, Popover, Breadcrumb, Tabs, Skeleton — tanpa dependensi tambahan",
    ],
  },
  {
    version: "v1.26.2",
    date: "2026-07-11",
    title: "Patch — Review Visual 26 Layout Laporan",
    items: [
      "Semua 26 layout dirender dengan data bulan penuh & diperiksa visual satu per satu",
      "Grid 2× kembali 4 sesi/halaman (6 membuat halaman terlalu panjang — 3 baris foto)",
      "Rapor Style 10/hal, Compact 8/hal, Jurnal 6/hal terverifikasi nyaman dibaca",
      "Seed data dev: seedDummy(true) kini membersihkan data lama (tidak menduplikasi murid)",
      "Tool review layout baru: e2e/layout-review.spec.ts — screenshot semua layout sekali jalan",
    ],
  },
  {
    version: "v1.26.1",
    date: "2026-07-10",
    title: "Patch — Audit UI/UX Menyeluruh",
    items: [
      "Banner backup mingguan pindah ke bawah — tidak lagi menutupi judul halaman & form (di Laporan sempat menutup pilihan murid/bulan)",
      "Banner tidak lagi menghalangi tombol modal (update modal, konfirmasi, dll.)",
      "Grafik Engagement di Detail Murid kini benar-benar tampil (bar sempat 0px — tak terlihat)",
      "Riwayat Sesi default 'Semua bulan' — sebelumnya tampak kosong padahal ada sesi (filter diam-diam terkunci di bulan berjalan)",
      "Empty state Riwayat Sesi kontekstual: 'Tidak ada sesi di [bulan]' + tombol Tampilkan Semua",
      "Screenshot katalog laporan kini berisi data (sebelumnya kosong — bahan iklan Instagram)",
    ],
  },
  {
    version: "v1.26.0",
    date: "2026-07-10",
    title: "Laporan Kronologis + Halaman Lebih Padat",
    items: [
      "Urutan sesi di laporan kini KRONOLOGIS (awal→akhir bulan) — orang tua membaca sebagai cerita perkembangan",
      "Semua grafik tren (Sparkline Fokus, Pertumbuhan, Perbandingan) otomatis searah waktu",
      "Paginasi cerdas per layout: Rapor Style 10 sesi/halaman, Compact/Minimalis/Bullet/Checklist 8, layout foto besar tetap 4",
      "Laporan bulan padat kini butuh lebih sedikit halaman saat dikirim via WA",
    ],
  },
  {
    version: "v1.25.0",
    date: "2026-07-10",
    title: "Narasi AI + Export Lebih Setia Desain",
    items: [
      "BARU: tombol 📖 Narasi AI — tulis narasi 40–60 kata untuk SEMUA sesi sekaligus dari shortNote, plus ringkasan, catatan guru & kutipan (bisa di-Undo penuh)",
      "Poles AI dinamai ulang jadi ✨ Ringkasan AI (ringkasan + kutipan saja, lebih murah)",
      "Export JPG/PNG/PDF kini membawa font tema (Pacifico, Caveat, dll.) — sebelumnya jatuh ke font default",
      "Label laporan otomatis pakai teks gelap di warna palet terang (Neon/Retro kini terbaca)",
      "Foto gaya 'vintage' kini benar-benar ber-efek sepia (CSS-nya sempat invalid)",
      "Layout Per Mapel: 'avg 0/10' disembunyikan bila sesi tak punya skor engagement",
      "E2E test baru: buat laporan → export JPG diverifikasi menghasilkan file",
    ],
  },
  {
    version: "v1.24.2",
    date: "2026-07-10",
    title: "Patch — Perbaikan Laporan Bulanan",
    items: [
      "Layout 'Per Minggu': grup mingguan tidak lagi tampil 'Minggu NaN'",
      "Layout 'Jurnal': angka besar kini nomor tanggal, bukan tahun",
      "Layout 'Perbandingan': arah tren Awal vs Akhir bulan dikoreksi (sempat terbalik)",
      "Grafik 'Tren Fokus' & 'Pertumbuhan': sumbu waktu kini kronologis kiri→kanan",
      "KPI Dashboard/Ringkasan/Analitik: pakai total sebulan penuh, bukan per halaman",
      "Kolom tanggal di Rapor Style/Snapshot: '5 Juni', bukan '2026'",
      "Mode Bandingkan: tema kustom kini ter-render benar",
      "Teks fallback narasi dinetralkan (tidak ada lagi instruksi tutor di laporan ortu)",
    ],
  },
  {
    version: "v1.24.1",
    date: "2026-07-16",
    title: "Patch — Bug Fixes & Polish",
    items: [
      "Update modal — tampil saat versi baru, lengkap dengan changelog per rilis",
      "Perbaikan label jadwal seri: \"Di hari yang sama setiap minggu\"",
      "Fix form edit jadwal dari Calendar agar tidak ter-reset saat buka",
      "JPG export sekarang per halaman (tidak digabung jadi 1 gambar panjang)",
      "AI narasi laporan: prompt diperkuat dengan contoh spesifik",
      "Teks billing WA: tanpa heading 'Pembayaran' atau 'Transfer ke'",
      "Font size tombol calendar diperbesar biar legible di HP",
      "Perbaikan urutan sesi di laporan (terbaru di atas)",
    ],
  },
  {
    version: "v1.24.0",
    date: "2026-07-16",
    title: "AI Lebih Pintar + Foto & Laporan Lebih Rapi",
    items: [
      "AI prompt diperkuat — narasi tetap jaga fakta shortNote, tidak menghapus isi catatan tutor",
      "AI analisis siswa lebih tajam — rekomendasi fokus sesi berikutnya lebih spesifik",
      "AI saran PR lebih konkret — langsung bisa dikerjakan, bukan cuma judul topik",
      "AI draft catatan sesi lebih terstruktur — ada contoh output di prompt",
      "AI pengingat bayaran lebih sopan — nada ringan, tidak seperti nagih",
      "Kompresi foto lebih kecil — 640px, kualitas optimal untuk tampil di laporan",
      "Export JPG per halaman — tidak lagi digabung jadi satu gambar panjang",
      "Laporan urut dari sesi terbaru ke terlama",
      "Galeri: bisa pilih foto dari gallery HP selain kamera langsung",
      "Bank account default: BCA, CIMB, BRI otomatis terisi",
      "Tagihan WA: tanpa kata 'Transfer ke' atau 'Pembayaran', lebih ringan",
      "Tanggal sesi: tidak ada lagi batas 14 hari ke belakang",
      "Tampilan laporan: perbaikan overlap konten antar halaman",
    ],
  },
];
