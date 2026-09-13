import { test, expect, type Page } from "@playwright/test";

/**
 * Fase B "Rencana Ketahanan Data" — bukti E2E (bukan unit test repo).
 *
 * Yang dibuktikan di runtime aplikasi sungguhan:
 * 1. Kegagalan menyimpan tindak lanjut TIDAK membuang isian close-out dan tidak
 *    menavigasi keluar; sesi yang sudah tersimpan tetap satu baris.
 * 2. Rollback batch tidak meninggalkan tindak lanjut parsial dan tidak menghapus
 *    draf (draf dibersihkan hanya di transaksi batch yang sukses).
 * 3. Retry menyimpan tepat satu batch dengan pemilik sesi/murid yang benar, dan
 *    submit ulang tidak menggandakan sesi.
 *
 * Kegagalan disuntikkan deterministik di lapisan IndexedDB: setiap penulisan ke
 * object store `followUps` membatalkan transaksinya selama flag
 * `window.__lklFailFollowUpWrite` menyala. Store `sessions`/`captureDrafts`
 * tidak disentuh, jadi yang diuji benar-benar jalur gagal close-out.
 *
 * Murid dibuat khusus oleh skenario ini (bukan murid data seed) supaya hitungan
 * sesi/tindak lanjut milik murid ini deterministik.
 */

const FAIL_FLAG = "__lklFailFollowUpWrite";
const STUDENT_ID = "e2e-closeout-student";
const STUDENT_NAME = "Murid E2E Close-out";
const DRAFT_ID = "e2e-closeout-draft";
const FOLLOW_UP_ONE = "Latihan soal vektor lanjutan";
const FOLLOW_UP_TWO = "Kuis singkat trigonometri";

/**
 * Modal changelog muncul di load pertama tiap versi baru dan animasinya
 * (`animate-slide-up`) sempat membuat tombol berada di luar viewport — klik
 * tanpa `force` supaya Playwright menunggu posisi stabil dulu.
 */
async function dismissPrompts(page: Page) {
  const changelog = page.getByRole("dialog", { name: "Catatan perubahan" });
  try {
    await changelog.waitFor({ state: "visible", timeout: 8000 });
    await changelog.getByRole("button", { name: /Mengerti/ }).click({ timeout: 8000 });
    await expect(changelog).toBeHidden({ timeout: 8000 });
  } catch {
    // tidak ada changelog di context ini
  }
}

async function installFaultInjector(page: Page) {
  await page.addInitScript((flag) => {
    // Ajakan backup mingguan tidak relevan untuk skenario ini dan bisa menutupi
    // tombol — tandai sudah ditanya (pola yang sama dengan screenshot-audit).
    localStorage.setItem("leskolui_last_auto_backup_prompt", String(Date.now()));

    const rawAdd = IDBObjectStore.prototype.add;
    const rawPut = IDBObjectStore.prototype.put;
    const armed = (store: IDBObjectStore) =>
      store.name === "followUps" &&
      (window as unknown as Record<string, unknown>)[flag] === true;

    IDBObjectStore.prototype.add = function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ): IDBRequest {
      const request = key === undefined
        ? rawAdd.call(this, value)
        : rawAdd.call(this, value, key);
      if (armed(this)) this.transaction.abort();
      return request;
    };

    IDBObjectStore.prototype.put = function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ): IDBRequest {
      const request = key === undefined
        ? rawPut.call(this, value)
        : rawPut.call(this, value, key);
      if (armed(this)) this.transaction.abort();
      return request;
    };
  }, FAIL_FLAG);
}

/** Seed dev bersifat lazy setelah React mount — tunggu sampai benar-benar ada murid. */
async function waitForDatabaseReady(page: Page) {
  await page.waitForFunction(() =>
    typeof (window as Window & { seedDummy?: unknown }).seedDummy === "function");
  await page.waitForFunction(() => new Promise<boolean>((resolve, reject) => {
    const request = indexedDB.open("jurnalles");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const keys = database.transaction("students", "readonly").objectStore("students").getAllKeys();
      keys.onsuccess = () => {
        const ready = keys.result.length > 0;
        database.close();
        resolve(ready);
      };
      keys.onerror = () => {
        database.close();
        reject(keys.error);
      };
    };
  }));
}

