import { PERIOD_LABELS, type PeriodPreset } from "../../data/periods";
import type { DateRange } from "../../data/stats";
import { todayISO } from "../../lib/dates";
import { TextField } from "../../ui/Field";
import { ChoiceChips } from "../../ui/Segmented";
import styles from "./reports.module.css";

const PRESETS: PeriodPreset[] = ["today", "week", "month", "lastMonth", "all", "custom"];

interface PeriodPickerProps {
  preset: PeriodPreset;
  custom: DateRange;
  onPreset: (preset: PeriodPreset) => void;
  onCustom: (range: DateRange) => void;
}

export function PeriodPicker({ preset, custom, onPreset, onCustom }: PeriodPickerProps) {
  return (
    <div className={styles.block}>
      <ChoiceChips label="Period" value={preset} onChange={onPreset} options={PRESETS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))} />
      {preset === "custom" && (
        <div className={styles.customRange}>
          <TextField label="From" type="date" value={custom.from} max={custom.to || todayISO()} onChange={(from) => onCustom({ ...custom, from })} />
          <TextField label="To" type="date" value={custom.to} min={custom.from} onChange={(to) => onCustom({ ...custom, to })} />
        </div>
      )}
    </div>
  );
}
