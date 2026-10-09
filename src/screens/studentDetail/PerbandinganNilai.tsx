import { useMemo, useState } from "react";
import type { Session } from "../../db/types";
import { gradeDelta } from "../../template/layouts";
import { gradeValue, isGradeLower } from "../../lib/grades";
import { dayLabel } from "../../lib/format";
import PaginationControls from "../../components/PaginationControls";
import { clampPage, paginateItems } from "../../lib/pagination";

/**
 * Apakah dua nilai berada pada SKALA yang sama sehingga boleh dibandingkan.
 *
 * `isGradeLower` sengaja longgar — ia dipakai untuk memblokir PENYIMPANAN, jadi
 * kegagalan membandingkan lebih baik menghasilkan `false` daripada menahan tutor.
 * Akibatnya `isGradeLower("B", "80")` bernilai `true` (B dinilai 8, lalu 8 < 80),
 * padahal huruf dan angka bukan skala yang sama.
 *
 * Untuk sebuah TABEL di layar, longgar itu salah: menulis "nilai akhir di bawah
 * prediksi" untuk pasangan yang tidak sebanding menyesatkan pembaca. Karena itu
 * di sini ditambahkan syarat skala: keduanya huruf, atau keduanya angka.
 */
function skalaSama(a: string, b: string): boolean {
  const letter = (v: string) => /^[A-Fa-f][+-]?$/.test(v.trim());
  return letter(a) === letter(b);
}

interface PerbandinganNilaiProps {
  /** Semua sesi murid; penyaringan dilakukan di sini supaya aturannya satu tempat. */
  sessions: readonly Session[];
}

/** Satu baris perbandingan yang sudah siap dirender. */
export interface BarisNilai {
  id: string;
  /** Tanggal pendek untuk kolom pertama, mis. "12 Jun". */
  date: string;
  /** Topik atau mapel — konteks ujian apa yang dinilai. */
  konteks: string;
  predicted: string;
  actual: string;
  /** "+1", "-2", "sama", atau `undefined` bila tidak bisa dibandingkan. */
  delta?: string;
  /** `naik` / `turun` / `sama` — hanya diisi bila perbandingannya mungkin. */
  arah?: "naik" | "turun" | "sama";
  /** `true` bila nilai akhir lebih rendah dari prediksi (skala numerik MAUPUN huruf). */
  turun: boolean;
}

/**
 * Menyaring dan menyusun baris perbandingan dari daftar sesi.
 *
 * Dipisah dari komponennya supaya bisa diuji tanpa DOM, dan supaya aturan
 * "sesi mana yang masuk tabel" tidak tersembunyi di dalam JSX.
 *
 * Aturan yang dipakai — dan sengaja TIDAK ditulis ulang di sini:
 *
 * - `gradeDelta` (dari `template/layouts`) menentukan besar selisih pada skala
 *   **numerik**. Ini fungsi yang SAMA dengan yang dipakai laporan bulanan
 *   (`useReportData.ts`), jadi layar dan laporan tidak bisa berbeda angka.
 * - `isGradeLower` (dari `lib/grades`) menangkap skala **huruf**, yang tidak
 *   dibandingkan `gradeDelta` — tetapi hanya setelah dipastikan kedua nilai
 *   sebanding (lihat `skalaSama`).
 * - Sesi tanpa prediksi DAN tanpa nilai akhir tidak masuk tabel: tidak ada yang
 *   bisa dibandingkan.
 */
export function barisPerbandingan(sessions: readonly Session[]): BarisNilai[] {
  return sessions
    .filter((s) => s.status === "DONE")
    .filter((s) => Boolean((s.predictedGrade ?? "").trim() || (s.actualGrade ?? "").trim()))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((s) => {
      const predicted = (s.predictedGrade ?? "").trim();
      const actual = (s.actualGrade ?? "").trim();
      const delta = gradeDelta(predicted, actual);
      // `isGradeLower` hanya dipercaya bila kedua nilai benar-benar sebanding:
      // keduanya ada, bisa dibaca `gradeValue`, dan satu skala. Tanpa syarat ini,
      // "80" vs "B" akan dilaporkan sebagai turun.
      const sebanding =
        Boolean(predicted) && Boolean(actual) &&
        gradeValue(predicted) !== null && gradeValue(actual) !== null &&
        skalaSama(predicted, actual);
      const turun = sebanding && isGradeLower(actual, predicted);
      // Arah dipakai untuk warna. Bila `gradeDelta` tidak bisa membandingkan
      // (skala huruf), arah ditentukan oleh `isGradeLower` saja.
      const arah: BarisNilai["arah"] =
        delta === undefined ? (turun ? "turun" : undefined) :
        delta === "sama" ? "sama" :
        delta.startsWith("+") ? "naik" : "turun";
      return {
        id: s.id,
        date: dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5),
        konteks: (s.topic ?? "").trim() || s.subjects.join(", ") || "Sesi umum",
        predicted,
        actual,
        delta,
        arah,
        turun,
      };
    });
}

