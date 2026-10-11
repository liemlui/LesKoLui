/**
 * Bilah desain laporan: tema, susunan, sampul, dan perancang tema kustom.
 *
 * Dipisah dari MonthlyReport.tsx (refactor terbatas G3-05).
 *
 * G3-08 menyentuh berkas ini di dua tempat:
 *
 * 1. **Judul kartu dipisah.** Sebelumnya satu baris mencampur nama tema dan nama
 *    susunan ("🎨 Tema: Winter Blue · Kartu"), sehingga tutor tidak tahu mana yang
 *    sedang diubah. Sekarang ada chip **Tema** dan chip **Susunan**, masing-masing
 *    dengan ikon dan keadaan buka sendiri — dan isinya pun tidak bisa tertukar.
 * 2. **Beban pilihan dikurangi.** Susunan dikelompokkan menurut panjang narasi
 *    yang didukung, dan dua puluh enam tombol pratinjau kecil diganti **satu**
 *    tombol pratinjau untuk susunan terpilih. Fungsinya tidak hilang: tiap
 *    susunan masih bisa dilihat contohnya, tetapi satu per satu.
 *
 * Pratinjau memakai `Modal` yang sudah ada, jadi **Escape**, penguncian fokus, dan
 * pemulihan fokus bekerja.
 */

import { useState } from "react";
import { LAYOUTS } from "../../template/layouts";
import { ReportRenderer } from "../../template/ReportRenderer";
import { SAMPLE_REPORT_DATA } from "../../template/sampleData";
import Modal from "../../components/Modal";
import { ChecklistIcon, EyeIcon, SparkleIcon } from "../../components/icons";
import type { CustomTheme, Layout, Theme } from "../../template/types";
import type { MonthlyReport } from "../../db/types";
import { CustomThemeBuilder } from "./CustomThemeBuilder";
import ScaledPreview from "./ScaledPreview";
import ThemeGallery from "./ThemeGallery";
import { kelompokkanSusunan, ringkasSusunan, type KelompokSusunan } from "./susunanLaporan";

interface DesignToolbarProps {
  report: MonthlyReport;
  themes: readonly Theme[];
  open: boolean;
  onToggleOpen: (open: boolean) => void;
  showThemeList: boolean;
  onToggleThemeList: () => void;
  showLayoutList: boolean;
  onToggleLayoutList: () => void;
  showCustomBuilder: boolean;
  onToggleCustomBuilder: () => void;
  coverPage: boolean;
  onToggleCover: () => void;
  onRandomize: () => void;
  undoCount: number;
  onUndoDesign: () => void;
  onSelectTheme: (themeId: string) => void;
  onSelectLayout: (layoutId: string) => void;
  /** Tema yang sedang dipakai — dipakai pratinjau susunan. */
  activeTheme: Theme;
  onSaveCustomTheme: (theme: CustomTheme) => void;
}

/** Gaya chip yang dipakai bersama oleh Tema dan Susunan. */
function chipClass(aktif: boolean): string {
  return `inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-colors ${
    aktif
      ? "border-[var(--border-brand)] bg-[var(--brand-tint)] text-[var(--ink-brand)]"
      : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]"
  }`;
}

