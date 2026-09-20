import type { DateRange } from "../../data/stats";
import { todayISO } from "../../lib/dates";
import { TextField } from "../../ui/Field";
import styles from "./reports.module.css";

/** The two date fields shown when the period is "Custom". */
export function CustomRange({ range, onChange }: { range: DateRange; onChange: (range: DateRange) => void }) {
  return (
    <div className={styles.customRange}>
      <TextField label="From" type="date" value={range.from} max={range.to || todayISO()} onChange={(from) => onChange({ ...range, from })} />
      <TextField label="To" type="date" value={range.to} min={range.from} onChange={(to) => onChange({ ...range, to })} />
    </div>
  );
}
