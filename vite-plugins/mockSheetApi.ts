/* Local stand-in for the Google Sheet backend, so the app can be developed and tested
 * without a Google account. Runs the real apps-script/Code.gs against a fake in-memory
 * spreadsheet, on its own port so calls are cross-origin like script.google.com. Like
 * Apps Script it doesn't answer CORS preflights, so a non-"simple" request fails here too.
 *
 *   API:      http://localhost:<port>/exec
 *   Debug:    GET /__sheet dumps the fake sheet
 *             POST /__edit {sheet,row,column,value} simulates a hand edit in the Sheet (runs onEdit)
 */
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import vm from "node:vm";
import type { Plugin } from "vite";
import { FakeSpreadsheet } from "./fakeSpreadsheet.ts";

export interface AppsScript {
  doGet(e: { parameter: Record<string, string> }): { text: string };
  doPost(e: { postData: { contents: string } }): { text: string };
  onEdit(e: { range: unknown }): void;
  formatDateColumns(): number;
}

export function loadAppsScript(codePath: string, spreadsheet: FakeSpreadsheet): AppsScript {
  const context = vm.createContext({
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (text: string) => ({ text, setMimeType() { return this; } }),
    },
    Utilities: { getUuid: () => crypto.randomUUID(), formatDate: (d: Date, tz: string) => d.toLocaleDateString("en-CA", { timeZone: tz }) },
  });
  vm.runInContext(fs.readFileSync(codePath, "utf8"), context, { filename: "Code.gs" });
  return context as unknown as AppsScript;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

function send(res: http.ServerResponse, status: number, text: string): void {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(text);
}

function createServer(codePath: string): http.Server {
  const spreadsheet = new FakeSpreadsheet();
  const script = loadAppsScript(codePath, spreadsheet);

  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname === "/exec" && req.method === "GET") {
      return send(res, 200, script.doGet({ parameter: Object.fromEntries(url.searchParams) }).text);
    }
    if (url.pathname === "/exec" && req.method === "POST") {
      if (!/^text\/plain/.test(req.headers["content-type"] ?? "")) return send(res, 415, '{"ok":false,"error":"Apps Script needs text/plain"}');
      return send(res, 200, script.doPost({ postData: { contents: await readBody(req) } }).text);
    }
    if (url.pathname === "/__sheet") return send(res, 200, JSON.stringify(spreadsheet.dump(), null, 1));
    if (url.pathname === "/__edit" && req.method === "POST") {
      const { sheet, row, column, value } = JSON.parse(await readBody(req));
      const range = spreadsheet.getSheetByName(sheet)!.getRange(row, column);
      range.setValue(value);
      script.onEdit({ range });
      return send(res, 200, '{"ok":true}');
    }
    res.writeHead(405).end();
  });
}

const LISTEN_RETRIES = 40;
const LISTEN_RETRY_MS = 250;

export function mockSheetApi(options: { port: number; codePath: string }): Plugin {
  let server: http.Server | null = null;
  const start = () => {
    if (server) return;
    const instance = createServer(options.codePath);
    server = instance;
    let attempts = 0;
    // When Vite restarts (e.g. after a config change) the old instance may still hold the port for a moment.
    instance.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE" && attempts++ < LISTEN_RETRIES && server === instance) {
        setTimeout(() => instance.listen(options.port), LISTEN_RETRY_MS);
        return;
      }
      console.error("Mock Sheet API failed to start", err);
    });
    instance.listen(options.port, () => console.log(`  Mock Sheet API: http://localhost:${options.port}/exec`));
  };
  const stop = () => {
    server?.close();
    server = null;
  };
  return {
    name: "ledger-mock-sheet-api",
    configureServer(dev) {
      start();
      dev.httpServer?.on("close", stop);
    },
    configurePreviewServer(preview) {
      start();
      preview.httpServer.on("close", stop);
    },
  };
}