/**
 * Tabel prediksi vs nilai akhir — butir 4 G3-06.
 *
 * Ini menutup celah yang lama ada: nilai prediksi dan nilai akhir sudah lama
 * DISIMPAN di tiap sesi dan bisa disunting di modal catatan, tetapi tidak pernah
 * ditampilkan sebagai perbandingan di halaman murid. Yang ada hanya chip di
 * modal detail sesi.
 *
 * Tabel ini TIDAK menghitung apa pun sendiri: seluruh perbandingannya memakai
 * fungsi bersama (lihat `barisPerbandingan`).
 */
export default function PerbandinganNilai({ sessions }: PerbandinganNilaiProps) {
  const [page, setPage] = useState(1);
  const rows = useMemo(() => barisPerbandingan(sessions), [sessions]);
  const safePage = clampPage(page, rows.length);
  const shown = paginateItems(rows, safePage);

  const turunCount = rows.filter((r) => r.turun).length;

  return (
    <section
      aria-labelledby="perbandingan-nilai-title"
      className="bg-[var(--surface-strong)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-2">
        <h2 id="perbandingan-nilai-title" className="font-semibold text-[var(--ink-strong)]">
          Prediksi vs Nilai Akhir
        </h2>
        <span className="text-xs text-[var(--ink-muted)] flex-shrink-0">
          {rows.length} sesi bernilai
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-[var(--ink-muted)] text-center">
          Belum ada sesi dengan prediksi atau nilai akhir. Keduanya diisi saat mencatat sesi,
          dan bisa disunting lewat catatan sesi di tab Sesi.
        </p>
      ) : (
        <>
          <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)]">
            <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
              Selisih dihitung dari sesi yang punya prediksi <em>dan</em> nilai akhir.{" "}
              {turunCount === 0
                ? "Tidak ada sesi yang nilainya di bawah prediksi."
                : `${turunCount} dari ${rows.length} sesi nilainya di bawah prediksi.`}
              {" "}Skala huruf dinilai lebih rendah atau tidak, tanpa selisih angka.
            </p>
          </div>

          <ul className="divide-y divide-[var(--border)] list-none m-0 p-0">
            {shown.map((row) => (
              <li key={row.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--ink-muted)]">{row.date}</p>
                    <p className="text-sm font-medium text-[var(--ink-strong)] mt-0.5 break-words">{row.konteks}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-[var(--ink-muted)]">
                      Prediksi <span className="font-semibold text-[var(--ink-strong)]">{row.predicted || "—"}</span>
                      {" → "}
                      Akhir <span className="font-semibold text-[var(--ink-strong)]">{row.actual || "—"}</span>
                    </p>
                    {row.arah ? (
                      <span
                        className={`mt-1 inline-block text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                          row.arah === "turun"
                            ? "bg-[var(--bg-danger)] text-[var(--ink-danger)]"
                            : row.arah === "naik"
                              ? "bg-[var(--bg-success)] text-[var(--ink-success)]"
                              : "bg-[var(--bg-subtle)] text-[var(--ink-muted)]"
                        }`}
                      >
                        {row.arah === "turun"
                          ? `↓ ${row.delta ?? "di bawah prediksi"}`
                          : row.arah === "naik"
                            ? `↑ ${row.delta}`
                            : "= sama"}
                      </span>
                    ) : (
                      <span className="mt-1 inline-block text-xs text-[var(--ink-muted)]">
                        tidak bisa dibandingkan
                      </span>
                    )}
                  </div>
                </div>
                {row.turun && (
                  <p className="mt-1.5 text-xs text-[var(--ink-attention)]">
                    Nilai akhir di bawah prediksi — refleksi wajib diisi saat menyimpan catatan sesi ini.
                  </p>
                )}
              </li>
            ))}
          </ul>

          <div className="px-4 pb-3">
            <PaginationControls
              page={safePage}
              total={rows.length}
              onPageChange={setPage}
              label="sesi bernilai"
            />
          </div>
        </>
      )}
    </section>
  );
}
