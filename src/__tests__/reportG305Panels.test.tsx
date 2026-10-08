/**
 * Markup panel-panel baru halaman Laporan (G3-05).
 *
 * Yang diperiksa di sini adalah hal-hal yang bisa dibuktikan dari markup statis:
 * peran tombol/status, penunjuk langkah, alasan tombol mati, dan daftar hasil AI.
 * Perilaku yang butuh DOM (fokus, timer simpan otomatis) tidak diklaim di sini.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ReportActionBar from "../screens/monthlyReport/ReportActionBar";
import ReportAiResultPanel from "../screens/monthlyReport/ReportAiResultPanel";
import ReportMessageBanner from "../screens/monthlyReport/ReportMessageBanner";
import EditableText from "../screens/monthlyReport/EditableText";

const noop = () => {};

function actionBarMarkup(overrides: Partial<Parameters<typeof ReportActionBar>[0]> = {}) {
  return renderToStaticMarkup(
    <ReportActionBar
      activeStep={2}
      hasReport={false}
      reportConfirmed={false}
      canCreate
      busy={false}
      onCreateOrUpdate={noop}
      onFinalize={noop}
      showExport={false}
      exporting={null}
      exportStage={null}
      onExport={noop}
      showUndoAi={false}
      onUndoAi={noop}
      {...overrides}
    />,
  );
}

describe("ReportActionBar (G3-05 butir 1)", () => {
  it("menandai langkah yang sedang berjalan", () => {
    const html = actionBarMarkup();
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("Pilih periode");
    // Lima langkah selalu terlihat, termasuk yang belum tercapai.
    expect(html).toContain("Pilih murid");
    expect(html).toContain("Isi narasi");
    expect(html).toContain("Ekspor");
  });

  it("menyebut alasan tombol mati di tempatnya", () => {
    const html = actionBarMarkup({
      canCreate: false,
      createReason: "Semua sesi di periode ini sudah pernah direkap — pilih periode lain.",
    });
    expect(html).toContain("Tombol laporan mati");
    expect(html).toContain("pilih periode lain");
    expect(html).toContain("disabled");
  });

  it("hanya ada satu tombol buat/update laporan", () => {
    const html = actionBarMarkup();
    expect(html.match(/Buat Laporan/g)).toHaveLength(1);
  });

  it("tombol ekspor hanya muncul saat pratinjau siap", () => {
    expect(actionBarMarkup()).not.toContain(">JPG<");
    const ready = actionBarMarkup({ showExport: true });
    expect(ready).toContain("JPG");
    expect(ready).toContain("PNG");
    expect(ready).toContain("PDF");
  });

  it("menampilkan tahap ekspor dan tombol urungkan AI di bilah tetap", () => {
    const html = actionBarMarkup({
      showExport: true,
      exporting: "pdf",
      exportStage: "menyiapkan-halaman",
      exportStageLabel: "Sedang menyiapkan halaman…",
      showUndoAi: true,
    });
    expect(html).toContain("Sedang menyiapkan halaman");
    expect(html).toContain("Undo Hasil AI");
  });
});

describe("EditableText (G3-05 butir 6 & 8)", () => {
  const base = {
    fieldId: "mr-ringkasan",
    label: "Ringkasan",
    placeholder: "Ketuk untuk tambah ringkasan...",
    editing: false,
    draft: "",
    onDraftChange: noop,
    onStartEdit: noop,
    onSave: noop,
    onCancel: noop,
  };

  it("keadaan baca memakai tombol sungguhan, bukan paragraf yang bisa diklik", () => {
    const html = renderToStaticMarkup(<EditableText {...base} value="Isi ringkasan" />);
    expect(html).toContain("<button");
    expect(html).toContain('type="button"');
    expect(html).toContain("aria-labelledby");
    expect(html).not.toContain("<p");
  });

  it("menampilkan penanda AI hanya saat isian itu memang ditulis AI", () => {
    const withMark = renderToStaticMarkup(<EditableText {...base} value="Dari AI" aiMarked />);
    expect(withMark).toContain("✨ AI");
    const without = renderToStaticMarkup(<EditableText {...base} value="Tulisan tutor" />);
    expect(without).not.toContain("✨ AI");
  });

  it("keadaan menyunting memakai kolom berlabel dan tombol simpan/batal", () => {
    const html = renderToStaticMarkup(<EditableText {...base} editing draft="Draf" />);
    expect(html).toContain("<textarea");
    expect(html).toContain('for="mr-ringkasan"');
    expect(html).toContain("Simpan");
    expect(html).toContain("Batal");
  });
});

describe("ReportAiResultPanel (G3-05 butir 2)", () => {
  const result = {
    ok: [{ id: "s1", label: "10 Sep — Matematika" }],
    failed: [{ id: "s2", label: "12 Sep — Fisika", error: "AI timeout" }],
    summary: { ok: false, error: "AI timeout" },
    finishedAt: "2026-09-30T07:00:00.000Z",
  };

  it("tidak menampilkan apa pun saat belum ada hasil dan tidak sedang berjalan", () => {
    expect(renderToStaticMarkup(
      <ReportAiResultPanel
        result={null} loading={false} progress={null}
        onRetry={noop} retryDisabled={false} onDismiss={noop}
      />,
    )).toBe("");
  });

  it("mendaftar sesi yang berhasil dan yang gagal, beserta tombol ulangi", () => {
    const html = renderToStaticMarkup(
      <ReportAiResultPanel
        result={result} loading={false} progress={null}
        onRetry={noop} retryDisabled={false} onDismiss={noop}
      />,
    );
    expect(html).toContain("Berhasil (1)");
    expect(html).toContain("Gagal (1)");
    expect(html).toContain("12 Sep — Fisika");
    expect(html).toContain("AI timeout");
    expect(html).toContain("Ulangi yang gagal (1)");
    expect(html).toContain('aria-live="polite"');
  });

  it("menyebut alasan tombol ulangi mati”, mis. batas belanja AI", () => {
    const html = renderToStaticMarkup(
      <ReportAiResultPanel
        result={result} loading={false} progress={null}
        onRetry={noop} retryDisabled retryDisabledReason="Batas belanja AI bulan ini sudah terlampaui."
        onDismiss={noop}
      />,
    );
    expect(html).toContain("Batas belanja AI");
    expect(html).toContain("disabled");
  });

  it("menampilkan bilah kemajuan berperan progressbar selama AI berjalan", () => {
    const html = renderToStaticMarkup(
      <ReportAiResultPanel
        result={null} loading progress={{ done: 4, total: 8, step: "Narasi 4/8 sesi…" }}
        onRetry={noop} retryDisabled={false} onDismiss={noop}
      />,
    );
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="4"');
    expect(html).toContain("Narasi 4/8 sesi");
  });
});

describe("ReportMessageBanner (G3-05 butir 12)", () => {
  it("kabar gagal diumumkan sebagai alert", () => {
    const html = renderToStaticMarkup(<ReportMessageBanner message="Gagal: AI timeout" onDismiss={noop} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
  });

  it("kabar berhasil diumumkan sebagai status", () => {
    const html = renderToStaticMarkup(<ReportMessageBanner message="Laporan draft dibuat." onDismiss={noop} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it("tidak dirender saat pesannya kosong", () => {
    expect(renderToStaticMarkup(<ReportMessageBanner message="" onDismiss={noop} />)).toBe("");
  });
});
