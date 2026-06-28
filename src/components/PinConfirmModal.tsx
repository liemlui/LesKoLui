import { useState } from "react";
import { verifyPin } from "../lib/crypto";
import { getPinLockoutDelay, recordPinFailure, resetPinLockout } from "../lib/pinLockout";
import Modal from "./Modal";

interface Props {
  storedPin: string;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function PinConfirmModal({
  storedPin, title, description, confirmLabel, onCancel, onConfirm,
}: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const delay = getPinLockoutDelay();
    if (delay > 0) {
      setError(`Tunggu ${Math.ceil(delay / 1000)} detik.`);
      return;
    }
    setBusy(true);
    try {
      const ok = await verifyPin(pin, storedPin);
      if (!ok) {
        recordPinFailure();
        setError("PIN salah.");
        return;
      }
      resetPinLockout();
      setError("");
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onCancel} ariaLabel={title}>
      <div>
        <h3 className="font-bold text-lg text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <input
        type="password"
        inputMode="numeric"
        maxLength={6}
        autoFocus
        value={pin}
        onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="input text-center tracking-widest text-xl font-mono"
        placeholder="PIN"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || pin.length !== 6}
          className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm disabled:opacity-40"
        >
          {busy ? "Memeriksa..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
