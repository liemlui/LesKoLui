import { useEffect, useState } from "react";
import { Section } from "./Section";
import StorageUsage from "./StorageUsage";
import PwaUpdateUi from "../../components/PwaUpdateUi";
import { APP_VERSION, CHANGELOG } from "../../lib/version";
import {
  detectInstallPlatform, installEntryHint, installInstructions, offlineState, persistState,
} from "../../lib/appSettingsStatus";
import { PhoneIcon, TrashIcon } from "../../components/icons";
import { usePwaUpdate } from "../../hooks/usePwaUpdate";
import { STANDALONE_MEDIA_QUERIES, isStandaloneLaunch } from "../../lib/pwaInstall";

/**
 * Bagian "Aplikasi" di layar Pengaturan — G3-09 butir 10.
 *
 * Isinya empat hal yang semuanya menyangkut "apakah aplikasi ini sehat", bukan
 * pengaturan data tutor:
 *
 * 1. **Pemakaian penyimpanan** (`StorageUsage`) — satu-satunya tempat bilah
 *    penuhnya dirender; ringkasan status di atas judul memakai angka yang sama.
 * 2. **Pembaruan aplikasi** — periksa dan pasang secara manual, memakai hook yang
 *    sama dengan banner (`usePwaUpdate`), sehingga jalur ini tetap ada setelah
 *    tutor menutup tawaran pembaruan.
 * 3. **Catatan perubahan** — apa yang berubah di versi yang sedang dipakai,
 *    bisa dibuka kapan saja (bukan hanya sekali saat versi baru terpasang).
 * 4. **Keluar aplikasi** dan **bersihkan cache** — dua tombol yang dipindahkan
 *    ke sini karena keduanya menyangkut aplikasinya, bukan datanya.
 *
 * Dua status yang mudah salah dan sengaja dibedakan:
 * - **penyimpanan permanen** dari `navigator.storage.persisted()`. Kalau belum
 *   permanen, tutor perlu tahu datanya bisa dibuang peramban saat ruang menipis —
 *   itu menyangkut data, bukan hiasan.
 * - **siap offline** disimpulkan dari ada tidaknya service worker yang
 *   MENGENDALIKAN halaman, **bukan** dari `navigator.onLine`. Yang terakhir justru
 *   bernilai false saat offline, sehingga menyesatkan orang yang paling butuh
 *   informasi ini.
 */
export interface AppSectionProps {
  onKeluar: () => void;
  onBersihkanCache: () => void;
}

