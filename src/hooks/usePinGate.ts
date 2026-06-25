import { useState, useCallback } from "react";
import { verifyPin } from "../lib/crypto";
import { getPinLockoutDelay, recordPinFailure, resetPinLockout } from "../lib/pinLockout";

export type PinGateState = {
  /** Current PIN input value */
  pinInput: string;
  /** Error message to show (empty = no error) */
  pinError: string;
  /** Whether the gate is unlocked */
  unlocked: boolean;
  /** Set the PIN input value */
  setPinInput: (v: string) => void;
  /** Set the error message */
  setPinError: (v: string) => void;
  /** Attempt to verify the PIN against the stored hash */
  attemptPin: (storedPin: string) => Promise<boolean>;
  /** Reset PIN state back to locked with cleared input */
  resetPin: () => void;
};

/**
 * Hook for PIN verification with exponential-backoff lockout protection.
 *
 * Usage (modal pattern):
 *   const pin = usePinGate();
 *   const handleConfirm = async () => {
 *     if (await pin.attemptPin(settings.financialPin)) {
 *       // execute dangerous action
 *       pin.resetPin();
 *     }
 *   };
 *   // render: <input value={pin.pinInput} onChange={(e) => pin.setPinInput(...)} />
 *   //         {pin.pinError && <p>{pin.pinError}</p>}
 *
 * Usage (gate pattern — whole screen locked):
 *   const pin = usePinGate();
 *   if (settings.financialPin && !pin.unlocked) {
 *     return <YourPinGateScreen ... />;
 *   }
 */
export function usePinGate(): PinGateState {
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const attemptPin = useCallback(async (storedPin: string): Promise<boolean> => {
    const delay = getPinLockoutDelay();
    if (delay > 0) {
      setPinError(`Tunggu ${Math.ceil(delay / 1000)} detik.`);
      return false;
    }
    const ok = await verifyPin(pinInput, storedPin);
    if (!ok) {
      recordPinFailure();
      setPinError("PIN salah.");
      return false;
    }
    resetPinLockout();
    setUnlocked(true);
    setPinError("");
    return true;
  }, [pinInput]);

  const resetPin = useCallback(() => {
    setPinInput("");
    setPinError("");
    setUnlocked(false);
  }, []);

  return {
    pinInput,
    pinError,
    unlocked,
    setPinInput,
    setPinError,
    attemptPin,
    resetPin,
  };
}
