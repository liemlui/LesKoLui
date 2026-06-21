interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export default function Toggle({ checked, onChange, disabled, label }: Props) {
  const id = label ? `toggle-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined;
  return (
    <>
      {label && <span id={id} className="sr-only">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          backgroundColor: disabled ? "#e5e7eb" : checked ? "#3b82f6" : "#d1d5db",
          position: "relative",
          flexShrink: 0,
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background-color 0.2s ease",
          outline: "none",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: "white",
            boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            transition: "left 0.2s ease",
          }}
        />
      </button>
    </>
  );
}
