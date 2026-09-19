import { FiMinus, FiPlus, FiSearch, FiX } from "react-icons/fi";
import { cx } from "../lib/cx";
import { formatQty, parseAmount } from "../lib/format";
import styles from "./controls.module.css";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={styles.toggle} onClick={() => onChange(!checked)} />;
}

interface StepperProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
}

export function Stepper({ value, onChange, label, invalid }: StepperProps) {
  const step = (delta: number) => onChange(formatQty(Math.max(0, parseAmount(value) + delta)).replace(/,/g, ""));
  return (
    <div className={cx(styles.stepper, invalid && styles.stepperInvalid)}>
      <button type="button" className={styles.stepButton} aria-label={`Decrease ${label}`} onClick={() => step(-1)}><FiMinus /></button>
      <input
        className={styles.stepInput}
        value={value}
        inputMode="decimal"
        aria-label={label}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" className={styles.stepButton} aria-label={`Increase ${label}`} onClick={() => step(1)}><FiPlus /></button>
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}

export function SearchInput({ value, onChange, placeholder, autoFocus }: SearchInputProps) {
  return (
    <div className={styles.search}>
      <FiSearch className={styles.searchIcon} aria-hidden />
      <input
        className={styles.searchInput}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" className={styles.searchClear} aria-label="Clear search" onClick={() => onChange("")}><FiX /></button>
      )}
    </div>
  );
}