/**
 * Siapkan murid + draf langkah 6 langsung di IndexedDB, supaya skenario close-out
 * diuji tanpa menelusuri 6 langkah wizard (dan tanpa bergantung tata letak form).
 */
async function seedScenario(page: Page): Promise<void> {
  await page.evaluate(async ({ studentId, studentName, draftId }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("jurnalles");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    const todayWib = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        ["students", "sessions", "followUps", "captureDrafts"],
        "readwrite",
      );
      const students = transaction.objectStore("students");
      const sessions = transaction.objectStore("sessions");
      const followUps = transaction.objectStore("followUps");
      const drafts = transaction.objectStore("captureDrafts");

      students.put({
        id: studentId,
        name: studentName,
        level: "IBDP",
        curriculum: "IB DP",
        grade: "Grade 11",
        subjects: ["Mathematics AA"],
        parentContact: { name: "Orang Tua E2E", phone: "081200000000" },
        hourlyRate: 250_000,
        active: true,
        enrolledAt: "2026-01-10",
      });

      // Bersihkan sisa data murid ini agar hitungan deterministik saat retry.
      for (const store of [sessions, followUps]) {
        const keys = store.getAllKeys();
        keys.onsuccess = () => {
          for (const key of keys.result) store.delete(key);
        };
      }
      drafts.clear();

      drafts.add({
        draftId,
        formatVersion: 1,
        revision: 1,
        updatedAt: new Date().toISOString(),
        scopeKey: "student:" + studentId,
        studentId,
        phase: "editing",
        form: {
          step: 6,
          date: todayWib,
          durationHours: 1.5,
          subjects: ["Mathematics AA"],
          topic: "Vektor",
          topicSearch: "",
          shortNote: "Latihan vektor: penjumlahan dan proyeksi.",
          needsWork: "",
          predictedGrade: "",
          engagementFlags: {
            prepared: true, focused: true, drowsy: false, playingPhone: false,
            activeAsking: false, quickLearner: false, needsRepetition: false,
            hwMissed: false, late: false, bathroomBreaks: false, restless: false, offTask: false,
          },
          behaviorTags: [],
          situasiNote: "",
        },
      });

      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }, { studentId: STUDENT_ID, studentName: STUDENT_NAME, draftId: DRAFT_ID });
}

interface StoreSnapshot {
  sessions: number;
  followUps: Array<{ text: string; studentId: string; sourceSessionId: string }>;
  drafts: number;
}

/** Hanya menghitung baris milik murid/draf skenario ini (data seed diabaikan). */
async function readScenarioState(page: Page): Promise<StoreSnapshot> {
  return page.evaluate(async ({ studentId, draftId }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("jurnalles");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const readAll = <T,>(store: string) => new Promise<T[]>((resolve, reject) => {
      const rows = database.transaction(store, "readonly").objectStore(store).getAll();
      rows.onsuccess = () => resolve(rows.result as T[]);
      rows.onerror = () => reject(rows.error);
    });
    const [sessions, followUps, drafts] = await Promise.all([
      readAll<{ id: string; studentId: string }>("sessions"),
      readAll<{ id: string; text: string; studentId: string; sourceSessionId: string }>("followUps"),
      readAll<{ draftId: string; studentId?: string }>("captureDrafts"),
    ]);
    database.close();
    return {
      sessions: sessions.filter((row) => row.studentId === studentId).length,
      followUps: followUps
        .filter((row) => row.studentId === studentId)
        .map((row) => ({ text: row.text, studentId: row.studentId, sourceSessionId: row.sourceSessionId })),
      drafts: drafts.filter((row) => row.draftId === draftId).length,
    };
  }, { studentId: STUDENT_ID, draftId: DRAFT_ID });
}

