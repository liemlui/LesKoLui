/**
 * Riwayat Sesi (G3-06 butir 10).
 *
 * Yang diperiksa di sini, semuanya dari markup statis:
 * 1. **Tidak ada kontrol bersarang** — bagian pertama butir 10. Sebelumnya kartu
 *    sesi adalah `div role="button"` yang memuat `<button>` Edit di dalamnya.
 * 2. Pola halaman tetap dipakai (keputusan pemilik K5: "pertahankan"), bukan
 *    diganti tombol "muat 20 lagi".
 * 3. Penyebut pada daftar topik menyebut jumlah sesi yang benar.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RiwayatSesi from "../screens/studentDetail/RiwayatSesi";
import type { Session } from "../db/types";

const noop = () => {};

function sess(over: Partial<Session> & { id: string }): Session {
  return {
    studentId: "s1",
    date: "2026-06-01",
    time: "16:00",
    durationHours: 2,
    status: "DONE",
    subjects: ["Mathematics"],
    cost: 600_000,
    rateSnapshot: 300_000,
    createdAt: "2026-06-01T00:00:00.000Z",
    ...over,
  } as unknown as Session;
}

function render(sessions: Session[]) {
  return renderToStaticMarkup(
    <RiwayatSesi
      allSessions={sessions}
      paginatedHistorySessions={sessions}
      historySessions={sessions}
      historyMonth=""
      historyMonthOptions={[]}
      setHistoryMonth={noop}
      safeHistoryPage={1}
      setHistoryPage={noop}
      photoUrls={new Map()}
      sigUrls={new Map()}
      setDetailSession={noop}
      openEditNote={noop}
      onCaptureFirst={noop}
    />,
  );
}

describe("butir 10 — tidak ada kontrol bersarang", () => {
  it("tidak memakai div ber-peran button untuk kartu sesi", () => {
    expect(render([sess({ id: "a" })])).not.toContain('role="button"');
  });

  it("membuka detail sesi lewat tombol asli yang punya nama", () => {
    const html = render([sess({ id: "a" })]);
    expect(html).toContain('aria-label="Buka detail sesi Mathematics"');
    expect(html).toContain('<button type="button"');
  });

  it("tidak menyarangkan tombol Edit di dalam tombol buka-detail", () => {
    const html = render([sess({ id: "a" })]);
    const openIndex = html.indexOf('aria-label="Buka detail sesi');
    const editIndex = html.indexOf('aria-label="Edit catatan sesi');
    expect(openIndex).toBeGreaterThan(-1);
    expect(editIndex).toBeGreaterThan(-1);

    // Bukti struktural: di antara tombol pembuka dan tombol Edit, tombol pembuka
    // SUDAH DITUTUP (`</button>` muncul sekali). Kalau Edit ada di dalamnya,
    // penutup itu belum ada di titik ini.
    const antara = html.slice(openIndex, editIndex);
    expect((antara.match(/<\/button>/g) ?? []).length).toBe(1);
  });

  it("memberi nama tombol Edit yang menyebut sesi mana yang disunting", () => {
    const html = render([sess({ id: "a", subjects: ["Physics"] })]);
    expect(html).toContain('aria-label="Edit catatan sesi Physics"');
  });

  it("tidak menyediakan tombol Edit untuk sesi yang bukan DONE", () => {
    const html = render([sess({ id: "a", status: "CANCELLED" })]);
    expect(html).not.toContain("Edit catatan sesi");
    // Tetapi kartunya tetap bisa dibuka.
    expect(html).toContain('aria-label="Buka detail sesi');
  });
});

describe("butir 10 — pola halaman dipertahankan (K5)", () => {
  it("tidak menambahkan tombol 'muat lagi'", () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      sess({ id: `s${i}`, date: `2026-06-${String((i % 28) + 1).padStart(2, "0")}` }));
    const html = render(many);
    expect(html.toLowerCase()).not.toContain("muat 20");
    expect(html.toLowerCase()).not.toContain("muat lagi");
  });
});

describe("daftar topik — penyebutnya benar", () => {
  it("menyebut berapa dari berapa sesi yang punya catatan topik", () => {
    const html = render([
      sess({ id: "a", date: "2026-06-02", topic: "Vektor" }),
      sess({ id: "b", date: "2026-06-01" }),
      sess({ id: "c", date: "2026-05-31", topic: "Aljabar" }),
    ]);
    // 2 topik unik, dari 3 sesi selesai.
    expect(html).toContain("Topik Pernah Dibahas (2 dari 3 sesi yang punya catatan topik)");
  });

  it("tidak menyebut daftar topik bila tidak ada topik sama sekali", () => {
    const html = render([sess({ id: "a" })]);
    expect(html).not.toContain("Topik Pernah Dibahas");
  });
});
