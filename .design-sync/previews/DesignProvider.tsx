import { DesignProvider } from "les-ko-lui";

export function Router_Wrapper() {
  return (
    <DesignProvider>
      <div style={{ padding: 24, fontFamily: "sans-serif", color: "#374151" }}>
        <p style={{ fontSize: 14, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px" }}>
          ✓ MemoryRouter aktif — komponen screen bisa gunakan useNavigate & useParams
        </p>
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
          DesignProvider membungkus semua preview dengan MemoryRouter.
        </p>
      </div>
    </DesignProvider>
  );
}
