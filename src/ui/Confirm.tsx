import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Sheet } from "./Sheet";
import styles from "./overlays.module.css";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  danger?: boolean;
}

type AskConfirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<AskConfirm>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const ask = useCallback<AskConfirm>((options) => new Promise((resolve) => setRequest({ ...options, resolve })), []);

  const finish = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <Sheet
        open={request !== null}
        onClose={() => finish(false)}
        title={request?.title ?? ""}
        footer={
          <>
            <Button block onClick={() => finish(false)}>Cancel</Button>
            <Button block variant={request?.danger ? "dangerSolid" : "primary"} onClick={() => finish(true)}>
              {request?.confirmLabel}
            </Button>
          </>
        }
      >
        {request?.message && <p className={styles.confirmMessage}>{request.message}</p>}
      </Sheet>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): AskConfirm {
  return useContext(ConfirmContext);
}
