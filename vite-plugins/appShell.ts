/* Build-time pieces of the app shell:
 * - fills %APP_NAME% / %APP_DESCRIPTION% / %THEME_COLOR%(_DARK) in index.html from src/app/brand.ts
 * - serves (dev) and emits (build) manifest.webmanifest from the same source
 * - emits 404.html as a copy of index.html, so GitHub Pages serves the app for any path
 *   (a reload on /customers/abc would otherwise hit GitHub's own 404 page)
 */
import type { Plugin, ResolvedConfig } from "vite";

const MANIFEST_FILE = "manifest.webmanifest";
const FALLBACK_FILE = "404.html";

interface AppShellOptions {
  appName: string;
  description: string;
  themeColor: string;
  themeColorDark: string;
  manifest: object;
}

export function appShell(options: AppShellOptions): Plugin {
  let config: ResolvedConfig;
  const manifestJson = JSON.stringify(options.manifest, null, 2);

  return {
    name: "ledger-app-shell",
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml(html) {
      return html
        .replaceAll("%APP_NAME%", options.appName)
        .replaceAll("%APP_DESCRIPTION%", options.description)
        .replaceAll("%THEME_COLOR%", options.themeColor)
        .replaceAll("%THEME_COLOR_DARK%", options.themeColorDark);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== `${config.base}${MANIFEST_FILE}`) return next();
        res.setHeader("Content-Type", "application/manifest+json");
        res.end(manifestJson);
      });
    },
    // "post" so the final index.html is in the bundle; listed before serviceWorker() in
    // vite.config so both files are included in the offline precache.
    enforce: "post",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        this.emitFile({ type: "asset", fileName: MANIFEST_FILE, source: manifestJson });
        const index = bundle["index.html"];
        if (index?.type !== "asset") throw new Error("appShell: index.html missing from the bundle");
        this.emitFile({ type: "asset", fileName: FALLBACK_FILE, source: index.source });
      },
    },
  };
}
