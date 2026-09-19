import { FiPlus, FiX } from "react-icons/fi";
import { cx } from "../../lib/cx";
import { formatMoney } from "../../lib/format";
import { IconButton } from "../../ui/Button";
import { Stepper } from "../../ui/inputs";
import { lineTotal, type DraftLine } from "./orderDraft";
import styles from "./orders.module.css";

interface LineItemsEditorProps {
  lines: DraftLine[];
  badLines?: Set<string>;
  invalid?: boolean;
  onChange: (key: string, patch: Partial<DraftLine>) => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
}

export function LineItemsEditor({ lines, badLines, invalid, onChange, onRemove, onAdd }: LineItemsEditorProps) {
  return (
    <div className={cx(styles.lines, invalid && styles.linesInvalid)}>
      {lines.map((line) => (
        <div key={line.key} className={styles.line}>
          <div className={styles.lineTop}>
            <div className={styles.lineName}>
              {line.name}
              {line.category && <span>{line.category}</span>}
            </div>
            <IconButton label={`Remove ${line.name}`} icon={<FiX />} bare onClick={() => onRemove(line.key)} />
          </div>
          <div className={styles.lineControls}>
            <label className={styles.priceField}>
              <span aria-hidden>₹</span>
              <input
                value={line.price}
                inputMode="decimal"
                aria-label={`Price for ${line.name}`}
                onChange={(e) => onChange(line.key, { price: e.target.value.replace(/[^\d.]/g, "") })}
                onFocus={(e) => e.target.select()}
              />
              {line.unit && <small>/ {line.unit}</small>}
            </label>
            <Stepper label={`Quantity of ${line.name}`} value={line.qty} invalid={badLines?.has(line.key)} onChange={(qty) => onChange(line.key, { qty })} />
            <div className={cx(styles.lineAmount, "num")}>{formatMoney(lineTotal(line))}</div>
          </div>
        </div>
      ))}
      <button type="button" className={styles.addLine} onClick={onAdd}>
        <FiPlus aria-hidden />
        Add item
      </button>
    </div>
  );
}
