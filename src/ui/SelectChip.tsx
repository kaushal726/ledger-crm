/* Compact filter/sort control: "Sort: Highest due ▾" — opens a sheet with the choices. */
import { useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import { cx } from "../lib/cx";
import { Sheet } from "./Sheet";
import styles from "./selectChip.module.css";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectChipProps<T extends string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  /** Value treated as "no filter"; the chip is highlighted when anything else is chosen. */
  defaultValue?: T;
}

export function SelectChip<T extends string>({ label, value, options, onChange, defaultValue = options[0]?.value }: SelectChipProps<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <>
      <button type="button" className={cx(styles.chip, value !== defaultValue && styles.active)} onClick={() => setOpen(true)}>
        <span className={styles.label}>{label}:</span>
        <span className={styles.value}>{current?.label}</span>
        <FiChevronDown aria-hidden />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <div className={styles.options} role="listbox" aria-label={label}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={styles.option}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              <span>{o.label}</span>
              {o.value === value && <FiCheck aria-hidden />}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