test("close-out gagal: isian bertahan, tanpa tindak lanjut parsial, retry menyimpan satu batch", async ({ page }) => {
  test.setTimeout(120_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await installFaultInjector(page);
  await page.goto("/capture", { waitUntil: "domcontentloaded" });
  await waitForDatabaseReady(page);
  await dismissPrompts(page);

  // Vite dev bisa melakukan reload optimasi dependency di awal; tulis ulang bila
  // penyiapan sempat jatuh di tengah reload (expect.toPass mencoba ulang).
  await expect(async () => {
    await seedScenario(page);
    expect((await readScenarioState(page)).drafts).toBe(1);
  }).toPass({ timeout: 30_000 });

  // ── Buka draf langkah 6 ────────────────────────────────────────────────
  await page.goto(`/capture?studentId=${STUDENT_ID}`);
  const pendingBanner = page.getByText(new RegExp(`Langkah 6 dari 6 · ${STUDENT_NAME}`));
  await expect(pendingBanner).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Lanjutkan draf" }).click();

  const saveButton = page.getByRole("button", { name: "✅ Simpan Sesi" });
  await expect(saveButton).toBeVisible({ timeout: 15_000 });
  await saveButton.click();

  const report = page.getByRole("dialog", { name: "Laporan sesi" });
  await expect(report).toBeVisible({ timeout: 30_000 });

  // ── Dua tindak lanjut valid ────────────────────────────────────────────
  const followUpInput = report.getByPlaceholder("Topik/hal yang perlu dilanjutkan...");
  await followUpInput.fill(FOLLOW_UP_ONE);
  await report.getByRole("button", { name: "+", exact: true }).click();
  // `exact` supaya hanya chip tindak lanjut yang cocok — teks yang sama juga
  // muncul di pratinjau pesan WhatsApp.
  await expect(report.getByText(FOLLOW_UP_ONE, { exact: true })).toBeVisible();
  await followUpInput.fill(FOLLOW_UP_TWO);
  await report.getByRole("button", { name: "+", exact: true }).click();
  await expect(report.getByText(FOLLOW_UP_TWO, { exact: true })).toBeVisible();

  // Sesi sudah commit, tindak lanjut belum ditulis (menunggu tombol Selesai).
  const beforeFailure = await readScenarioState(page);
  expect(beforeFailure.sessions).toBe(1);
  expect(beforeFailure.followUps).toHaveLength(0);

  // ── Submit saat penulisan followUps dipaksa gagal ──────────────────────
  const doneButton = report.getByRole("button", { name: "🏁 Selesai & Lihat Profil" });
  await page.evaluate((flag) => {
    (window as unknown as Record<string, unknown>)[flag] = true;
  }, FAIL_FLAG);
  await doneButton.click();

  await expect(page.getByText(/Tindak lanjut belum tersimpan; coba lagi\./))
    .toBeVisible({ timeout: 30_000 });
  // Modal & seluruh teks tetap ada, dan TIDAK ada navigasi sukses.
  await expect(report).toBeVisible();
  await expect(report.getByText(FOLLOW_UP_ONE, { exact: true })).toBeVisible();
  await expect(report.getByText(FOLLOW_UP_TWO, { exact: true })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/capture");
  expect(new URL(page.url()).searchParams.get("studentId")).toBe(STUDENT_ID);

  // Rollback penuh: tidak ada tindak lanjut parsial, draf tidak dihapus,
  // dan sesi awal tidak dibuat ulang.
  const afterFailure = await readScenarioState(page);
  expect(afterFailure.sessions).toBe(1);
  expect(afterFailure.followUps).toHaveLength(0);
  expect(afterFailure.drafts).toBe(1);

  // ── Retry tanpa kegagalan ──────────────────────────────────────────────
  await page.evaluate((flag) => {
    (window as unknown as Record<string, unknown>)[flag] = false;
  }, FAIL_FLAG);
  await doneButton.click();
  await expect(page).toHaveURL(new RegExp(`/students/${STUDENT_ID}$`), { timeout: 30_000 });

  const afterRetry = await readScenarioState(page);
  expect(afterRetry.followUps).toHaveLength(2);
  expect(afterRetry.followUps.map((item) => item.text).sort())
    .toEqual([FOLLOW_UP_ONE, FOLLOW_UP_TWO].sort());
  expect(afterRetry.followUps.every((item) => item.studentId === STUDENT_ID)).toBe(true);
  // Kedua tindak lanjut menunjuk sesi yang sama (retry tidak membuat sesi kedua).
  expect(new Set(afterRetry.followUps.map((item) => item.sourceSessionId)).size).toBe(1);
  expect(afterRetry.sessions).toBe(1);
  // Draf dibersihkan di transaksi batch yang sukses.
  expect(afterRetry.drafts).toBe(0);
  expect(pageErrors).toEqual([]);
});
