import { cx } from "../lib/cx";
import styles from "./controls.module.css";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

export function Segmented<T extends string>({ options, value, onChange, label, className }: SegmentedProps<T>) {
  return (
    <div className={cx(styles.segmented, className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={styles.segment} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && <span className={styles.count}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

interface ChoiceChipsProps<T extends string> {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** One line that scrolls sideways instead of wrapping (for filter rows on phones). */
  scrollable?: boolean;
}

export function ChoiceChips<T extends string>({ options, value, onChange, label, scrollable }: ChoiceChipsProps<T>) {
  return (
    <div className={cx(styles.chips, scrollable && styles.chipsScroll)} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={styles.chip} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && <span className={styles.count}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
