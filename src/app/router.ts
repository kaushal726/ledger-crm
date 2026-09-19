/* Small path router on the History API: /customers/abc?tab=items under the app's base path.
 *
 * Reloading any path works: Vite's dev/preview servers fall back to index.html, GitHub
 * Pages serves 404.html (a copy of index.html, see vite-plugins/appShell.ts), and once
 * installed the service worker answers every navigation with the cached app.
 * Internal <a href> clicks are handled here, so links don't reload the page.
 */
import { useMemo, useSyncExternalStore } from "react";
import { parseLocation, type Route } from "./parseLocation";
import { afterClosingSheets } from "./sheetHistory";

export type { Route };

const BASE = import.meta.env.BASE_URL; // "/" locally, "/<repo>/" on GitHub Pages
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function href(path: string, query?: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([k, v]) => { if (v) params.set(k, v); });
  const qs = params.toString();
  return `${BASE}${path.replace(/^\//, "")}${qs ? "?" + qs : ""}`;
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  afterClosingSheets(() => {
    if (options.replace) history.replaceState(null, "", to);
    else history.pushState(null, "", to);
    notify();
  });
}

/** Updates query params on the current screen without adding a history entry. */
export function setQuery(route: Route, changes: Record<string, string | null>): void {
  const params = new URLSearchParams(route.query);
  Object.entries(changes).forEach(([k, v]) => (v ? params.set(k, v) : params.delete(k)));
  const qs = params.toString();
  history.replaceState(history.state, "", `${location.pathname}${qs ? "?" + qs : ""}`);
  notify();
}

export function useRoute(): Route {
  const key = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => location.pathname + location.search,
  );
  return useMemo(() => {
    const url = new URL(key, location.origin);
    return parseLocation(url.pathname, url.search, BASE);
  }, [key]);
}

/* ---------- global wiring ---------- */

// Links shared before the switch to path URLs (#/customers/abc) keep working.
if (location.hash.startsWith("#/")) history.replaceState(null, "", BASE + location.hash.slice(2));

window.addEventListener("popstate", notify);

document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const anchor = (e.target as Element | null)?.closest?.("a");
  if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin || !url.pathname.startsWith(BASE)) return;
  e.preventDefault();
  navigate(url.pathname + url.search + url.hash);
});
