/**
 * Render markdown ringan yang dipakai fitur catatan (bold **...**, baris baru).
 * Sengaja TIDAK memakai dangerouslySetInnerHTML — output AI/ketikan user tetap
 * dirender sebagai teks React sehingga aman dari injeksi HTML.
 */
export function SimpleMarkdown({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.split(/\r?\n/);
  return (
    <div className={className}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" aria-hidden="true" />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        return (
          <p key={i} className="m-0 leading-relaxed">
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
                <strong key={j}>{part.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}
