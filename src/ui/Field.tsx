import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cx } from "../lib/cx";
import styles from "./Field.module.css";

interface FieldProps {
  label: string;
  htmlFor?: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, optional, hint, error, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
        {optional && <span className={styles.optional}> (optional)</span>}
      </label>
      {children}
      {error ? <p className={styles.error} role="alert">{error}</p> : hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  /** Shown inside the field, e.g. "₹". */
  prefix?: string;
};

export function TextField({ label, value, onChange, optional, hint, error, prefix, className, ...rest }: TextFieldProps) {
  const id = useId();
  const input = (
    <input
      id={id}
      className={cx(styles.input, error && styles.invalid, className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? true : undefined}
      {...rest}
    />
  );
  return (
    <Field label={label} htmlFor={id} optional={optional} hint={hint} error={error}>
      {prefix ? <div className={styles.prefixWrap}><span className={styles.prefix}>{prefix}</span>{input}</div> : input}
    </Field>
  );
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
};

export function TextAreaField({ label, value, onChange, optional, ...rest }: TextAreaFieldProps) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} optional={optional}>
      <textarea id={id} className={styles.input} value={value} onChange={(e) => onChange(e.target.value)} rows={2} {...rest} />
    </Field>
  );
}

