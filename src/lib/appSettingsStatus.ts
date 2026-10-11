/**
 * Keadaan bagian "Aplikasi" (PWA) di layar Pengaturan — G3-09 butir 10.
 *
 * Tiga hal yang dijawab modul murni ini:
 *
 * 1. **Pintu pemasangan manual beserta petunjuk iPhone.** Banner `Pasang` yang
 *    hidup di `components/PwaPrompts.tsx` hanya muncul kalau peramban menembakkan
 *    `beforeinstallprompt` (lihat `lib/pwaInstall.ts`). **iOS/Safari tidak pernah
 *    menembakkannya**, jadi sebelum G3-09 tutor iPhone tidak punya cara apa pun
 *    untuk memasang aplikasi ini — layar Pengaturan hanya menampilkan nomor versi.
 *    Petunjuk langkahnya dikembalikan sebagai data agar bisa dites tanpa DOM.
 * 2. **Status siap offline.** "Offline siap" hanya boleh dikatakan kalau service
 *    worker memang sudah mengendalikan halaman; mengatakannya berdasarkan
 *    `navigator.onLine` saja akan menyesatkan (justru saat offline itulah nilainya
 *    `false`, sehingga yang paling butuh informasi tidak mendapatkannya).
 * 3. **Penyimpanan permanen.** `persist()` dipanggil sekali di `App.tsx` dan
 *    hasilnya sering `false` sampai aplikasi dipasang (lihat catatan di sana).
 *    Keadaan itu harus bisa dilihat tutor, bukan hanya ada di konsol.
 *
 * Tanpa React, tanpa DOM, tanpa IndexedDB.
 */

import type { StatusTone } from "./settingsStatus";

/** Peramban yang petunjuk pemasangannya berbeda. */
export type InstallPlatform = "ios" | "android" | "desktop" | "unknown";

/**
 * Tebak peramban dari `userAgent`.
 *
 * iPadOS 13+ mengaku sebagai macOS, jadi iPad dikenali dari `maxTouchPoints`
 * (karena itu parameter kedua ada). Salah tebak di sini berarti tutor menerima
 * petunjuk pemasangan yang tidak ada tombolnya — lebih baik `unknown` daripada
 * petunjuk yang salah.
 */
export function detectInstallPlatform(userAgent: string, maxTouchPoints: number = 0): InstallPlatform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipod/.test(ua)) return "ios";
  if (/ipad/.test(ua)) return "ios";
  if (/macintosh/.test(ua) && maxTouchPoints > 1) return "ios";
  if (/android/.test(ua)) return "android";
  if (/\b(windows|macintosh|linux|cros)\b/.test(ua)) return "desktop";
  return "unknown";
}

export interface InstallStep {
  /** Nomor urut langkah, mulai 1. */
  no: number;
  /** Kalimat perintah; menyebut nama tombol yang benar-benar ada di peramban itu. */
  text: string;
}

export interface InstallInstructions {
  platform: InstallPlatform;
  /** Judul blok; menyebut peramban yang harus dipakai kalau itu berpengaruh. */
  title: string;
  /** Satu kalimat kenapa langkah ini perlu. */
  note: string;
  steps: InstallStep[];
  /** Aplikasi sudah berjalan sebagai aplikasi terpasang. */
  alreadyInstalled: boolean;
}

/**
 * Langkah pemasangan manual menurut peramban.
 *
 * iOS **wajib** lewat Safari: Chrome dan Firefox di iOS memakai mesin WebKit yang
 * sama tetapi tidak punya menu "Tambahkan ke Layar Utama", sehingga tutor yang
 * membuka aplikasi ini dari Chrome iPhone akan mencari menu yang tidak ada.
 */
