/* Shows its children only after the PIN has been entered in this session. */
import { useId, useState, type ReactNode } from "react";
import { FiLock } from "react-icons/fi";
import { Button, IconButton } from "../ui/Button";
import { PIN_LENGTH, lock, unlockWithPin, useUnlocked } from "./pinLock";
import styles from "./pinGate.module.css";

export function PinGate({ children }: { children: ReactNode }) {
  return useUnlocked() ? <>{children}</> : <PinPrompt />;
}

function PinPrompt() {
  const inputId = useId();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const submit = async (value: string) => {
    if (value.length !== PIN_LENGTH || checking) return;
    setChecking(true);
    const ok = await unlockWithPin(value);
    setChecking(false);
    if (!ok) {
      setError(true);
      setPin("");
    }
  };

  const change = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, PIN_LENGTH);
    setPin(digits);
    setError(false);
    if (digits.length === PIN_LENGTH) void submit(digits);
  };

  return (
    <form className={styles.gate} onSubmit={(e) => { e.preventDefault(); void submit(pin); }}>
      <div className={styles.icon} aria-hidden><FiLock /></div>
      <h2 className={styles.title}>This section is locked</h2>
      <label className={styles.hint} htmlFor={inputId}>Enter the {PIN_LENGTH}-digit PIN to continue</label>
      <input
        id={inputId}
        className={styles.pin}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={PIN_LENGTH}
        value={pin}
        onChange={(e) => change(e.target.value)}
        aria-invalid={error || undefined}
        autoFocus
      />
      <p className={styles.error} role="alert">{error ? "Incorrect PIN. Try again." : ""}</p>
      <Button type="submit" variant="primary" block disabled={pin.length !== PIN_LENGTH || checking}>Unlock</Button>
    </form>
  );
}

/** Header button to lock again, e.g. before handing the phone to someone. */
export function LockButton() {
  const unlocked = useUnlocked();
  return unlocked ? <IconButton label="Lock" icon={<FiLock />} onClick={lock} /> : null;
}
