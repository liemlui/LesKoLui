import { useCallback, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Keadaan pembaruan PWA untuk **satu halaman**, dipakai komponen mana pun.
 *
 * Kenapa berupa hook, bukan state lokal di komponen: permintaan pemilik
 * 2026-10-11 meminta tombol perbarui manual di **Pengaturan**, sedangkan tawaran
 * pembaruan hidup di banner `PwaPrompts`. `useRegisterSW` menyimpan `needRefresh`
 * di dalam komponen yang memanggilnya — dua pemanggilan di dua komponen berarti
 * dua keadaan yang tidak saling tahu, sehingga banner bisa berbunyi "siap
 * dipasang" sementara Pengaturan berbunyi "sudah versi terbaru". Hook ini
 * memusatkan keduanya pada satu registrasi service worker yang sama.
 *
 * `registerType: "prompt"` di `vite.config.ts` berarti service worker baru
 * MENUNGGU sampai {@link PwaUpdateControls.apply} dipanggil; kalau tidak pernah
 * dipanggil, tutor terjebak di versi lama.
 */
export interface PwaUpdateControls {
  /** Ada versi baru yang menunggu dipasang. */
  ready: boolean;
  /** Pemeriksaan pembaruan sedang berjalan. */
  checking: boolean;
  /** Periksa pembaruan sekarang; menolak (throw) bila registrasinya tidak ada. */
  check: () => Promise<void>;
  /** Pasang pembaruan; menolak (throw) bila service worker tidak bisa dipakai. */
  apply: () => Promise<void>;
}

export function usePwaUpdate(onPerluRefresh?: () => void): PwaUpdateControls {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const regRef = useRef<ServiceWorkerRegistration | null>(null);
  const perluRefreshRef = useRef(onPerluRefresh);
  perluRefreshRef.current = onPerluRefresh;

  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      setReady(true);
      perluRefreshRef.current?.();
    },
    onRegisteredSW(_swUrl, r) {
      if (r) regRef.current = r;
    },
  });

  /**
   * Registrasi service worker. Kalau `onRegisteredSW` belum sempat menyala,
   * tanyakan langsung ke peramban — lebih baik satu permintaan tambahan daripada
   * tombol yang mati tanpa sebab.
   */
  const registrasi = useCallback(async () => {
    if (regRef.current) return regRef.current;
    const r = await navigator.serviceWorker?.getRegistration?.();
    if (r) regRef.current = r;
    return r ?? null;
  }, []);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const r = await registrasi();
      if (!r) throw new Error("no service worker registration");
      await r.update();
      // Service worker yang baru terpasang menunggu; `onNeedRefresh` akan menyala
      // lewat pemeriksaan berkala, tetapi menyetelnya di sini membuat tombolnya
      // langsung berguna tanpa menunggu satu putaran.
      if (r.waiting && navigator.serviceWorker.controller) setReady(true);
    } finally {
      setChecking(false);
    }
  }, [registrasi]);

  const apply = useCallback(async () => {
    const detail: { flushes: Array<() => Promise<void>> } = { flushes: [] };
    // Beri kesempatan pemilik draf menyimpan lebih dulu (dipakai `useCaptureDraft`).
    window.dispatchEvent(new CustomEvent("leskolui:before-pwa-update", { detail }));
    await Promise.all(detail.flushes.map((flush) => flush()));
    await updateServiceWorker(true);
  }, [updateServiceWorker]);

  return { ready, checking, check, apply };
}
