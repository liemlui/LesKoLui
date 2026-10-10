import { useMemo, useState } from "react";
import type { Session } from "../../db/types";
import PaginationControls from "../../components/PaginationControls";
import { clampPage, paginateItems } from "../../lib/pagination";
import { barisPerbandingan } from "./perbandinganNilaiRows";

interface PerbandinganNilaiProps {
  /** Semua sesi murid; penyaringan dilakukan di sini supaya aturannya satu tempat. */
  sessions: readonly Session[];
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
