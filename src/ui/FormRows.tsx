/* Settings-style grouped rows used in forms: "Customer   Ramesh Sharma   Change". */
import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import styles from "./formRows.module.css";

export function FormGroup({ children, invalid }: { children: ReactNode; invalid?: boolean }) {
  return <div className={cx(styles.group, invalid && styles.invalid)}>{children}</div>;
}

interface PickRowProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  placeholder: string;
  actionLabel?: string;
  onClick: () => void;
}

export function PickRow({ label, value, detail, placeholder, actionLabel = "Change", onClick }: PickRowProps) {
  return (
    <button type="button" className={styles.row} onClick={onClick}>
      <span className={styles.key}>{label}</span>
      <span className={styles.value}>
        {value || <span className={styles.placeholder}>{placeholder}</span>}
        {value && detail && <small className={styles.detail}>{detail}</small>}
      </span>
      <span className={styles.action}>{value ? actionLabel : "Choose"}</span>
    </button>
  );
}

type InputRowProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function InputRow({ label, value, onChange, ...rest }: InputRowProps) {
  return (
    <label className={styles.row}>
      <span className={styles.key}>{label}</span>
      <input className={styles.input} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </label>
  );
}

export function FormError({ children }: { children?: string }) {
  return children ? <p className={styles.error} role="alert">{children}</p> : null;
}

export function FormLabel({ children }: { children: ReactNode }) {
  return <div className={styles.label}>{children}</div>;
}
