import { useEffect } from "react";

// Back/forward restores the previous scroll position; a fresh navigation starts at the top.
const POP_WINDOW_MS = 150;
let lastPopAt = 0;
window.addEventListener("popstate", () => {
  lastPopAt = Date.now();
});

export function useScrollToTopOnNavigate(pathKey: string): void {
  useEffect(() => {
    if (Date.now() - lastPopAt > POP_WINDOW_MS) window.scrollTo(0, 0);
  }, [pathKey]);
}