export default function DesignToolbar({
  report, themes, open, onToggleOpen,
  showThemeList, onToggleThemeList, showLayoutList, onToggleLayoutList,
  showCustomBuilder, onToggleCustomBuilder, coverPage, onToggleCover,
  onRandomize, undoCount, onUndoDesign, onSelectTheme, onSelectLayout,
  activeTheme, onSaveCustomTheme,
}: DesignToolbarProps) {
  const layouts: Layout[] = LAYOUTS;
  const activeThemeName = themes.find((t) => t.id === report.templateKey.themeId)?.name ?? "—";
  const activeLayout = layouts.find((l) => l.id === report.templateKey.layoutId);
  const activeLayoutName = activeLayout?.name ?? "—";
  const kelompok: KelompokSusunan[] = kelompokkanSusunan(layouts);

  // Satu tombol pratinjau untuk susunan terpilih (`report.templateKey.layoutId`).
  // G3-08 meminta dua puluh enam tombol pratinjau kecil diganti satu tombol;
  // pratinjau selalu menampilkan susunan yang SEDANG dipakai, bukan pilihan lain.
  const [pratinjauTerbuka, setPratinjauTerbuka] = useState(false);
  const layoutPratinjau = activeLayout;

  const bukaPratinjau = () => setPratinjauTerbuka(true);

  return (
    <>
      <details
        className="group space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-sm"
        open={open}
        onToggle={(e) => onToggleOpen(e.currentTarget.open)}
      >
        <summary className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-1">
          <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-semibold text-[var(--ink-strong)]">
            <span className="inline-flex items-center gap-1">
              <SparkleIcon size={14} aria-hidden="true" />
              Tema: {activeThemeName}
            </span>
            <span aria-hidden="true" className="text-[var(--ink-muted)]">·</span>
            <span className="inline-flex items-center gap-1">
              <ChecklistIcon size={14} aria-hidden="true" />
              Susunan: {activeLayoutName}
            </span>
          </span>
          <span className="text-xs font-semibold text-[var(--ink-brand)] group-open:hidden">Ubah tampilan laporan ▸</span>
          <span className="hidden text-xs font-semibold text-[var(--ink-muted)] group-open:inline">▾</span>
        </summary>

        {/* Baris 1: Acak + chip Tema + chip Susunan + Undo */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn btn-secondary min-h-[44px] flex-shrink-0 whitespace-nowrap px-2 py-1.5 text-sm"
            onClick={onRandomize}
            title="Pilih tema dan susunan secara acak"
          >
            Acak
          </button>
          <button
            className={chipClass(showThemeList)}
            onClick={onToggleThemeList}
            aria-expanded={showThemeList}
            aria-controls="panel-tema-laporan"
          >
            <SparkleIcon size={14} aria-hidden="true" />
            Tema
          </button>
          <button
            className={chipClass(showLayoutList)}
            onClick={onToggleLayoutList}
            aria-expanded={showLayoutList}
            aria-controls="panel-susunan-laporan"
          >
            <ChecklistIcon size={14} aria-hidden="true" />
            Susunan
          </button>
          <button
            className={chipClass(coverPage)}
            onClick={onToggleCover}
            aria-pressed={coverPage}
            title="Tambah halaman sampul di depan laporan"
          >
            {coverPage ? "Sampul ✓" : "Sampul"}
          </button>
          <button className={chipClass(showCustomBuilder)} onClick={onToggleCustomBuilder} aria-expanded={showCustomBuilder}>
            {showCustomBuilder ? "Tutup perancang" : "Tema kustom"}
          </button>
          {undoCount > 0 && (
            <button className="btn btn-secondary min-h-[44px] flex-shrink-0 px-2 py-1.5 text-sm" onClick={onUndoDesign}>
              ↩ Urungkan
            </button>
          )}
        </div>

        {/* ── Tema ─────────────────────────────────────────────────────────── */}
        {showThemeList && (
          <section id="panel-tema-laporan" aria-label="Tema laporan" className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">Tema</h3>
            <ThemeGallery
              themes={themes}
              activeId={report.templateKey.themeId}
              activeName={activeThemeName}
              onSelect={onSelectTheme}
            />
          </section>
        )}

        {/* ── Susunan ──────────────────────────────────────────────────────── */}
        {showLayoutList && (
          <section id="panel-susunan-laporan" aria-label="Susunan halaman laporan" className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">Susunan</h3>
            {/* G3-08: dua puluh enam tombol pratinjau kecil diganti satu tombol
                untuk susunan terpilih. */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary min-h-[44px] px-2.5 py-1.5 text-sm"
                onClick={bukaPratinjau}
              >
                <EyeIcon size={14} className="mr-1 inline align-[-2px]" />
                Pratinjau susunan terpilih
              </button>
              {activeLayout && (
                <span className="text-xs text-[var(--ink-muted)]">
                  {activeLayout.name} · {ringkasSusunan(activeLayout) || "tanpa keterangan tambahan"}
                </span>
              )}
            </div>

            {kelompok.map((grup) => (
              <div key={grup.key} className="space-y-1.5">
                <p className="text-xs font-semibold text-[var(--ink-strong)]">
                  {grup.judul} <span className="font-normal text-[var(--ink-muted)]">({grup.susunan.length})</span>
                </p>
                <p className="text-xs text-[var(--ink-muted)]">{grup.keterangan}</p>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Susunan kelompok ${grup.judul}`}>
                  {grup.susunan.map((layout) => {
                    const aktif = report.templateKey.layoutId === layout.id;
                    return (
                      <button
                        key={layout.id}
                        type="button"
                        role="radio"
                        aria-checked={aktif}
                        title={`${layout.name} — ${grup.judul}${ringkasSusunan(layout) ? ` · ${ringkasSusunan(layout)}` : ""}`}
                        onClick={() => {
                          onSelectLayout(layout.id);
                        }}
                        className={`inline-flex min-h-[44px] items-center rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                          aktif
                            ? "border-[var(--border-brand)] bg-[var(--brand-solid)] text-[var(--on-strong)]"
                            : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)]"
                        }`}
                      >
                        {layout.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {showCustomBuilder && <CustomThemeBuilder onSave={onSaveCustomTheme} />}
      </details>

      {/* Pratinjau susunan on-demand — memakai data contoh (SAMPLE_REPORT_DATA),
          bukan data murid, dan tanpa panggilan AI. Memakai `Modal` supaya
          Escape, penguncian fokus, dan pemulihan fokus bekerja. */}
      {pratinjauTerbuka && layoutPratinjau && (
        <Modal
          onClose={() => setPratinjauTerbuka(false)}
          ariaLabel={`Pratinjau susunan ${layoutPratinjau.name}`}
          panelClassName="relative w-full max-w-[320px] rounded-2xl bg-[var(--surface-strong)] p-3 shadow-xl outline-none"
        >
          <p className="mb-2 flex items-center gap-1 pr-10 text-xs font-semibold text-[var(--ink-strong)]">
            <EyeIcon size={13} />
            {layoutPratinjau.name}
          </p>
          <div className="flex max-h-[60vh] justify-center overflow-y-auto">
            <ScaledPreview scale={0.5}>
              <ReportRenderer data={SAMPLE_REPORT_DATA} theme={activeTheme} layoutId={layoutPratinjau.id} />
            </ScaledPreview>
          </div>
          <p className="mt-2 text-center text-xs text-[var(--ink-muted)]">
            Pratinjau memakai data contoh — bukan data murid.
          </p>
        </Modal>
      )}
    </>
  );
}
