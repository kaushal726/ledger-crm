/* Light or dark, following the phone unless the user picked one.
 *
 * The resolved theme is written to <html data-theme>, so the stylesheet needs a single
 * dark block. index.html sets it before first paint; this module keeps it in step with
 * the phone's setting and with what the user chooses in More.
 */
import { useSyncExternalStore } from "react";
import { THEME_COLOR, THEME_COLOR_DARK } from "./brand";

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_KEY = "ledger_crm_theme";
const CHOICES: ThemeChoice[] = ["system", "light", "dark"];
const DARK_QUERY = "(prefers-color-scheme: dark)";

const listeners = new Set<() => void>();
let choice: ThemeChoice = read();

function read(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_KEY) as ThemeChoice | null;
    return saved && CHOICES.includes(saved) ? saved : "system";
  } catch {
    return "system";
  }
}

function prefersDark(): boolean {
  return typeof matchMedia === "function" && matchMedia(DARK_QUERY).matches;
}

export function resolveTheme(pick: ThemeChoice = choice): "light" | "dark" {
  return pick === "system" ? (prefersDark() ? "dark" : "light") : pick;
}

function apply(): void {
  const resolved = resolveTheme();
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? THEME_COLOR_DARK : THEME_COLOR);
}

export function getThemeChoice(): ThemeChoice {
  return choice;
}

export function setThemeChoice(next: ThemeChoice): void {
  choice = next;
  try {
    if (next === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, next);
  } catch {
    // A phone with storage blocked still gets the theme for this session.
  }
  apply();
  listeners.forEach((l) => l());
}

export function initTheme(): void {
  apply();
  matchMedia?.(DARK_QUERY).addEventListener("change", () => {
    if (choice === "system") apply();
  });
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getThemeChoice,
  );
}
