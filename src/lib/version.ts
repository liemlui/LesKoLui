export const APP_VERSION = "v1.24.0";

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
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
