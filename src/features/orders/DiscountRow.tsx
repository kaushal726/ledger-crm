import { useId } from "react";
import type { DiscountType } from "../../data/types";
import { formatMoney } from "../../lib/format";
import { Segmented } from "../../ui/Segmented";
import styles from "./orders.module.css";

interface DiscountRowProps {
  value: string;
  type: DiscountType;
  /** What the discount comes to in rupees, already capped at the subtotal. */
  amount: number;
  subtotal: number;
  onValue: (value: string) => void;
  onType: (type: DiscountType) => void;
}

const TYPES: { value: DiscountType; label: string }[] = [{ value: "amount", label: "₹" }, { value: "percent", label: "%" }];

/** "Discount [ 5 ] [₹|%]" with a line showing what it takes off the bill. */
export function DiscountRow({ value, type, amount, subtotal, onValue, onType }: DiscountRowProps) {
  const id = useId();
  return (
    <div className={styles.discount}>
      <div className={styles.discountRow}>
        <label className={styles.discountLabel} htmlFor={id}>Discount</label>
        <input
          id={id}
          className={styles.discountInput}
          value={value}
          inputMode="decimal"
          placeholder="0"
          onChange={(e) => onValue(e.target.value.replace(/[^\d.]/g, ""))}
        />
        <Segmented label="Discount type" className={styles.discountType} options={TYPES} value={type} onChange={onType} />
      </div>
      {amount > 0 && <p className={`${styles.discountHint} num`}>− {formatMoney(amount)} off {formatMoney(subtotal)}</p>}
    </div>
  );
}
