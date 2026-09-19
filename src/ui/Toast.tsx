import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "../lib/cx";
import styles from "./overlays.module.css";

interface ToastOptions {
  tone?: "default" | "error";
  action?: { label: string; onClick: () => void };
}

interface ToastState extends ToastOptions {
  id: number;
  message: string;
}

type ShowToast = (message: string, options?: ToastOptions) => void;

const TOAST_MS = 2600;
const TOAST_WITH_ACTION_MS = 5000;

const ToastContext = createContext<ShowToast>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback<ShowToast>((message, options) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, ...options });
    timer.current = window.setTimeout(() => setToast(null), options?.action ? TOAST_WITH_ACTION_MS : TOAST_MS);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {createPortal(
        <div className={styles.toastRegion} role="status" aria-live="polite">
          {toast && (
            <div key={toast.id} className={cx(styles.toast, toast.tone === "error" && styles.toastError)}>
              <span>{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  className={styles.toastAction}
                  onClick={() => {
                    toast.action?.onClick();
                    setToast(null);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          )}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
