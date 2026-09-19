import type { CSSProperties, ReactNode } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { cx } from "../lib/cx";
import styles from "./layout.module.css";

interface PageHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  back?: { label: string; href: string };
  actions?: ReactNode;
}

export function PageHeader({ title, eyebrow, back, actions }: PageHeaderProps) {
  return (
    <>
      {back && (
        <a className={styles.back} href={back.href}>
          <FiChevronLeft aria-hidden size={20} />
          {back.label}
        </a>
      )}
      <header className={styles.header}>
        <div className={styles.headerText}>
          {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
          <h1 className={styles.title}>{title}</h1>
        </div>
        {actions && <div className={styles.headerActions}>{actions}</div>}
      </header>
    </>
  );
}

export function Panel({ children, padded, className }: { children: ReactNode; padded?: boolean; className?: string }) {
  return <div className={cx(styles.panel, padded && styles.padded, className)}>{children}</div>;
}

export type StatTone = "primary" | "paid" | "due" | "accent";

export interface Stat {
  label: string;
  value: ReactNode;
  tone?: StatTone;
  sub?: ReactNode;
}

const TONE_CLASS: Record<StatTone, string> = {
  primary: styles.tonePrimary,
  paid: styles.tonePaid,
  due: styles.toneDue,
  accent: styles.toneAccent,
};

export function StatGrid({ stats, columns = 3 }: { stats: Stat[]; columns?: number }) {
  return (
    <div className={styles.stats} style={{ "--cols": columns } as CSSProperties}>
      {stats.map((s) => (
        <div key={s.label} className={cx(styles.stat, s.tone && TONE_CLASS[s.tone])}>
          <div className={styles.statLabel}>{s.label}</div>
          <div className={styles.statValue}>{s.value}</div>
          {s.sub && <div className={styles.statSub}>{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <h2 className={styles.section}>
      <span>{children}</span>
      {right}
    </h2>
  );
}

export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.list, className)}>{children}</div>;
}

interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  leading?: ReactNode;
  /** Shown as-is (e.g. an Avatar), without the icon box used for `leading`. */
  avatar?: ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
}

export function ListRow({ title, subtitle, right, leading, avatar, href, onClick, chevron }: ListRowProps) {
  const content = (
    <>
      {avatar}
      {leading && <span className={styles.rowLeading} aria-hidden>{leading}</span>}
      <span className={styles.rowMain}>
        <span className={styles.rowTitle}>{title}</span>
        {subtitle && <span className={styles.rowSubtitle}>{subtitle}</span>}
      </span>
      {right !== undefined && <span className={styles.rowRight}>{right}</span>}
      {(chevron ?? Boolean(href)) && <FiChevronRight className={styles.chevron} aria-hidden />}
    </>
  );
  if (href) return <a className={styles.row} href={href}>{content}</a>;
  if (onClick) return <button type="button" className={styles.row} onClick={onClick}>{content}</button>;
  return <div className={styles.row}>{content}</div>;
}

export function Fab({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <>
      <div className={cx(styles.fabSpacer, "mobile-only")} aria-hidden />
      <button type="button" className={cx(styles.fab, "mobile-only")} onClick={onClick}>
        {icon}
        {label}
      </button>
    </>
  );
}