export default function AppSection({ onKeluar, onBersihkanCache }: AppSectionProps) {
  const pembaruan = usePwaUpdate();

  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [swMengontrol, setSwMengontrol] = useState<boolean | null>(null);
  const [onLine, setOnLine] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  /** Catatan perubahan dibuka manual; daftarnya dari `CHANGELOG`. */
  const [riwayatTerbuka, setRiwayatTerbuka] = useState(false);

  useEffect(() => {
    let hidup = true;
    void navigator.storage?.persisted?.()
      .then((v) => { if (hidup) setPersisted(v); })
      .catch(() => { if (hidup) setPersisted(false); });

    if ("serviceWorker" in navigator) {
      const syncSw = () => { if (hidup) setSwMengontrol(Boolean(navigator.serviceWorker.controller)); };
      const syncOnline = () => { if (hidup) setOnLine(navigator.onLine); };
      syncSw();
      navigator.serviceWorker.addEventListener("controllerchange", syncSw);
      window.addEventListener("online", syncOnline);
      window.addEventListener("offline", syncOnline);
      return () => {
        hidup = false;
        navigator.serviceWorker.removeEventListener("controllerchange", syncSw);
        window.removeEventListener("online", syncOnline);
        window.removeEventListener("offline", syncOnline);
      };
    }
    return () => { hidup = false; };
  }, []);

  /** `null` = belum terbaca; jangan mengklaim apa pun sebelum peramban menjawab. */
  const statusPenyimpanan = persisted === null
    ? { tone: "info" as const, text: "Memeriksa...", detail: "Menanyakan ke peramban apakah data aplikasi ini dijanjikan tidak dibuang sendiri." }
    : persistState({ persisted });
  const statusOffline = swMengontrol === null
    ? { tone: "info" as const, text: "Belum diketahui", detail: "Status siap offline diperiksa setelah halaman selesai dimuat." }
    : offlineState({ controlled: swMengontrol, onLine });

  const entriSekarang = CHANGELOG.find((c) => c.version === APP_VERSION);

  /**
   * Petunjuk pemasangan menurut peramban (G3-09 butir 10).
   *
   * `maxTouchPoints > 1` diteruskan karena iPadOS 13+ mengaku sebagai macOS —
   * tanpa itu, iPad mendapat petunjuk komputer yang tidak punya ikon pasang di
   * bilah alamat.
   */
  const platformPasang = typeof navigator === "undefined"
    ? "unknown"
    : detectInstallPlatform(navigator.userAgent, navigator.maxTouchPoints ?? 0);
  /**
   * Apakah aplikasi sedang dibuka sebagai aplikasi terpasang.
   *
   * Dipakai `lib/pwaInstall.ts` (media query yang sama dengan banner), bukan
   * tebakan dari `navigator.standalone` saja — iOS memakai penanda itu, Android
   * memakai mode tampilan. Kalau sudah terpasang, petunjuk langkahnya tidak
   * ditampilkan lagi: menyuruh orang memasang aplikasi yang sudah terpasang
   * membuatnya meragukan apakah pemasangannya berhasil.
   */
  const terpasang = typeof window === "undefined"
    ? false
    : isStandaloneLaunch(
      STANDALONE_MEDIA_QUERIES.map((q) => window.matchMedia(q).matches),
      (navigator as Navigator & { standalone?: boolean }).standalone,
    );
  const petunjuk = installInstructions(platformPasang, { alreadyInstalled: terpasang });

  return (
    <Section id="aplikasi" title="Aplikasi" icon={<PhoneIcon size={18} />}>
      <div className="pt-3 space-y-3">
        <StorageUsage />

        {/* Pembaruan manual (G3-09 butir 10): satu hook dengan banner. */}
        <PwaUpdateUi
          variant="panel"
          ready={pembaruan.ready}
          checking={pembaruan.checking}
          onCheck={pembaruan.check}
          onApply={pembaruan.apply}
        />

        <div className="bg-[var(--surface)] rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--ink-muted)]">Versi</span>
            <span className="font-semibold text-[var(--ink-strong)]">{APP_VERSION}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--ink-muted)]">Penyimpanan permanen</span>
            <span className={statusPenyimpanan.tone === "ok" ? "text-[var(--ink-muted)]" : "text-[var(--ink-warn)]"}>
              {statusPenyimpanan.text}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--ink-muted)]">Siap offline</span>
            <span className={statusOffline.tone === "ok" ? "text-[var(--ink-muted)]" : "text-[var(--ink-warn)]"}>
              {statusOffline.text}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--ink-muted)]">Mode</span>
            <span className="text-[var(--ink-muted)]">{import.meta.env.DEV ? "Development" : "Production"}</span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{statusPenyimpanan.detail}</p>
        <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{statusOffline.detail}</p>

        {/* G3-09 butir 10: pintu PEMASANGAN MANUAL beserta petunjuk per peramban.
            Ini yang menutup celah iPhone — banner "Pasang" di `PwaPrompts.tsx`
            tidak pernah muncul di iOS karena Safari tidak menembakkan
            `beforeinstallprompt`, sehingga sebelum ini tutor iPhone tidak punya
            cara apa pun memasang aplikasinya. */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
          <p className="text-sm font-semibold text-[var(--ink-strong)]">{petunjuk.title}</p>
          <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{petunjuk.note}</p>
          {petunjuk.steps.length > 0 && (
            <>
              <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{installEntryHint(platformPasang)}</p>
              <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[var(--ink-strong)]">
                {petunjuk.steps.map((s) => <li key={s.no}>{s.text}</li>)}
              </ol>
            </>
          )}
        </div>

        {/* G3-09 butir 10: catatan perubahan beserta nomor versinya. Sebelumnya
            catatan hanya muncul sekali otomatis saat versi baru terpasang, dan
            setelah ditutup tidak ada cara membukanya lagi. */}
        <button
          type="button"
          onClick={() => setRiwayatTerbuka((v) => !v)}
          aria-expanded={riwayatTerbuka}
          className="w-full min-h-[44px] py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-strong)] text-sm font-semibold"
        >
          {riwayatTerbuka ? "Sembunyikan catatan perubahan" : `Catatan perubahan ${APP_VERSION}`}
        </button>
        {riwayatTerbuka && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2" role="region" aria-label={`Catatan perubahan ${APP_VERSION}`}>
            {entriSekarang ? (
              <>
                <p className="text-sm font-semibold text-[var(--ink-strong)]">{entriSekarang.title}</p>
                <p className="text-xs text-[var(--ink-muted)]">Versi {entriSekarang.version} · {entriSekarang.date}</p>
                <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-[var(--ink-muted)]">
                  {entriSekarang.items.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </>
            ) : (
              <p className="text-xs text-[var(--ink-muted)]">
                Belum ada catatan perubahan untuk versi ini. Daftar lengkapnya ada di berkas riwayat rilis.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onKeluar}
          className="w-full min-h-[44px] py-2.5 rounded-xl bg-[var(--bg-danger)] text-[var(--ink-danger)] text-sm font-semibold"
        >
          Keluar Aplikasi
        </button>

        <button
          type="button"
          onClick={onBersihkanCache}
          className="w-full min-h-[44px] py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-strong)] text-sm font-semibold"
        >
          <TrashIcon size={13} className="mr-1 inline align-[-2px]" /> Bersihkan Cache (butuh internet setelahnya)
        </button>
      </div>
    </Section>
  );
}
