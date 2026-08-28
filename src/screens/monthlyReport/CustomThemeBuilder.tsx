/**
 * Builder tema kustom untuk laporan — dipecah dari MonthlyReport.tsx.
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

const HEADER_STYLES: Array<{ id: HeaderStyle; name: string }> = [
  { id: "bubble", name: "Bubble" }, { id: "script", name: "Script" }, { id: "plain", name: "Plain" },
  { id: "frame", name: "Frame" }, { id: "minimal", name: "Minimal" }, { id: "badge", name: "Badge" }, { id: "watercolor", name: "Watercolor" },
];
const LABEL_STYLES: Array<{ id: LabelStyle; name: string }> = [
  { id: "pill", name: "Pill" }, { id: "rounded", name: "Rounded" }, { id: "flag", name: "Flag" },
  { id: "tag", name: "Tag" }, { id: "underline", name: "Underline" }, { id: "ribbon-label", name: "Ribbon" },
];
const PHOTO_STYLES: Array<{ id: PhotoStyle; name: string }> = [
  { id: "round", name: "Round" }, { id: "circle", name: "Circle" }, { id: "polaroid", name: "Polaroid" },
  { id: "shadow", name: "Shadow" }, { id: "frame", name: "Frame" }, { id: "vintage", name: "Vintage" }, { id: "duotone", name: "Duotone" },
];
const DECO_KINDS: Array<{ id: DecoKind; name: string }> = [
  { id: "none", name: "None" }, { id: "snow", name: "Snow" }, { id: "leaf", name: "Leaf" }, { id: "petal", name: "Petal" },
  { id: "sparkle", name: "Sparkle" }, { id: "star", name: "Star" }, { id: "wave", name: "Wave" }, { id: "sun", name: "Sun" },
  { id: "geometric", name: "Geometric" }, { id: "dots", name: "Dots" },
  { id: "confetti", name: "Confetti" },
  { id: "ribbon", name: "Ribbon" }, { id: "zigzag", name: "Zigzag" },
];

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
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
      <p className="font-bold text-gray-800 text-sm">🎨 Custom Theme Builder</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="mr-nama-tema" className="label">Nama Tema</label>
          <input id="mr-nama-tema" className="input text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-header-text" className="label">Header Text</label>
          <input id="mr-header-text" className="input text-sm" value={headerText} onChange={(e) => setHeaderText(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-bg" className="label">Background</label>
          <input id="mr-bg" type="color" className="w-full h-8 rounded cursor-pointer" value={bg} onChange={(e) => setBg(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-accent" className="label">Accent</label>
          <input id="mr-accent" type="color" className="w-full h-8 rounded cursor-pointer" value={accent} onChange={(e) => setAccent(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-ink" className="label">Ink (teks)</label>
          <input id="mr-ink" type="color" className="w-full h-8 rounded cursor-pointer" value={ink} onChange={(e) => setInk(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-muted" className="label">Muted (sekunder)</label>
          <input id="mr-muted" type="color" className="w-full h-8 rounded cursor-pointer" value={muted} onChange={(e) => setMuted(e.target.value)} />
        </div>
      </div>

      {/* Style selectors */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="mr-header-style" className="label">Header Style</label>
          <select id="mr-header-style" className="input text-sm" value={header} onChange={(e) => setHeader(e.target.value as HeaderStyle)}>
            {HEADER_STYLES.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mr-label-style" className="label">Label Style</label>
          <select id="mr-label-style" className="input text-sm" value={label} onChange={(e) => setLabel(e.target.value as LabelStyle)}>
            {LABEL_STYLES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mr-photo-style" className="label">Photo Style</label>
          <select id="mr-photo-style" className="input text-sm" value={photo} onChange={(e) => setPhoto(e.target.value as PhotoStyle)}>
            {PHOTO_STYLES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mr-deco" className="label">Decoration</label>
          <select id="mr-deco" className="input text-sm" value={deco} onChange={(e) => setDeco(e.target.value as DecoKind)}>
            {DECO_KINDS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mr-font-display" className="label">Display Font</label>
          <select id="mr-font-display" className="input text-sm" value={fontDisplay} onChange={(e) => setFontDisplay(e.target.value)}>
            {FONTS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mr-font-body" className="label">Body Font</label>
          <select id="mr-font-body" className="input text-sm" value={fontBody} onChange={(e) => setFontBody(e.target.value)}>
            {FONTS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {/* Palette */}
      <div>
        <label className="label">Palette (4 warna)</label>
        <div className="flex gap-2">
          {palette.map((c, i) => (
            <input key={i} type="color" aria-label={`Warna palet ${i + 1}`} className="w-full h-8 rounded cursor-pointer" value={c}
              onChange={(e) => { const p = [...palette]; p[i] = e.target.value; setPalette(p); }} />
          ))}
        </div>
      </div>

      {/* Preview mini */}
      <div className="rounded-xl overflow-hidden border border-gray-200">
        <div style={{ background: bg, padding: "12px 10px", fontFamily: fontBody, color: ink }}>
          <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 18, color: accent, textAlign: "center" }}>
            {headerText}
          </div>
          <div style={{ textAlign: "center", fontSize: 11, marginTop: 2, color: muted }}>
            Preview · {name}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {palette.map((c, i) => (
              <div key={i} style={{ flex: 1, height: 20, borderRadius: 6, background: c }} />
            ))}
          </div>
        </div>
      </div>

      <button className="btn btn-primary w-full text-sm" onClick={save}>💾 Simpan Tema Kustom</button>
    </div>
  );
}
