/**
 * Bilah desain laporan: tema, susunan, sampul, dan pembangun tema kustom.
 *
 * Dipisah dari MonthlyReport.tsx (refactor terbatas G3-05) — butir 11: pratinjau
 * susunan memakai komponen `Modal` yang sudah ada, sehingga **Escape**,
 * **penguncian fokus**, dan **pemulihan fokus** bekerja. Sebelumnya modal itu
 * dirender tangan sebagai `<div role="dialog">` tanpa ketiganya.
 */

import { LAYOUTS } from "../../template/layouts";
import { ReportRenderer } from "../../template/ReportRenderer";
import { SAMPLE_REPORT_DATA } from "../../template/sampleData";
import Modal from "../../components/Modal";
import { EyeIcon } from "../../components/icons";
import type { CustomTheme, Layout, Theme } from "../../template/types";
import type { MonthlyReport } from "../../db/types";
import { CustomThemeBuilder } from "./CustomThemeBuilder";
import ScaledPreview from "./ScaledPreview";

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
  previewLayoutId: string | null;
  onPreviewLayout: (layoutId: string | null) => void;
  /** Tema yang sedang dipakai — dipakai pratinjau susunan. */
  activeTheme: Theme;
  onSaveCustomTheme: (theme: CustomTheme) => void;
}

