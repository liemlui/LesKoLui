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
        className={`relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          disabled ? "bg-gray-200 cursor-not-allowed" : checked ? "bg-blue-500 cursor-pointer" : "bg-gray-300 cursor-pointer"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </button>
    </>
  );
}

export default memo(Toggle);
