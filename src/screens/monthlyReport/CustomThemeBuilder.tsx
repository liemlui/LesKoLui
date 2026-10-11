/**
 * Perancang tema kustom untuk laporan — dipecah dari MonthlyReport.tsx.
 *
 * G3-08 langkah 1: seluruh istilah di panel ini diterjemahkan ke bahasa Indonesia,
 * dan opsi bentuk gambar diberi label Indonesia **beserta contoh warnanya**
 * (sebelumnya "Round", "Pill", "Snow", dst. tanpa petunjuk visual apa pun).
 *
 * Nama opsi berasal dari `template/types.ts` dan TIDAK diubah — yang berubah
 * hanya tulisannya di antarmuka. Kunci penyimpanan tema tetap sama, sehingga tema
 * kustom yang sudah tersimpan di perangkat tutor tetap terbaca.
 */

import { useState } from "react";
import type { HeaderStyle, LabelStyle, PhotoStyle, DecoKind, CustomTheme } from "../../template/types";

const FONTS = [
  { id: "'Fredoka', sans-serif", name: "Fredoka" },
  { id: "'Baloo 2', sans-serif", name: "Baloo 2" },
  { id: "'Pacifico', cursive", name: "Pacifico" },
  { id: "'Poppins', sans-serif", name: "Poppins" },
  { id: "'Nunito', sans-serif", name: "Nunito" },
  { id: "'Quicksand', sans-serif", name: "Quicksand" },
  { id: "'Comfortaa', sans-serif", name: "Comfortaa" },
  { id: "'Caveat', cursive", name: "Caveat" },
];

/** Satu pilihan bentuk: kunci aslinya + tulisan Indonesia + contoh warna. */
interface PilihanBentuk<T extends string> {
  id: T;
  nama: string;
  /** Dua-tiga huruf untuk lencana contoh warna; selalu huruf kecil. */
  singkat: string;
  /** Contoh warna yang mewakili hasilnya di laporan. */
  warna: string;
}

const HEADER_STYLES: Array<PilihanBentuk<HeaderStyle>> = [
  { id: "bubble",     nama: "Balon",              singkat: "bal", warna: "#4d7fd0" },
  { id: "script",     nama: "Tulisan sambung",    singkat: "sam", warna: "#7a5fd0" },
  { id: "plain",      nama: "Polos",              singkat: "pol", warna: "#2c3e50" },
  { id: "frame",      nama: "Bingkai",            singkat: "big", warna: "#e0892f" },
  { id: "minimal",    nama: "Minimalis",          singkat: "min", warna: "#1f2937" },
  { id: "badge",      nama: "Lencana",            singkat: "len", warna: "#c43f93" },
  { id: "watercolor", nama: "Cat air",            singkat: "air", warna: "#9c7cec" },
];

const LABEL_STYLES: Array<PilihanBentuk<LabelStyle>> = [
  { id: "pill",         nama: "Kapsul",          singkat: "kap", warna: "#54b08a" },
  { id: "rounded",      nama: "Sudut bulat",     singkat: "bul", warna: "#3f8f3f" },
  { id: "flag",         nama: "Bendera",         singkat: "ben", warna: "#e7b24a" },
  { id: "tag",          nama: "Label gantung",   singkat: "gan", warna: "#e8a83f" },
  { id: "underline",    nama: "Garis bawah",     singkat: "gar", warna: "#37506b" },
  { id: "ribbon-label", nama: "Pita",            singkat: "pit", warna: "#e8603f" },
];

const PHOTO_STYLES: Array<PilihanBentuk<PhotoStyle>> = [
  { id: "round",    nama: "Sudut bulat",        singkat: "bul", warna: "#4d7fd0" },
  { id: "circle",   nama: "Bulat penuh",        singkat: "bup", warna: "#2f9488" },
  { id: "polaroid", nama: "Polaroid",           singkat: "pol", warna: "#f4f6f8" },
  { id: "shadow",   nama: "Bayangan",           singkat: "bay", warna: "#8596a6" },
  { id: "frame",    nama: "Bingkai warna",      singkat: "bin", warna: "#e0892f" },
  { id: "vintage",  nama: "Klasik sepia",       singkat: "sep", warna: "#b07d3f" },
  { id: "duotone",  nama: "Warna ganda",        singkat: "dua", warna: "#7a5fd0" },
];

