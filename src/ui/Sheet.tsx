/* Responsive dialog: bottom sheet (or full screen for forms) on phones, centered modal
 * on larger screens. Closes on Back, Escape, the close button or a backdrop tap.
 */
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { isTopSheet, registerSheet, unregisterSheet } from "../app/sheetHistory";
import { cx } from "../lib/cx";
import { IconButton } from "./Button";
import styles from "./Sheet.module.css";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  headerAction?: ReactNode;
  /** "full" = full-screen on phones, for longer forms. */
  size?: "auto" | "full";
}

let openCount = 0;

function useScrollLock(): void {
  useEffect(() => {
    openCount += 1;
    document.body.classList.add("sheet-open");
    return () => {
      openCount -= 1;
      if (!openCount) document.body.classList.remove("sheet-open");
    };
  }, []);
}

export function Sheet(props: SheetProps) {
  return props.open ? <SheetPanel {...props} /> : null;
}

function SheetPanel({ onClose, title, subtitle, children, footer, headerAction, size = "auto" }: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const close = () => onCloseRef.current();
  useScrollLock();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const id = registerSheet(() => onCloseRef.current());
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus(); // keep an autoFocus field focused
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopSheet(id)) onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      unregisterSheet(id);
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div className={styles.root}>
      <div className={styles.backdrop} onClick={close} aria-hidden />
      <div ref={panelRef} className={cx(styles.panel, size === "full" && styles.full)} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className={styles.header}>
          <IconButton label="Close" icon={<FiX />} bare onClick={close} />
          <div className={styles.titleWrap}>
            <h2 id={titleId} className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <div className={styles.headerAction}>{headerAction}</div>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