export default function DesignToolbar({
  report, themes, open, onToggleOpen,
  showThemeList, onToggleThemeList, showLayoutList, onToggleLayoutList,
  showCustomBuilder, onToggleCustomBuilder, coverPage, onToggleCover,
  onRandomize, undoCount, onUndoDesign, onSelectTheme, onSelectLayout,
  previewLayoutId, onPreviewLayout, activeTheme, onSaveCustomTheme,
}: DesignToolbarProps) {
  const layouts: Layout[] = LAYOUTS;
  const activeThemeName = themes.find((t) => t.id === report.templateKey.themeId)?.name ?? "—";
  const activeLayoutName = layouts.find((l) => l.id === report.templateKey.layoutId)?.name ?? "—";
  const previewLayout = previewLayoutId ? layouts.find((l) => l.id === previewLayoutId) : undefined;

  return (
    <>
      <details
        className="group space-y-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-sm"
        open={open}
        onToggle={(e) => onToggleOpen(e.currentTarget.open)}
      >
        <summary className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-1">
          <span className="min-w-0 text-sm font-semibold text-[var(--ink-strong)]">
            🎨 Tema: {activeThemeName}
            {" · "}{activeLayoutName}
          </span>
          <span className="text-xs font-semibold text-[var(--ink-brand)] group-open:hidden">Ubah tema & layout ▸</span>
          <span className="hidden text-xs font-semibold text-[var(--ink-muted)] group-open:inline">▾</span>
        </summary>

        {/* Baris 1: Acak + Pilih tema + Layout + Undo + Cover */}
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-secondary min-h-[44px] flex-shrink-0 whitespace-nowrap px-2 py-1.5 text-sm" onClick={onRandomize}>Acak</button>
          <button
            className="btn btn-secondary min-h-[44px] flex-shrink-0 whitespace-nowrap px-2 py-1.5 text-sm"
            onClick={onToggleThemeList}
            aria-expanded={showThemeList}
            title="Tampilkan semua tema. Untuk memilih layout, buka tombol “Layout”."
          >
            {showThemeList ? "Sembunyikan tema" : "Pilih tema"}
          </button>
          <button
            className="btn btn-secondary min-h-[44px] flex-shrink-0 whitespace-nowrap px-2 py-1.5 text-sm"
            onClick={onToggleLayoutList}
            aria-expanded={showLayoutList}
            title="Tampilkan semua layout halaman laporan."
          >
            {showLayoutList ? "Sembunyikan layout" : "Layout"}
          </button>
          {undoCount > 0 && (
            <button className="btn btn-secondary min-h-[44px] flex-shrink-0 px-2 py-1.5 text-sm" onClick={onUndoDesign}>↩ Undo</button>
          )}
          {showLayoutList && (
            <div className="flex w-full flex-wrap gap-1">
              {layouts.map((layout) => (
                <span key={layout.id} className="relative inline-flex">
                  <button
                    type="button"
                    aria-pressed={report.templateKey.layoutId === layout.id}
                    title={layout.supportsLongNarrative ? "Cocok untuk narasi panjang" : "Ringkas"}
                    onClick={() => onSelectLayout(layout.id)}
                    className={`inline-flex min-h-[36px] items-center rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                      report.templateKey.layoutId === layout.id
                        ? "border-[var(--border-brand)] bg-[var(--brand-solid)] text-[var(--on-strong)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)]"
                    }`}
                  >
                    {layout.name}
                  </button>
                  <button
                    type="button"
                    title={`Pratinjau ${layout.name}`}
                    aria-label={`Pratinjau susunan ${layout.name}`}
                    onClick={() => onPreviewLayout(layout.id)}
                    className="absolute -right-1.5 -top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-strong)] text-[8px] leading-none text-[var(--ink-muted)] shadow-sm transition-colors hover:border-[var(--brand-tint-strong)] hover:text-[var(--ink-brand)]"
                  >
                    <EyeIcon size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <button
            onClick={onToggleCover}
            aria-pressed={coverPage}
            className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg border px-2 py-1.5 text-sm transition-colors ${
              coverPage
                ? "border-[var(--border-brand)] bg-[var(--brand-solid)] text-[var(--on-strong)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)]"
            }`}
          >
            {coverPage ? "Cover ✓" : "Cover"}
          </button>
        </div>

        {/* Baris 2: pembangun tema kustom (mode "Bandingkan" dihapus — pemilik
            hanya memilih satu tema yang sesuai). */}
        <div className="flex gap-2">
          <button className="btn btn-secondary min-h-[44px] flex-1 px-2 py-1 text-xs" onClick={onToggleCustomBuilder} aria-expanded={showCustomBuilder}>
            {showCustomBuilder ? "Tutup" : "Custom Theme"}
          </button>
        </div>

        {/* Daftar tema TIDAK ditampilkan otomatis: tema diacak oleh tombol Acak.
            Galeri hanya dibuka bila diminta. */}
        {showThemeList && (
          <>
            <div className="grid max-h-[200px] grid-cols-6 gap-1.5 overflow-y-auto">
              {themes.map((theme) => {
                const isActive = report.templateKey.themeId === theme.id;
                const bgColor = theme.bg.includes("gradient") ? theme.accent : theme.bg;
                return (
                  <button
                    key={theme.id}
                    title={theme.name}
                    aria-pressed={isActive}
                    onClick={() => onSelectTheme(theme.id)}
                    className={`overflow-hidden rounded-lg border-2 transition-all ${
                      isActive
                        ? "border-[var(--border-strong)] ring-2 ring-[var(--border-brand)] ring-offset-1"
                        : "border-[var(--border)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <div style={{ background: bgColor, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: theme.fontDisplay, fontSize: 10, color: theme.ink, fontWeight: 700, lineHeight: 1, textAlign: "center", padding: "0 2px" }}>
                        {theme.headerText.slice(0, 4)}
                      </span>
                    </div>
                    <div style={{ padding: "2px 3px", fontSize: 10, color: "#6b7280", textAlign: "center", background: "#fff" }}>
                      {theme.name.length > 10 ? theme.name.slice(0, 9) + "…" : theme.name}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--ink-muted)]">{activeThemeName}</p>
          </>
        )}

        {showCustomBuilder && (
          <CustomThemeBuilder onSave={onSaveCustomTheme} />
        )}
      </details>

      {/* Pratinjau susunan on-demand — memakai data contoh (SAMPLE_REPORT_DATA),
          bukan data murid, dan tanpa panggilan AI. Memakai `Modal` supaya
          Escape, penguncian fokus, dan pemulihan fokus bekerja (butir 11). */}
      {previewLayout && (
        <Modal
          onClose={() => onPreviewLayout(null)}
          ariaLabel={`Pratinjau susunan ${previewLayout.name}`}
          panelClassName="relative w-full max-w-[320px] rounded-2xl bg-[var(--surface-strong)] p-3 shadow-xl outline-none"
        >
          <p className="mb-2 flex items-center gap-1 pr-10 text-xs font-semibold text-[var(--ink-strong)]">
            <EyeIcon size={13} />
            {previewLayout.name}
          </p>
          <div className="flex max-h-[60vh] justify-center overflow-y-auto">
            <ScaledPreview scale={0.5}>
              <ReportRenderer data={SAMPLE_REPORT_DATA} theme={activeTheme} layoutId={previewLayout.id} />
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
