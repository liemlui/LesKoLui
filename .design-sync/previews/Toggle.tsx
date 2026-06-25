import { Toggle } from "les-ko-lui";

export function Unchecked() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
      <Toggle checked={false} onChange={() => {}} />
      <span style={{ fontSize: 14, color: "#6b7280" }}>Mati</span>
    </div>
  );
}

export function Checked() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
      <Toggle checked={true} onChange={() => {}} />
      <span style={{ fontSize: 14, color: "#374151" }}>Aktif</span>
    </div>
  );
}

export function WithLabel() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
      <Toggle checked={true} onChange={() => {}} label="Aktifkan AI" />
      <span style={{ fontSize: 14, color: "#374151" }}>Aktifkan AI</span>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
      <Toggle checked={false} onChange={() => {}} disabled />
      <span style={{ fontSize: 14, color: "#9ca3af" }}>Dinonaktifkan</span>
    </div>
  );
}
