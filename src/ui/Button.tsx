import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dangerSolid";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  block?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = "secondary", size = "md", block, icon, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, variant !== "secondary" && styles[variant], size === "sm" && styles.sm, block && styles.block, className)}
      {...rest}
    >
      {icon && <span className={styles.icon} aria-hidden>{icon}</span>}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  bare?: boolean;
}

export function IconButton({ label, icon, bare, className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={cx(styles.button, styles.iconButton, bare && styles.bare, className)} {...rest}>
      <span className={styles.icon} aria-hidden>{icon}</span>
    </button>
  );
}
