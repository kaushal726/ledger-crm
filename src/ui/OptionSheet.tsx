/* One-choice lists: a tick beside the chosen row, optionally with a count or a note.
 * Used on its own (OptionSheet) and inside the filter sheet (OptionList).
 */
import type { ReactNode } from "react";
import { FiCheck } from "react-icons/fi";
import { Sheet } from "./Sheet";
import styles from "./optionSheet.module.css";

export interface Option {
  value: string;
  label: string;
  /** Second line, e.g. what a report contains. */
  detail?: string;
  /** How many rows this choice would leave, when the screen can say. */
  count?: number;
}

interface OptionListProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

export function OptionList({ label, options, value, onChange }: OptionListProps) {
  return (
    <div className={styles.options} role="listbox" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="option"
          aria-selected={o.value === value}
          className={styles.option}
          onClick={() => onChange(o.value)}
        >
          <span className={styles.text}>
            {o.label}
            {o.detail && <small>{o.detail}</small>}
          </span>
          {o.count !== undefined && <span className={styles.count}>{o.count}</span>}
          {o.value === value && <FiCheck aria-hidden />}
        </button>
      ))}
    </div>
  );
}

interface OptionSheetProps extends OptionListProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
}

/** Picks one option and closes. */
export function OptionSheet({ open, onClose, title, label, options, value, onChange }: OptionSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <OptionList
        label={label}
        options={options}
        value={value}
        onChange={(next) => {
          onChange(next);
          onClose();
        }}
      />
    </Sheet>
  );
}
