import { cx } from "../lib/cx";
import styles from "./avatar.module.css";

export type AvatarTone = "primary" | "due" | "paid" | "accent";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Initials in a softly tinted circle; the tone carries meaning (e.g. due vs settled). */
export function Avatar({ name, tone = "primary" }: { name: string; tone?: AvatarTone }) {
  return <span className={cx(styles.avatar, styles[tone])} aria-hidden>{initials(name)}</span>;
}
