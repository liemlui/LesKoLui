/**
 * Blok Uang tab Ringkas (G3-06 butir 3).
 *
 * Yang diperiksa di sini adalah hal yang bisa dibuktikan dari markup statis:
 * isi blok, label siklus tagihan, dan SIFAT GERBANG — angka uang tidak boleh
 * muncul di markup saat gerbangnya tertutup.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import UangBlok from "../screens/studentDetail/UangBlok";
import type { Session, Student } from "../db/types";

const noop = () => {};
const saveOk = async () => "";
const STUDENT: Student = {
  id: "s1",
  name: "Bella Sari",
  level: "IBDP",
  subjects: ["Mathematics"],
  parentContact: { name: "Ibu Sari", phone: "0812" },
  hourlyRate: 300_000,
  billingPolicy: "monthly",
  active: true,
  enrolledAt: "2025-01-01",
};

function sess(over: Partial<Session> & { id: string }): Session {
  return {
    studentId: "s1",
    date: "2026-06-01",
    durationHours: 2,
    status: "DONE",
    subjects: ["Mathematics"],
    cost: 600_000,
    rateSnapshot: 300_000,
    createdAt: "2026-06-01T00:00:00.000Z",
    ...over,
  } as unknown as Session;
}

function render(over: Partial<Parameters<typeof UangBlok>[0]> = {}) {
  return renderToStaticMarkup(
    <UangBlok
      student={STUDENT}
      billableSessions={[]}
      unbilledCount={0}
      billingPolicy="monthly"
      moneyVisible
      needsSetup={false}
      locked={false}
      onLock={noop}
      onOpenSettings={noop}
      onOpenBillingHelp={noop}
      onSaveRate={saveOk}
      {...over}
    />,
  );
}

describe("Blok Uang — struktur", () => {
  it("memberi satu judul blok yang dirujuk aria-labelledby", () => {
    const html = render();
    expect(html).toContain('id="uang-blok-title"');
    expect(html).toContain('aria-labelledby="uang-blok-title"');
    expect(html).toContain(">Uang<");
  });

  it("menyebut tarif per jam untuk murid bulanan", () => {
    expect(render()).toContain("/jam");
  });

  it("menyebut tarif per pertemuan untuk murid paket", () => {
    const html = render({ billingPolicy: "session_count" });
    expect(html).toContain("/pertemuan");
  });
});

describe("Blok Uang — siklus tagihan", () => {
  it("menyebut bulanan apa adanya", () => {
    expect(render({ billingPolicy: "monthly" })).toContain("Bulanan (Laporan → Tagihan)");
  });

  it("menyebut jumlah pertemuan untuk siklus paket", () => {
    const html = render({
      billingPolicy: "session_count",
      student: { ...STUDENT, billingSessionCount: 8 },
    });
    expect(html).toContain("Setiap 8 pertemuan");
  });

  it("menyebut keadaan transisi bila murid sedang menunggu peralihan", () => {
    const html = render({
      billingPolicy: "session_count",
      student: { ...STUDENT, billingSessionCount: 12, pendingBillingPolicy: "monthly" },
    });
    expect(html).toContain("Setiap 12 pertemuan");
    expect(html).toContain("akan beralih ke Bulanan");
  });
});

describe("Blok Uang — rincian biaya sesi selesai", () => {
  it("mengatakan belum ada biaya bila belum ada sesi selesai", () => {
    expect(render()).toContain("Belum ada sesi selesai");
  });

  it("menghitung hanya sesi yang diberikan, dan menyebut jumlahnya", () => {
    const html = render({
      billableSessions: [sess({ id: "a" }), sess({ id: "b", durationHours: 1.5 })],
    });
    expect(html).toContain("2 sesi selesai");
    expect(html).toContain("3.5 jam");
  });

  it("menyebut berapa sesi memakai nominal manual", () => {
    const html = render({
      billableSessions: [sess({ id: "a", costOverride: 700_000 }), sess({ id: "b" })],
    });
    expect(html).toContain("1 dari 2 sesi memakai nominal manual");
  });

  it("tidak menyebut nominal manual bila tidak ada", () => {
    const html = render({ billableSessions: [sess({ id: "a" })] });
    expect(html).not.toContain("nominal manual");
  });

  it("menyebut berapa sesi yang belum masuk tagihan", () => {
    const html = render({
      billableSessions: [sess({ id: "a" }), sess({ id: "b" })],
      unbilledCount: 1,
    });
    expect(html).toContain("1 dari 2 sesi ini belum masuk tagihan");
  });

  it("tidak mengklaim angka total mengubah tagihan yang sudah difinalkan", () => {
    const html = render({ billableSessions: [sess({ id: "a" })] });
    expect(html).toContain("nominal beku");
  });
});

describe("Blok Uang — sifat gerbang uang", () => {
  it("saat terkunci: seluruh rincian biaya ikut tertutup, bukan hanya nominalnya", () => {
    const html = render({
      moneyVisible: false,
      billableSessions: [sess({ id: "a" }), sess({ id: "b" })],
      unbilledCount: 2,
    });
    // Jumlah sesi, jam, dan jumlah yang belum ditagih ikut tertutup: ketiganya
    // bercerita tentang uang, dan menampilkannya di sebelah "Rp ••••••" tidak
    // konsisten. Bagiannya tidak dirender sama sekali.
    expect(html).not.toContain("Rincian biaya sesi");
    expect(html).not.toContain("2 sesi selesai");
    expect(html).not.toContain("Total biaya sesi selesai");
    expect(html).not.toContain("4 jam");
    expect(html).not.toContain("belum masuk tagihan");
    // Yang tinggal hanya bagian yang tidak memuat angka uang.
    expect(html).toContain("Tarif les");
    expect(html).toContain("Siklus tagihan");
  });

  it("saat terbuka: rincian biayanya muncul", () => {
    const html = render({
      moneyVisible: true,
      billableSessions: [sess({ id: "a" }), sess({ id: "b" })],
      unbilledCount: 2,
    });
    expect(html).toContain("Rincian biaya sesi");
    expect(html).toContain("2 sesi selesai");
  });

  it("saat terkunci: menyebut tarif dikunci, bukan angkanya", () => {
    const html = render({ moneyVisible: false, locked: true });
    expect(html).toContain("Tarif dikunci");
  });

  it("menawarkan pembuatan PIN bila belum ada setelan uang", () => {
    const html = render({ moneyVisible: false, needsSetup: true });
    expect(html).toContain("Buat PIN");
  });

  it("tidak memuat satu pun nominal mentah dalam bentuk apa pun", () => {
    // Nominal hanya boleh muncul lewat MaskedMoney, yang menyembunyikannya saat
    // terkunci. Jadi tidak boleh ada digit ribuan bertitik di markup mana pun.
    for (const visible of [true, false]) {
      const html = render({
        moneyVisible: visible,
        billableSessions: [sess({ id: "a", cost: 1_250_000 })],
        unbilledCount: 3,
      });
      expect(html).not.toMatch(/1\.250\.000/);
      expect(html).not.toMatch(/\bRp\s?1\./);
    }
  });

  it("memberi nama yang bisa diakses untuk setiap angka uang", () => {
    // Tanpa label, pembaca layar hanya mendengar "Rp ••••••" di keadaan terkunci,
    // sehingga pengguna tidak tahu angka itu apa (butir 8 G3-06).
    const html = render({ billableSessions: [sess({ id: "a" })] });
    expect(html).toContain('aria-label="Tarif per jam:');
  });

  it("menyebut angka terkunci pada nama yang bisa diakses saat gerbang tertutup", () => {
    const html = render({ moneyVisible: false });
    expect(html).toContain("angka terkunci");
  });

  it("tetap memberi nama saat bagian rincian dibuka", () => {
    // Catatan: `MaskedMoney` membaca gerbangnya SENDIRI lewat hook
    // `useMoneyVisible()`, sedangkan prop `moneyVisible` di sini hanya mengatur
    // bagian rincian biaya. Di aplikasi keduanya sepadan; di tes tanpa penyedia
    // hook, yang bisa dibuktikan adalah namanya tetap ada.
    const html = render({ moneyVisible: true });
    expect(html).toContain('aria-label="Tarif per jam:');
  });

  it("memberi nama pada total biaya, bukan hanya pada tarif", () => {
    const html = render({ billableSessions: [sess({ id: "a" })] });
    expect(html).toContain('aria-label="Total biaya sesi selesai:');
  });
});
