import { useState } from "react";

export type AiNoteStyle = "rapikan" | "perluas" | "ringkas";

const PILIHAN: { id: AiNoteStyle; label: string }[] = [
  { id: "rapikan", label: "Rapikan" },
  { id: "perluas", label: "Perluas" },
  { id: "ringkas", label: "Ringkas" },
];

/**
 * Pemilih gaya Draft AI.
 *
 * Harus punya keadaan sendiri: ia dirender sebagai `extraContent` modal biaya,
 * yang disimpan sekali saat modal dibuka. Tanpa keadaan sendiri, menekan tombol
 * gaya tidak mengubah highlight — dan tutor mengira pilihannya tidak dipakai.
 */
export default function GayaPenulisanPicker({
  nilaiAwal,
  onGanti,
}: {
  nilaiAwal: AiNoteStyle;
  onGanti: (gaya: AiNoteStyle) => void;
}) {
  const [terpilih, setTerpilih] = useState<AiNoteStyle>(nilaiAwal);
  const label = PILIHAN.find((p) => p.id === terpilih)?.label ?? "Rapikan";

  return (
    <div>
      <label className="label">Gaya penulisan</label>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Gaya penulisan">
        {PILIHAN.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={terpilih === p.id}
            onClick={() => {
              setTerpilih(p.id);
              onGanti(p.id);
            }}
            className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
              terpilih === p.id
                ? "bg-[var(--accent-solid)] text-[var(--on-strong)] border-[var(--border-accent)]"
                : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-accent)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
        Akan ditulis dengan gaya <span className="font-semibold text-[var(--ink-strong)]">{label}</span>.
        Gaya dipakai saat menekan OK, Lanjutkan — bukan saat tombol ini diklik.
      </p>
    </div>
  );
}
