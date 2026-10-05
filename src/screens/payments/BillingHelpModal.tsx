import Modal from "../../components/Modal";

/**
 * Panel bantuan "Cara Kerja Tagihan" (TASK-10 / K-03 K-05 konteks).
 *
 * Diekstraksi dari `TagihanTab.tsx` pada refactor terbatas G3-02 (Q9/A13) tanpa
 * perubahan perilaku maupun teks. Isinya **seluruhnya statis** — tidak ada state,
 * tidak ada data tagihan — sehingga aman dipisah: satu-satunya propnya `onClose`.
 *
 * Kalau salah satu kalimat di sini berubah, periksa juga `useInvoiceFilters.ts`
 * dan `paymentRepo.ts`: panel ini menjelaskan perilaku yang ditegakkan di sana
 * (paket per N pertemuan, tagihan penutup, laporan final → invoice, filter
 * memengaruhi ekspor).
 */
export default function BillingHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} ariaLabel="Cara kerja tagihan" showCloseButton={false}
      panelClassName="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-[var(--surface-strong)] shadow-xl sm:rounded-2xl outline-none">
      <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--ink-strong)]">Cara Kerja Tagihan</h2>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">Cara menagih murid sesuai siklusnya.</p>
        </div>
        <button onClick={onClose} aria-label="Tutup"
          className="text-xl leading-none text-[var(--ink-muted)] hover:text-[var(--ink-strong)]">✕</button>
      </div>

      <div className="space-y-4 overflow-y-auto px-5 py-4 text-sm text-[var(--ink-strong)]">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Tagihan per Pertemuan (Paket)</h3>
          <ul className="mt-2 space-y-2 text-xs leading-relaxed">
            <li>Untuk murid <strong>Paket per N pertemuan</strong> (8, 10, 12, dst).</li>
            <li>Antrean lintas bulan — sesi <strong>tertua</strong> ditagih lebih dulu.</li>
            <li>Tombol <strong>Terbitkan Paket</strong> membuat invoice + laporan sekaligus untuk N sesi penuh.</li>
            <li>Sisa yang belum genap: <strong>Tagihan Penutup</strong> (muncul saat peralihan kebijakan) menagih sisa 1–N-1 sesi.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Bulanan</h3>
          <ul className="mt-2 space-y-2 text-xs leading-relaxed">
            <li>Murid <strong>Bulanan</strong> — finalkan Laporan Perkembangan, lalu terbitkan invoice dari langkah <strong>Siap ditagih</strong>.</li>
            <li>Daftar tagihan lintas bulan — semua invoice tampil tanpa perlu memilih bulan.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Laporan Perkembangan</h3>
          <ul className="mt-2 space-y-2 text-xs leading-relaxed">
            <li>Laporan yang sudah <strong>final</strong> tetapi belum punya invoice muncul di langkah <strong>Siap ditagih</strong>.</li>
            <li><strong>Terbitkan Invoice</strong> membuat tagihan dari nominal dan periode belajar pada laporan tersebut.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Manual & Filter</h3>
          <ul className="mt-2 space-y-2 text-xs leading-relaxed">
            <li><strong>Manual</strong> — buat tagihan nominal bebas tanpa mengambil atau menampilkan sesi.</li>
            <li>Filter <strong>Status</strong> dan <strong>Asal invoice</strong> menyaring daftar serta hasil ekspor CSV/PDF.</li>
          </ul>
        </section>
      </div>

      <div className="border-t border-[var(--border)] px-5 py-3">
        <button onClick={onClose}
          className="w-full rounded-xl bg-[var(--accent-solid)] py-2.5 text-sm font-bold text-[var(--on-strong)] transition-colors hover:bg-[var(--accent-solid)]">
          Mengerti
        </button>
      </div>
    </Modal>
  );
}
