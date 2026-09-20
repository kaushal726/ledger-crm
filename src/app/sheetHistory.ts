/* Makes the phone's Back button close the top-most open sheet instead of leaving the
 * screen (or the app).
 *
 * While any sheet is open there is exactly one extra "guard" history entry at the same
 * URL. Back pops it and closes the top sheet (re-adding the guard if more sheets remain).
 * When the last sheet closes from the UI, we pop the guard ourselves. history.back() is
 * asynchronous, so nothing new is pushed until our own pop has landed.
 */
interface OpenSheet {
  id: number;
  close: () => void;
}

const stack: OpenSheet[] = [];
let guardInHistory = false;
let pendingBacks = 0;
let afterUnwind: (() => void) | null = null;
let nextId = 1;
let urlWhileOpen: string | null = null;
let onUrlRestored: (() => void) | null = null;

/* A screen's filters live in the URL, and a query change made while a sheet is open only
 * rewrites the guard entry. Popping the guard would put the old URL back, so it is
 * re-applied to the entry underneath. */
export function noteUrl(url: string): void {
  if (stack.length) urlWhileOpen = url;
}

export function whenUrlRestored(listener: () => void): void {
  onUrlRestored = listener;
}

function restoreUrl(): void {
  const wanted = urlWhileOpen;
  urlWhileOpen = null;
  if (!wanted || wanted === location.pathname + location.search) return;
  history.replaceState(history.state, "", wanted);
  onUrlRestored?.();
}

function ensureGuard(): void {
  if (stack.length && !guardInHistory && pendingBacks === 0) {
    history.pushState({ ledgerSheetGuard: true }, "");
    guardInHistory = true;
  }
}

function popGuard(): void {
  if (!guardInHistory) return;
  guardInHistory = false;
  pendingBacks += 1;
  history.back();
}

// Reloaded while a sheet was open: step off the stale guard entry so Back behaves normally.
if ((history.state as { ledgerSheetGuard?: boolean } | null)?.ledgerSheetGuard) {
  pendingBacks += 1;
  history.back();
}

window.addEventListener("popstate", () => {
  if (pendingBacks > 0) {
    pendingBacks -= 1;
    if (pendingBacks === 0) {
      restoreUrl();
      if (afterUnwind) {
        const run = afterUnwind;
        afterUnwind = null;
        run();
      }
    }
    ensureGuard();
    return;
  }
  if (!guardInHistory) return; // an ordinary Back between screens
  guardInHistory = false;
  stack.pop()?.close();
  if (!stack.length) restoreUrl();
  ensureGuard();
});

export function isTopSheet(id: number): boolean {
  return stack[stack.length - 1]?.id === id;
}

export function registerSheet(close: () => void): number {
  const id = nextId++;
  stack.push({ id, close });
  ensureGuard();
  return id;
}

/** Called when a sheet unmounts (closed from the UI, or already closed by Back). */
export function unregisterSheet(id: number): void {
  const index = stack.findIndex((s) => s.id === id);
  if (index < 0) return;
  stack.splice(index, 1);
  if (!stack.length) popGuard();
}

/** Closes every open sheet, then runs `fn` once the guard entry is gone. */
export function afterClosingSheets(fn: () => void): void {
  const open = stack.splice(0).reverse();
  open.forEach((s) => s.close());
  popGuard();
  if (pendingBacks > 0) afterUnwind = fn;
  else fn();
}
