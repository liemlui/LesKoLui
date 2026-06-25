import { SignaturePad } from "les-ko-lui";

export function Default() {
  return (
    <div style={{ padding: 16, maxWidth: 400 }}>
      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Tanda tangan murid</p>
      <SignaturePad onSave={() => {}} onClear={() => {}} />
    </div>
  );
}