const DECO_KINDS: Array<PilihanBentuk<DecoKind>> = [
  { id: "none",      nama: "Tanpa hiasan",      singkat: "tan", warna: "#cbd5e1" },
  { id: "snow",      nama: "Salju",             singkat: "sal", warna: "#8ec9f0" },
  { id: "leaf",      nama: "Daun",              singkat: "dau", warna: "#54b08a" },
  { id: "petal",     nama: "Kelopak",           singkat: "kel", warna: "#e86a93" },
  { id: "sparkle",   nama: "Kilau",             singkat: "kil", warna: "#e7b24a" },
  { id: "star",      nama: "Bintang",           singkat: "bin", warna: "#7a5fd0" },
  { id: "wave",      nama: "Gelombang",         singkat: "gel", warna: "#2f8e9e" },
  { id: "sun",       nama: "Matahari",          singkat: "mat", warna: "#e8a83f" },
  { id: "geometric", nama: "Bentuk geometris",  singkat: "geo", warna: "#39ff14" },
  { id: "dots",      nama: "Titik-titik",       singkat: "tit", warna: "#9c7cec" },
  { id: "confetti",  nama: "Konfeti",           singkat: "kon", warna: "#e8879e" },
  { id: "ribbon",    nama: "Pita",              singkat: "pit", warna: "#c4843f" },
  { id: "zigzag",    nama: "Zig-zag",           singkat: "zig", warna: "#ff6bb5" },
];

/** Lencana contoh warna: kotak kecil berwarna + singkatan tulisannya. */
function ContohBentuk({ warna, singkat }: { warna: string; singkat: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-[10px] font-bold"
      style={{ background: warna, color: "#1f2937" }}
    >
      {singkat}
    </span>
  );
}

/**
 * Satu kelompok pilihan bentuk: `<select>` yang ramah pembaca layar **dan** daftar
 * contoh warna di bawahnya. Pemilih bawaan peramban tidak bisa menampilkan warna,
 * jadi kedua-duanya dipakai — bukan salah satu.
 */
function PilihanGrup<T extends string>({
  id, label, bantuan, nilai, opsi, onChange,
}: {
  id: string;
  label: string;
  bantuan: string;
  nilai: T;
  opsi: ReadonlyArray<PilihanBentuk<T>>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="col-span-2 min-w-0">
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} className="input text-sm" value={nilai} onChange={(e) => onChange(e.target.value as T)}>
        {opsi.map((o) => <option key={o.id} value={o.id}>{o.nama}</option>)}
      </select>
      <div className="mt-1.5 flex flex-wrap gap-1" aria-hidden="true">
        {opsi.map((o) => (
          <span key={o.id} className="inline-flex items-center gap-1 rounded-lg px-1 py-0.5 text-[10px] text-[var(--ink-muted)]">
            <ContohBentuk warna={o.warna} singkat={o.singkat} />
            {o.nama}
          </span>
        ))}
      </div>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">{bantuan}</p>
    </div>
  );
}

