const API_URL_KEY = "ledger_crm_sheet_api_v1";

const API_URL_PATTERNS = [
  /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/\S*$/, // local mock API (vite-plugins/mockSheetApi.ts)
];

export function isValidApiUrl(url: string): boolean {
  const trimmed = url.trim();
  return API_URL_PATTERNS.some((p) => p.test(trimmed));
}

export function getApiUrl(): string {
  try {
    return localStorage.getItem(API_URL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setApiUrl(url: string | null): void {
  try {
    if (url) localStorage.setItem(API_URL_KEY, url.trim());
    else localStorage.removeItem(API_URL_KEY);
  } catch {
    // Storage blocked (private mode): the connection just won't survive a reload.
  }
}
