import fs from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { APP_NAME, THEME_COLOR, THEME_COLOR_DARK, WEB_MANIFEST } from "./src/app/brand.ts";
import { appShell } from "./vite-plugins/appShell.ts";
import { mockSheetApi } from "./vite-plugins/mockSheetApi.ts";
import { serviceWorker } from "./vite-plugins/serviceWorker.ts";

const APP_PORT = 8787;
const MOCK_API_PORT = APP_PORT + 1;
const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const { version } = JSON.parse(fs.readFileSync(fromRoot("./package.json"), "utf8")) as { version: string };

export default defineConfig({
  // GitHub Pages serves the app from /<repo>/; the deploy workflow sets BASE_PATH.
  base: process.env.BASE_PATH ?? "/",
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    ...(process.env.VITEST ? [] : [mockSheetApi({ port: MOCK_API_PORT, codePath: fromRoot("./apps-script/Code.gs") })]),
    appShell({ appName: APP_NAME, description: WEB_MANIFEST.description, themeColor: THEME_COLOR, themeColorDark: THEME_COLOR_DARK, manifest: WEB_MANIFEST }),
    serviceWorker({ templatePath: fromRoot("./vite-plugins/sw-template.js") }),
  ],
  build: {
    rollupOptions: {
      // Optional jsPDF add-ons for HTML/SVG rendering; our reports only draw text and tables.
      external: ["html2canvas", "dompurify", "canvg"],
    },
  },
  server: { port: APP_PORT, strictPort: true },
  preview: { port: APP_PORT, strictPort: true },
});
