/* Emits sw.js at build time with the full list of built files to precache, and a cache
 * version derived from their contents — so every deploy updates installed apps without
 * anyone bumping a version by hand.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

const SW_FILE = "sw.js";

function listFiles(dir: string, prefix = ""): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".")) return [];
    const rel = prefix + entry.name;
    return entry.isDirectory() ? listFiles(path.join(dir, entry.name), rel + "/") : [rel];
  });
}

export function serviceWorker(options: { templatePath: string }): Plugin {
  let config: ResolvedConfig;
  return {
    name: "ledger-service-worker",
    apply: "build",
    enforce: "post",
    configResolved(resolved) {
      config = resolved;
    },
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const hash = createHash("sha256");
        const bundleFiles = Object.values(bundle)
          .filter((item) => !item.fileName.endsWith(".map"))
          .map((item) => {
            hash.update(item.fileName).update(item.type === "chunk" ? item.code : item.source);
            return item.fileName;
          });
        const publicFiles = listFiles(config.publicDir);
        publicFiles.forEach((f) => hash.update(f).update(fs.readFileSync(path.join(config.publicDir, f))));

        const template = fs.readFileSync(options.templatePath, "utf8");
        hash.update(template);
        const files = [...new Set([...bundleFiles, ...publicFiles])].filter((f) => f !== SW_FILE).sort();
        const source = template
          .replace("__CACHE_VERSION__", hash.digest("hex").slice(0, 12))
          .replace("__PRECACHE_LIST__", JSON.stringify(files.map((f) => "./" + f)));
        this.emitFile({ type: "asset", fileName: SW_FILE, source });
      },
    },
  };
}
