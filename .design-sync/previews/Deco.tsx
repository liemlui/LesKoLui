import { Deco } from "les-ko-lui";

function DecoBox({ kind, label }: { kind: string; label: string }) {
  return (
    <div style={{ position: "relative", width: 80, height: 100, background: "#3b82f6", borderRadius: 12, display: "inline-block", margin: 8 }}>
      <Deco kind={kind as any} />
      <span style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.8)" }}>{label}</span>
    </div>
  );
}

export function Semua_Jenis() {
  return (
    <div style={{ padding: 16, display: "flex", flexWrap: "wrap" }}>
      <DecoBox kind="snow" label="snow" />
      <DecoBox kind="leaf" label="leaf" />
      <DecoBox kind="petal" label="petal" />
      <DecoBox kind="sparkle" label="sparkle" />
      <DecoBox kind="star" label="star" />
      <DecoBox kind="wave" label="wave" />
      <DecoBox kind="sun" label="sun" />
    </div>
  );
}
