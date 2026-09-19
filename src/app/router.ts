/* Tiny hash router: #/customers/abc?tab=items. Hash URLs work on GitHub Pages without
 * server rewrites, and each screen gets its own history entry for the Back button.
 */
import { useMemo, useSyncExternalStore } from "react";
import { afterClosingSheets } from "./sheetHistory";

export interface Route {
  path: string[];
  query: URLSearchParams;
}

const listeners = new Set<() => void>();
window.addEventListener("hashchange", () => listeners.forEach((l) => l()));

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function parseHash(hash: string): Route {
  const [path = "", query = ""] = hash.replace(/^#\/?/, "").split("?");
  return { path: path.split("/").filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(query) };
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  return useMemo(() => parseHash(hash), [hash]);
}

export function href(path: string, query?: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([k, v]) => { if (v) params.set(k, v); });
  const qs = params.toString();
  return `#/${path.replace(/^\//, "")}${qs ? "?" + qs : ""}`;
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  afterClosingSheets(() => {
    if (options.replace) {
      history.replaceState(history.state, "", to);
      listeners.forEach((l) => l());
    } else {
      location.hash = to.replace(/^#/, "");
    }
  });
}

/** Updates query params on the current screen without adding a history entry. */
export function setQuery(route: Route, changes: Record<string, string | null>): void {
  const params = new URLSearchParams(route.query);
  Object.entries(changes).forEach(([k, v]) => (v ? params.set(k, v) : params.delete(k)));
  const qs = params.toString();
  history.replaceState(history.state, "", `#/${route.path.map(encodeURIComponent).join("/")}${qs ? "?" + qs : ""}`);
  listeners.forEach((l) => l());
}