export function CustomThemeBuilder({ onSave }: {
  onSave: (ct: CustomTheme) => void;
}) {
  const [name, setName] = useState("TemaKu");
  const [bg, setBg] = useState("#f0f4ff");
  const [ink, setInk] = useState("#1a2a4a");
  const [muted, setMuted] = useState("#6b7a99");
  const [accent, setAccent] = useState("#4d7fd0");
  const [palette, setPalette] = useState(["#4d7fd0", "#e0892f", "#54b08a", "#d9605f"]);
  const [fontDisplay, setFontDisplay] = useState("'Fredoka', sans-serif");
  const [fontBody, setFontBody] = useState("'Nunito', sans-serif");
  const [header, setHeader] = useState<HeaderStyle>("bubble");
  const [label, setLabel] = useState<LabelStyle>("pill");
  const [photo, setPhoto] = useState<PhotoStyle>("round");
  const [deco, setDeco] = useState<DecoKind>("none");
  const [headerText, setHeaderText] = useState("ABSENSI");

  const save = () => {
    onSave({
      id: `custom-${Date.now()}`, name: name || "TemaKu", bg, ink, muted, accent, palette,
      fontDisplay, fontBody, header, label, photo, deco, headerText,
    });
  };

  return (
    <div className="bg-[var(--surface-strong)] rounded-2xl p-4 shadow-sm border border-[var(--border)] space-y-3">
      <p className="font-bold text-[var(--ink-strong)] text-sm">🎨 Perancang Tema Kustom</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="mr-nama-tema" className="label">Nama tema</label>
          <input id="mr-nama-tema" className="input text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-header-text" className="label">Teks judul</label>
          <input id="mr-header-text" className="input text-sm" value={headerText} onChange={(e) => setHeaderText(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-bg" className="label">Warna latar</label>
          <input id="mr-bg" type="color" className="w-full h-8 rounded cursor-pointer" value={bg} onChange={(e) => setBg(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-accent" className="label">Warna aksen</label>
          <input id="mr-accent" type="color" className="w-full h-8 rounded cursor-pointer" value={accent} onChange={(e) => setAccent(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-ink" className="label">Warna teks</label>
          <input id="mr-ink" type="color" className="w-full h-8 rounded cursor-pointer" value={ink} onChange={(e) => setInk(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-muted" className="label">Warna teks sekunder</label>
          <input id="mr-muted" type="color" className="w-full h-8 rounded cursor-pointer" value={muted} onChange={(e) => setMuted(e.target.value)} />
        </div>
      </div>

      {/* Pilihan bentuk */}
      <div className="grid grid-cols-2 gap-2">
        <PilihanGrup
          id="mr-header-style" label="Bentuk judul"
          bantuan="Tampilan tulisan judul di kepala halaman."
          nilai={header} opsi={HEADER_STYLES} onChange={setHeader}
        />
        <PilihanGrup
          id="mr-label-style" label="Bentuk label"
          bantuan="Bentuk penanda kecil pada tiap sesi (tanggal, mapel)."
          nilai={label} opsi={LABEL_STYLES} onChange={setLabel}
        />
        <PilihanGrup
          id="mr-photo-style" label="Bentuk foto"
          bantuan="Cara foto sesi dipotong dan dibingkai. Contoh warna menunjukkan nada hasilnya."
          nilai={photo} opsi={PHOTO_STYLES} onChange={setPhoto}
        />
        <PilihanGrup
          id="mr-deco" label="Hiasan"
          bantuan="Motif latar halaman. Pilih “Tanpa hiasan” untuk laporan formal."
          nilai={deco} opsi={DECO_KINDS} onChange={setDeco}
        />
        <div>
          <label htmlFor="mr-font-display" className="label">Jenis huruf judul</label>
          <select id="mr-font-display" className="input text-sm" value={fontDisplay} onChange={(e) => setFontDisplay(e.target.value)}>
            {FONTS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mr-font-body" className="label">Jenis huruf isi</label>
          <select id="mr-font-body" className="input text-sm" value={fontBody} onChange={(e) => setFontBody(e.target.value)}>
            {FONTS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {/* Warna palet */}
      <div>
        <label className="label">Warna palet (4 warna)</label>
        <div className="flex gap-2">
          {palette.map((c, i) => (
            <input key={i} type="color" aria-label={`Warna palet ${i + 1}`} className="w-full h-8 rounded cursor-pointer" value={c}
              onChange={(e) => { const p = [...palette]; p[i] = e.target.value; setPalette(p); }} />
          ))}
        </div>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">Empat warna ini dipakai bergiliran untuk label tiap sesi.</p>
      </div>

      {/* Pratinjau kecil */}
      <div className="rounded-xl overflow-hidden border border-[var(--border)]">
        <div style={{ background: bg, padding: "12px 10px", fontFamily: fontBody, color: ink }}>
          <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 18, color: accent, textAlign: "center" }}>
            {headerText}
          </div>
          <div style={{ textAlign: "center", fontSize: 11, marginTop: 2, color: muted }}>
            Pratinjau · {name}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {palette.map((c, i) => (
              <div key={i} style={{ flex: 1, height: 20, borderRadius: 6, background: c }} />
            ))}
          </div>
        </div>
      </div>

      <button className="btn btn-primary w-full text-sm" onClick={save}>Simpan Tema Kustom</button>
    </div>
  );
}
