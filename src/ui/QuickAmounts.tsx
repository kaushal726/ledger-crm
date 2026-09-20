/* "+50 +100 +500 +1000" under a money field: taps add up, so a shopkeeper can build an
 * amount without the keypad. */
import { parseAmount, round2 } from "../lib/format";
import styles from "./quickAmounts.module.css";

const STEPS = [50, 100, 500, 1000];

interface QuickAmountsProps {
  value: string;
  onChange: (value: string) => void;
  steps?: number[];
}

export function QuickAmounts({ value, onChange, steps = STEPS }: QuickAmountsProps) {
  const add = (step: number) => onChange(String(round2(parseAmount(value) + step)));
  return (
    <div className={styles.row}>
      {steps.map((step) => (
        <button key={step} type="button" className={styles.chip} onClick={() => add(step)}>+{step}</button>
      ))}
      {parseAmount(value) > 0 && (
        <button type="button" className={styles.clear} onClick={() => onChange("")}>Clear</button>
      )}
    </div>
  );
}
