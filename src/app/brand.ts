/* Product name and web-app manifest — the single place to rename the app.
 * Storage keys, the IndexedDB name and the PIN salt keep their original "ledger" names on
 * purpose: renaming them would orphan data (or the PIN) on devices that already use the app.
 */
export const APP_NAME = "Ledgerly";
export const APP_TAGLINE = "Sales, dues & customer ledger";

export const THEME_COLOR = "#F4F5F7";

export const WEB_MANIFEST = {
  name: `${APP_NAME} — ${APP_TAGLINE}`,
  short_name: APP_NAME,
  description: `${APP_TAGLINE}, synced with Google Sheets. Works offline.`,
  start_url: "./",
  scope: "./",
  display: "standalone",
  orientation: "any",
  background_color: THEME_COLOR,
  theme_color: THEME_COLOR,
  icons: [
    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};
