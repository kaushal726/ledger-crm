import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import styles from "./feedback.module.css";

export type ChipTone = "neutral" | "due" | "paid" | "warn";

export function Chip({ tone = "neutral", children }: { tone?: ChipTone; children: ReactNode }) {
  return <span className={cx(styles.chip, styles[tone])}>{children}</span>;
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon} aria-hidden>{icon}</div>
      <p className={styles.emptyTitle}>{title}</p>
      {message && <p className={styles.emptyText}>{message}</p>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

export function Skeleton({ height, width = "100%", className }: { height: number; width?: number | string; className?: string }) {
  return <div className={cx(styles.skeleton, className)} style={{ height, width }} aria-hidden />;
}
