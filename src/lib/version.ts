export const APP_VERSION = "v1.24.2";

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
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
