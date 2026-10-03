import { memo } from "react";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}

function Toggle({ checked, onChange, disabled, label }: Props) {
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
        className={`relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--border-brand)] focus:ring-offset-2 ${
          disabled ? "bg-[var(--bg-subtle)] cursor-not-allowed" : checked ? "bg-[var(--brand-solid)] cursor-pointer" : "bg-[var(--bg-subtle)] cursor-pointer"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--surface-strong)] shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </button>
    </>
  );
}

export default memo(Toggle);