export function installInstructions(
  platform: InstallPlatform,
  options: { alreadyInstalled?: boolean } = {},
): InstallInstructions {
  const alreadyInstalled = options.alreadyInstalled === true;
  if (alreadyInstalled) {
    return {
      platform,
      title: "Sudah terpasang",
      note: "Aplikasi ini sedang dibuka sebagai aplikasi terpasang, jadi tidak perlu dipasang lagi.",
      steps: [],
      alreadyInstalled: true,
    };
  }
  if (platform === "ios") {
    return {
      platform,
      title: "Pasang di iPhone/iPad (lewat Safari)",
      note: "Di iPhone dan iPad, pemasangan hanya bisa lewat Safari — Chrome dan Firefox tidak punya menu Tambahkan ke Layar Utama.",
      steps: [
        { no: 1, text: "Buka aplikasi ini di Safari." },
        { no: 2, text: "Ketuk tombol Bagikan (kotak dengan panah ke atas)." },
        { no: 3, text: "Gulir lalu ketuk Tambahkan ke Layar Utama." },
        { no: 4, text: "Ketuk Tambah. Ikonnya muncul di layar utama." },
      ],
      alreadyInstalled: false,
    };
  }
  if (platform === "android") {
    return {
      platform,
      title: "Pasang di Android",
      note: "Kalau tombol Pasang tidak muncul sendiri, langkah ini yang dipakai.",
      steps: [
        { no: 1, text: "Buka aplikasi ini di Chrome." },
        { no: 2, text: "Ketuk menu ⋮ di kanan atas." },
        { no: 3, text: "Ketuk Pasang aplikasi (atau Tambahkan ke Layar utama)." },
        { no: 4, text: "Ketuk Pasang. Ikonnya muncul di layar utama." },
      ],
      alreadyInstalled: false,
    };
  }
  return {
    platform,
    title: "Pasang di komputer",
    note: "Di komputer, aplikasi ini dipasang dari bilah alamat peramban.",
    steps: [
      { no: 1, text: "Buka aplikasi ini di Chrome atau Edge." },
      { no: 2, text: "Lihat ikon pasang di ujung kanan bilah alamat." },
      { no: 3, text: "Ketuk ikon itu lalu pilih Pasang." },
    ],
    alreadyInstalled: false,
  };
}

export interface OfflineStateInput {
  /** Ada service worker yang sudah aktif mengendalikan halaman ini. */
  controlled: boolean;
  onLine: boolean;
}

export interface OfflineState {
  tone: StatusTone;
  text: string;
  detail: string;
}

/**
 * Status "siap offline".
 *
 * Kalimatnya **tidak** berubah mengikuti `navigator.onLine`: keadaan itu hanya
 * dipakai untuk membedakan penjelasan, bukan untuk membalik kesimpulan. Yang
 * menentukan siap-offline adalah ada tidaknya service worker yang mengendalikan
 * halaman.
 */
export function offlineState(input: OfflineStateInput): OfflineState {
  if (!input.controlled) {
    return {
      tone: "warn" as StatusTone,
      text: "Belum siap offline",
      detail: input.onLine
        ? "Berkas aplikasi belum tersimpan untuk dipakai tanpa internet. Buka sekali lagi saat ada internet."
        : "Sedang tanpa internet dan berkas aplikasinya belum tersimpan, jadi aplikasi ini belum bisa dibuka offline.",
    };
  }
  return {
    tone: "ok" as StatusTone,
    text: "Siap offline",
    detail: input.onLine
      ? "Berkas aplikasi sudah tersimpan di perangkat, jadi aplikasi tetap bisa dibuka tanpa internet."
      : "Berkas aplikasi sudah tersimpan dan aplikasi sedang dipakai tanpa internet — itu memang cara kerjanya.",
  };
}

export interface PersistStateInput {
  /** `navigator.storage.persisted()` — penyimpanan sudah permanen. */
  persisted: boolean;
}

export interface PersistState {
  tone: StatusTone;
  text: string;
  detail: string;
}

/**
 * Status penyimpanan permanen.
 *
 * Sebelum G3-09 keadaan ini hanya hidup di `App.tsx` sebagai panggilan
 * `persist()` yang hasilnya dibuang. Kalau penyimpanan **belum** permanen, tutor
 * perlu tahu bahwa datanya bisa dibuang peramban saat ruang menipis — itu
 * informasi yang menyangkut data, bukan hiasan.
 */
export function persistState(input: PersistStateInput): PersistState {
  if (input.persisted) {
    return {
      tone: "ok",
      text: "Penyimpanan permanen",
      detail: "Peramban sudah menjanjikan data aplikasi ini tidak dibuang sendiri saat ruang penyimpanan menipis.",
    };
  }
  return {
    tone: "warn",
    text: "Penyimpanan belum permanen",
    detail: "Peramban belum menjanjikan itu. Data tetap tersimpan, tetapi bisa dibuang peramban kalau ruang penyimpanan perangkat menipis — karena itu backup berkala tetap penting.",
  };
}

/**
 * Satu baris yang menjelaskan mengapa aplikasi ini terasa "hilang" di iPhone.
 *
 * Dipakai di pintu pemasangan manual; dikembalikan sebagai data supaya teksnya
 * bisa dijaga tes (repo ini tidak memasang jsdom).
 */
export function installEntryHint(platform: InstallPlatform): string {
  if (platform === "ios") {
    return "Di iPhone, aplikasi ini tidak muncul di App Store — pemasangannya lewat Safari, dan caranya ada di bawah.";
  }
  return "Aplikasi ini tidak perlu diunduh dari toko aplikasi — pemasangannya langsung dari peramban.";
}
