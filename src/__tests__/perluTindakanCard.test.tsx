/**
 * Kartu "Perlu Tindakan" (G3-06 butir 2).
 *
 * Yang diperiksa di sini adalah hal yang bisa dibuktikan dari markup statis:
 * isi kartu, pemotongan baris, dan KONTRAK UANG — kartu ini tidak punya gerbang
 * `useMoneyVisible`, jadi tidak boleh ada satu pun nominal di dalamnya.
 * Perilaku klik tidak diklaim di sini.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PerluTindakanCard from "../screens/studentDetail/PerluTindakanCard";
import { studentActions } from "../lib/studentActions";
import type { StudentActionsInput } from "../lib/studentActions";

const noop = () => {};
const TODAY = "2026-06-15";

function render(actions: ReturnType<typeof studentActions>) {
  return renderToStaticMarkup(
    <PerluTindakanCard actions={actions} onNavigate={noop} onJump={noop} />,
  );
}

function build(over: Partial<StudentActionsInput> = {}) {
  return studentActions({
    today: TODAY,
    scheduled: [],
    doneSessions: [],
    payments: [],
    followUps: [],
    ...over,
  });
}

const RAMAI = build({
  scheduled: [
    { id: "s1", date: "2026-06-12", time: "16:00", durationHours: 2, status: "SCHEDULED" },
    { id: "s2", date: "2026-06-16", time: "16:00", durationHours: 2, status: "SCHEDULED" },
  ],
  doneSessions: [{ id: "d1", date: "2026-06-10", needsWork: "Latihan vektor" }],
  payments: [{ id: "p1", status: "UNPAID" }, { id: "p2", status: "UNPAID" }],
  followUps: [{ id: "f1", text: "Kirim latihan", type: "send-resource", createdAt: "2026-06-02T00:00:00Z" }],
  unbilledCount: 3,
});

describe("Kartu Perlu Tindakan — isi", () => {
  it("tidak dirender sama sekali bila tidak ada yang menunggu", () => {
    expect(render(build())).toBe("");
  });

  it("menampilkan judul kartu dan jumlah yang menunggu", () => {
    const html = render(RAMAI);
    expect(html).toContain("Perlu Tindakan");
    // RAMAI menghasilkan 6 tindakan.
    expect(html).toContain("6 hal menunggu");
  });

  it("menyebut rujukan aria ke judulnya", () => {
    expect(render(RAMAI)).toContain('aria-labelledby="perlu-tindakan-title"');
  });

  it("memuat tiga jenis teratas saat daftarnya dipotong", () => {
    // RAMAI punya 6 tindakan: 2 jadwal, 1 PR, 2 tagihan, 1 tindak lanjut.
    // Yang tampil hanya empat teratas, jadi tindak lanjut belum muncul di sini —
    // itu memang perilaku yang diinginkan (diuji terpisah di bawah).
    const html = render(RAMAI);
    expect(html).toContain("sudah lewat");
    expect(html).toContain("Perlu diulang");
    expect(html).toContain("tagihan belum lunas");
    expect(html).not.toContain("tindak lanjut menunggu");
  });

  it("menampilkan tindak lanjut saat muat di empat baris", () => {
    const html = render(build({
      payments: [{ id: "p1", status: "UNPAID" }],
      followUps: [{ id: "f1", text: "Kirim latihan", type: "send-resource", createdAt: "2026-06-02T00:00:00Z" }],
    }));
    expect(html).toContain("1 tagihan belum lunas");
    expect(html).toContain("tindak lanjut menunggu");
  });

  it("memotong pada empat baris dan meringkas sisanya", () => {
    const html = render(RAMAI);
    // 6 tindakan → 4 tampil, 2 diringkas.
    expect(html).toContain("2 hal lain menunggu");
    expect((html.match(/<li/g) ?? []).length).toBe(4);
  });

  it("tidak menampilkan baris ringkasan bila semuanya muat", () => {
    const html = render(build({ payments: [{ id: "p1", status: "UNPAID" }] }));
    expect(html).not.toContain("hal lain menunggu");
    expect((html.match(/<li/g) ?? []).length).toBe(1);
  });
});

describe("Kartu Perlu Tindakan — kontrak uang", () => {
  it("tidak memuat satu pun nominal, walau data mentahnya memuat uang", () => {
    // Data mentah: tagihan belum lunas + sesi belum ditagih = situasi paling
    // menggoda untuk menulis nominal. Kartu ini tidak punya gerbang uang, jadi
    // angkanya tidak boleh muncul sama sekali (keputusan ATURAN-AI 4.1 butir B1).
    const html = render(RAMAI);
    expect(html).not.toMatch(/\bRp\b/);
    expect(html).not.toMatch(/\d{1,3}\.\d{3}/);
    expect(html).not.toMatch(/formatRupiah/);
  });

  it("menyatakan tagihan sebagai jumlah, bukan besaran", () => {
    const html = render(build({ payments: [{ id: "p1", status: "UNPAID" }] }));
    expect(html).toContain("1 tagihan belum lunas");
  });
});
