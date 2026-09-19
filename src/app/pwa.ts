/* Service worker registration (production builds only) and "update available" signalling. */
import { useEffect, useState } from "react";

type ApplyUpdate = () => void;

let pendingUpdate: ApplyUpdate | null = null;
const listeners = new Set<(apply: ApplyUpdate) => void>();

function offerUpdate(worker: ServiceWorker, onApply: () => void): void {
  pendingUpdate = () => {
    onApply();
    worker.postMessage({ type: "SKIP_WAITING" });
  };
  listeners.forEach((l) => l(pendingUpdate!));
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  let reloadOnTakeover = false;
  const markUserRequested = () => { reloadOnTakeover = true; };

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting, markUserRequested);
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(worker, markUserRequested);
        });
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {});
      });
    } catch (err) {
      console.warn("Service worker registration failed", err);
    }
  });

  // Only reload when the user asked for the update — never mid-way through entering an order.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadOnTakeover) window.location.reload();
  });
  navigator.storage?.persist?.().catch(() => {});
}

export function useUpdateAvailable(): ApplyUpdate | null {
  const [apply, setApply] = useState<ApplyUpdate | null>(() => pendingUpdate);
  useEffect(() => {
    const listener = (fn: ApplyUpdate) => setApply(() => fn);
    listeners.add(listener);
    return () => void listeners.delete(listener);
  }, []);
  return apply;
}
